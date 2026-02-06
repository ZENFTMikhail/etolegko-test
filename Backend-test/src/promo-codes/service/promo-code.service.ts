import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PromoCode,
  PromoCodeDocument,
  PromoCodeStatus,
} from '../schemas/promo-code.schema';

@Injectable()
export class PromoCodesService {
  constructor(
    @InjectModel(PromoCode.name)
    private promoCodeModel: Model<PromoCodeDocument>,
  ) {
    void this.createDefaultPromoCode();
  }

  // Создаем дефолтный промокод
  private async createDefaultPromoCode(): Promise<void> {
    try {
      const existing = await this.promoCodeModel.findOne({
        code: 'SUMMER2024',
      });

      if (!existing) {
        const defaultPromo = new this.promoCodeModel({
          code: 'SUMMER2024',
          discountPercent: 20,
          maxUsage: 100,
          maxUsagePerUser: 10,
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active',
          usedCount: 0,
          totalDiscountGiven: 0,
          usedBy: [],
        });

        await defaultPromo.save();
        console.log('promo code created: SUMMER2024');
      }
    } catch (error) {
      console.error('Error creating default promo code:', error);
    }
  }

  async applyPromoCodeAtomically(
    code: string,
    userId: string,
    orderAmount: number,
  ): Promise<{
    success: boolean;
    discountAmount: number;
    finalAmount: number;
    discountPercent: number;
    message?: string;
    promoCodeId?: Types.ObjectId;
  }> {
    const updatedPromoCode = await this.promoCodeModel.findOneAndUpdate(
      {
        code: code.toUpperCase(),
        status: 'active',
        $expr: { $lt: ['$usedCount', '$maxUsage'] },
      },
      {
        $inc: { usedCount: 1 },
        $addToSet: { usedBy: new Types.ObjectId(userId) },
      },
      { new: true, runValidators: true },
    );

    if (!updatedPromoCode) {
      return {
        success: false,
        discountAmount: 0,
        finalAmount: orderAmount,
        discountPercent: 0,
        message: 'Promo code not available or limit reached',
      };
    }

    // Обновляем totalDiscountGiven отдельно
    const discountAmount =
      (orderAmount * updatedPromoCode.discountPercent) / 100;

    await this.promoCodeModel.findByIdAndUpdate(updatedPromoCode._id, {
      $inc: { totalDiscountGiven: discountAmount },
    });

    const finalAmount = orderAmount - discountAmount;

    return {
      success: true,
      discountAmount,
      finalAmount,
      discountPercent: updatedPromoCode.discountPercent,
      promoCodeId: updatedPromoCode._id,
    };
  }
  // Получить промокод по коду
  async getPromoCode(code: string): Promise<PromoCodeDocument> {
    const promoCode = await this.promoCodeModel.findOne({
      code: code.toUpperCase(),
    });

    if (!promoCode) {
      throw new BadRequestException(`Promo code ${code} not found`);
    }

    return promoCode;
  }

  // Валидировать промокод
  async validatePromoCode(
    code: string,
    userId: string,
  ): Promise<{
    isValid: boolean;
    discountPercent: number;
    message?: string;
  }> {
    try {
      const promoCode = await this.getPromoCode(code);

      // Проверка статуса
      if (promoCode.status !== PromoCodeStatus.ACTIVE) {
        return {
          isValid: false,
          discountPercent: 0,
          message: `Promo code is ${promoCode.status}`,
        };
      }

      // Проверка даты начала
      if (promoCode.validFrom && new Date() < promoCode.validFrom) {
        return {
          isValid: false,
          discountPercent: 0,
          message: 'Promo code is not yet valid',
        };
      }

      // Проверка даты окончания
      if (promoCode.validUntil && new Date() > promoCode.validUntil) {
        await this.markAsExpired(promoCode._id.toString());
        return {
          isValid: false,
          discountPercent: 0,
          message: 'Promo code has expired',
        };
      }

      // Проверка общего лимита
      if (promoCode.usedCount >= promoCode.maxUsage) {
        return {
          isValid: false,
          discountPercent: 0,
          message: 'Promo code usage limit reached',
        };
      }

      // Проверка лимита на пользователя
      const userIdString = userId.toString();
      const userUsage = promoCode.usedBy.filter(
        (id) => id.toString() === userIdString,
      ).length;
      if (userUsage >= promoCode.maxUsagePerUser) {
        return {
          isValid: false,
          discountPercent: 0,
          message: 'You have reached your usage limit for this promo code',
        };
      }

      // Все проверки пройдены
      return {
        isValid: true,
        discountPercent: promoCode.discountPercent,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        isValid: false,
        discountPercent: 0,
        message: errorMessage,
      };
    }
  }

  // Применить промокод
  async applyPromoCode(
    code: string,
    userId: string,
    orderAmount: number,
  ): Promise<{
    success: boolean;
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
    discountPercent: number;
    message?: string;
  }> {
    const validation = await this.validatePromoCode(code, userId);

    if (!validation.isValid) {
      return {
        success: false,
        originalAmount: orderAmount,
        discountAmount: 0,
        finalAmount: orderAmount,
        discountPercent: 0,
        message: validation.message,
      };
    }

    // Расчет скидки
    const discountAmount = (orderAmount * validation.discountPercent) / 100;
    const finalAmount = orderAmount - discountAmount;

    return {
      success: true,
      originalAmount: orderAmount,
      discountAmount,
      finalAmount,
      discountPercent: validation.discountPercent,
    };
  }

  // Пометить как просроченный
  private async markAsExpired(promoCodeId: string): Promise<void> {
    await this.promoCodeModel.findByIdAndUpdate(promoCodeId, {
      status: 'expired',
    });
  }

  // Получить все промокоды (для админа)
  async getAllPromoCodes(): Promise<PromoCodeDocument[]> {
    return this.promoCodeModel.find().sort({ createdAt: -1 });
  }

  // Получить статистику по промокоду
  async getPromoCodeStats(code: string): Promise<{
    code: string;
    discountPercent: number;
    usedCount: number;
    totalDiscountGiven: number;
    uniqueUsers: number;
    usageLimit: number;
    remainingUses: number;
  }> {
    const promoCode = await this.getPromoCode(code);

    return {
      code: promoCode.code,
      discountPercent: promoCode.discountPercent,
      usedCount: promoCode.usedCount,
      totalDiscountGiven: promoCode.totalDiscountGiven,
      uniqueUsers: promoCode.usedBy.length,
      usageLimit: promoCode.maxUsage,
      remainingUses: promoCode.maxUsage - promoCode.usedCount,
    };
  }
}
