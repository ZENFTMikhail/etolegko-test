import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ClickHouseService } from 'src/clickhouse/service/clickhouse.service';
import { PromoUsage, PromoUsageDocument } from '../schemas/promo-usage.schema';
import { PromoCodesService } from 'src/promo-codes/service/promo-code.service';

@Injectable()
export class PromoCodeUsageService {
  constructor(
    @InjectModel(PromoUsage.name)
    private promoCodeUsageModel: Model<PromoUsageDocument>,
    private readonly clickHouseService: ClickHouseService,
    private readonly promoCodesService: PromoCodesService,
  ) {}

  async recordUsage(
    promoCodeId: Types.ObjectId,
    promoCode: string,
    userId: Types.ObjectId,
    orderId: Types.ObjectId,
    orderAmount: number,
    discountAmount: number,
    finalAmount: number,
    discountPercent: number,
  ): Promise<PromoUsageDocument> {
    const existingUsage = await this.promoCodeUsageModel.findOne({ orderId });

    if (existingUsage) {
      return existingUsage;
    }
    // 1. Сохраняем в MongoDB (источник истины)
    const usage = new this.promoCodeUsageModel({
      promoCodeId,
      promoCode,
      userId,
      orderId,
      orderAmount,
      discountAmount,
      finalAmount,
      discountPercent,
      usedAt: new Date(),
    });

    const savedUsage = await usage.save();

    // 2. Синхронизируем в ClickHouse (для аналитики)
    await this.syncToClickHouse(savedUsage);

    return savedUsage;
  }

  async applyPromoCodeWithLock(
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
    const userIdObj = new Types.ObjectId(userId);
    const codeUpper = code.toUpperCase();

    // 1. Получаем промокод
    const promoCode = await this.promoCodesService.getPromoCode(codeUpper);

    // 2. Проверяем лимит пользователя ДО применения
    const userUsageCount = await this.promoCodeUsageModel.countDocuments({
      promoCodeId: promoCode._id,
      userId: userIdObj,
    });

    if (userUsageCount >= promoCode.maxUsagePerUser) {
      return {
        success: false,
        discountAmount: 0,
        finalAmount: orderAmount,
        discountPercent: 0,
        message: 'You have reached your usage limit for this promo code',
      };
    }

    // 3. Атомарное применение промокода (увеличиваем счетчик)
    // Нужно добавить метод в PromoCodesService:
    const applyResult = await this.promoCodesService.applyPromoCodeAtomically(
      code,
      userId,
      orderAmount,
    );

    if (!applyResult.success) {
      return applyResult;
    }

    return {
      ...applyResult,
      promoCodeId: promoCode._id,
    };
  }

  // Синхронизация в ClickHouse
  private async syncToClickHouse(usage: PromoUsageDocument): Promise<void> {
    try {
      await this.clickHouseService.insertPromoCodeUsage({
        usage_id: usage._id.toString(),
        user_id: usage.userId.toString(),
        promo_code: usage.promoCode,
        order_id: usage.orderId.toString(),
        order_amount: usage.orderAmount,
        discount_amount: usage.discountAmount,
        final_amount: usage.finalAmount,
        usage_date: usage.usedAt,
      });
    } catch (error) {
      console.error('Failed to sync promo code usage to ClickHouse:', error);
    }
  }

  // Получить историю использования промокода
  async getPromoCodeHistory(
    promoCode: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    history: PromoUsageDocument[];
    total: number;
    page: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      this.promoCodeUsageModel
        .find({ promoCode: promoCode.toUpperCase() })
        .sort({ usedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'email name')
        .populate('orderId', 'createdAt')
        .exec(),
      this.promoCodeUsageModel.countDocuments({
        promoCode: promoCode.toUpperCase(),
      }),
    ]);

    return {
      history,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // Получить историю использования пользователем
  async getUserPromoCodeHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    history: PromoUsageDocument[];
    total: number;
    page: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      this.promoCodeUsageModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ usedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('promoCodeId', 'code discountPercent')
        .exec(),
      this.promoCodeUsageModel.countDocuments({
        userId: new Types.ObjectId(userId),
      }),
    ]);

    return {
      history,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // Проверить, использовал ли пользователь промокод для заказа
  async checkIfPromoCodeUsedForOrder(
    orderId: string,
    promoCode?: string,
  ): Promise<boolean> {
    const query: {
      orderId: Types.ObjectId;
      promoCode?: string;
    } = { orderId: new Types.ObjectId(orderId) };

    if (promoCode) {
      query.promoCode = promoCode.toUpperCase();
    }

    const count = await this.promoCodeUsageModel.countDocuments(query);
    return count > 0;
  }
}
