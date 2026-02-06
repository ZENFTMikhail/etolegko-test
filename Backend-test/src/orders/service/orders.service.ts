import {
  Injectable,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { Order, OrderDocument } from '../schemas/order.schema';
import { ClickHouseService } from '../../clickhouse/service/clickhouse.service';
import { PromoCodeUsageService } from '../../promo-usage/service/promo-code-usage.service';
import { UsersService } from '../../users/service/users.service';
import { PromoCodesService } from 'src/promo-codes/service/promo-code.service';

interface OrderJobData {
  userId: string;
  amount: number;
  promoCode?: string;
  requestId: string;
}

interface JobStatus {
  status: string;
  result?: unknown;
  error?: string;
  progress?: number;
}

@Processor('orders')
@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    @InjectQueue('orders') private readonly ordersQueue: Queue,
    private readonly promoCodesService: PromoCodesService,
    private readonly promoCodeUsageService: PromoCodeUsageService,
    private readonly usersService: UsersService,
    private readonly clickHouseService: ClickHouseService,
  ) {}

  async onModuleInit() {
    // Очищаем старые задания при старте
    await this.ordersQueue.clean(0, 'delayed');
    await this.ordersQueue.clean(0, 'wait');
    await this.ordersQueue.clean(0, 'active');
    this.logger.log('✅ Orders queue initialized');
  }

  // Публичный метод для создания заказа (добавляет в очередь)
  async createOrder(
    userId: string,
    amount: number,
    promoCode?: string,
  ): Promise<{ jobId: string; status: string }> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const requestId = `order_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const job = await this.ordersQueue.add(
      'process-order',
      {
        userId,
        amount,
        promoCode,
        requestId,
      },
      {
        jobId: requestId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`📥 Order queued: ${requestId} for user ${userId}`);

    return {
      jobId: job.id.toString(),
      status: 'queued',
    };
  }

  // Обработчик очереди - ОСНОВНАЯ ЛОГИКА
  @Process('process-order')
  async processOrderJob(job: Job<OrderJobData>): Promise<OrderDocument> {
    const { userId, amount, promoCode, requestId } = job.data;

    this.logger.log(`🎬 Processing order: ${requestId} for user ${userId}`);

    try {
      let discountAmount = 0;
      let promoCodeId: Types.ObjectId | null = null;
      let promoCodeUsed: string | null = null;
      let discountPercent = 0;

      if (promoCode) {
        // MongoDB сама обеспечивает атомарность через findOneAndUpdate
        const promoResult =
          await this.promoCodeUsageService.applyPromoCodeWithLock(
            promoCode,
            userId,
            amount,
          );

        if (!promoResult.success) {
          throw new BadRequestException(promoResult.message);
        }

        // Получаем информацию о промокоде
        const promoCodeInfo =
          await this.promoCodesService.getPromoCode(promoCode);

        discountAmount = promoResult.discountAmount;
        promoCodeId = promoCodeInfo?._id || null;
        promoCodeUsed = promoCode;
        discountPercent = promoCodeInfo?.discountPercent || 0;
      }

      // 2. Создаем заказ в MongoDB
      const order = new this.orderModel({
        userId: new Types.ObjectId(userId),
        amount,
        discountAmount,
        finalAmount: amount - discountAmount,
        status: 'completed',
        promoCodeId,
        promoCode: promoCodeUsed,
      });

      const savedOrder = await order.save();

      // 3. Записываем использование промокода
      if (promoCode && promoCodeId) {
        await this.promoCodeUsageService.recordUsage(
          promoCodeId,
          promoCode,
          new Types.ObjectId(userId),
          savedOrder._id,
          amount,
          discountAmount,
          savedOrder.finalAmount,
          discountPercent,
        );
      }

      // 4. Синхронизируем в ClickHouse (БЕЗ падения основного потока)
      await this.syncToClickHouse(
        savedOrder,
        userId,
        amount,
        discountAmount,
        promoCodeUsed || undefined,
        discountPercent,
      );

      this.logger.log(`✅ Order processed: ${requestId}`);
      return savedOrder;
    } catch (error) {
      this.logger.error(`❌ Order failed: ${requestId}`, error);
      throw error;
    }
  }

  // Метод для получения статуса задания
  async getOrderStatus(jobId: string): Promise<JobStatus> {
    const job = await this.ordersQueue.getJob(jobId);

    if (!job) {
      throw new BadRequestException(`Job ${jobId} not found`);
    }

    const state = await job.getState();

    return {
      status: state,
      result: job.returnvalue as unknown,
      error: job.failedReason,
      progress: job.progress() as number,
    };
  }

  // Метод для прямого создания заказа (без очереди)
  async createOrderDirect(
    userId: string,
    amount: number,
    promoCode?: string,
  ): Promise<OrderDocument> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const requestId = `direct_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    this.logger.log(`🎬 Direct order: ${requestId} for user ${userId}`);

    // Просто дублируем логику, но без Bull
    let discountAmount = 0;
    let promoCodeId: Types.ObjectId | null = null;
    let promoCodeUsed: string | null = null;
    let discountPercent = 0;

    if (promoCode) {
      const promoResult =
        await this.promoCodeUsageService.applyPromoCodeWithLock(
          promoCode,
          userId,
          amount,
        );

      if (!promoResult.success) {
        throw new BadRequestException(promoResult.message);
      }

      const promoCodeInfo =
        await this.promoCodesService.getPromoCode(promoCode);

      discountAmount = promoResult.discountAmount;
      promoCodeId = promoCodeInfo?._id || null;
      promoCodeUsed = promoCode;
      discountPercent = promoCodeInfo?.discountPercent || 0;
    }

    const order = new this.orderModel({
      userId: new Types.ObjectId(userId),
      amount,
      discountAmount,
      finalAmount: amount - discountAmount,
      status: 'completed',
      promoCodeId,
      promoCode: promoCodeUsed,
    });

    const savedOrder = await order.save();

    if (promoCode && promoCodeId) {
      await this.promoCodeUsageService.recordUsage(
        promoCodeId,
        promoCode,
        new Types.ObjectId(userId),
        savedOrder._id,
        amount,
        discountAmount,
        savedOrder.finalAmount,
        discountPercent,
      );
    }

    await this.syncToClickHouse(
      savedOrder,
      userId,
      amount,
      discountAmount,
      promoCodeUsed || undefined,
      discountPercent,
    );

    return savedOrder;
  }

  // УПРОЩЕННАЯ синхронизация с ClickHouse
  private async syncToClickHouse(
    order: OrderDocument,
    userId: string,
    orderAmount: number,
    discountAmount: number,
    promoCode?: string,
    discountPercent?: number,
  ): Promise<void> {
    try {
      const user = await this.usersService.findById(userId);

      if (!user) {
        this.logger.warn(`User ${userId} not found for ClickHouse sync`);
        return;
      }

      // Проверяем сигнатуру метода updateStatsAfterOrder
      // Убираем лишние параметры
      await this.clickHouseService.updateStatsAfterOrder(
        order._id.toString(),
        userId,
        user.email,
        user.name,
        orderAmount,
        discountAmount,
        order.finalAmount,
        promoCode,
        discountPercent || 0,
      );
    } catch (error) {
      console.log(error);
      setTimeout(() => {
        this.retryClickHouseSync({
          orderId: order._id.toString(),
          userId,
          orderAmount,
          discountAmount,
          promoCode,
          discountPercent,
        }).catch((err) => {
          this.logger.error(`Retry also failed:`, err);
        });
      }, 5000);
    }
  }

  // Простая функция повторной попытки
  private async retryClickHouseSync(data: {
    orderId: string;
    userId: string;
    orderAmount: number;
    discountAmount: number;
    promoCode?: string;
    discountPercent?: number;
  }): Promise<void> {
    try {
      const user = await this.usersService.findById(data.userId);
      if (!user) return;

      await this.clickHouseService.updateStatsAfterOrder(
        data.orderId,
        data.userId,
        user.email,
        user.name,
        data.orderAmount,
        data.discountAmount,
        data.orderAmount - data.discountAmount,
        data.promoCode,
        data.discountPercent || 0,
      );

      this.logger.log(`✅ ClickHouse retry successful: ${data.orderId}`);
    } catch (error) {
      console.log(error);
    }
  }

  // Создание тестовых заказов
  async createTestOrders(userId: string, count: number = 5): Promise<void> {
    const testAmounts = [
      1000, 2500, 500, 3000, 1500, 800, 2200, 1700, 900, 1200,
    ];
    const testPromoCodes = ['SUMMER2024', '', 'SUMMER2024', '', ''];

    let createdCount = 0;
    const skippedCount = 0;

    for (let i = 0; i < count; i++) {
      const amount =
        testAmounts[Math.floor(Math.random() * testAmounts.length)];
      const promoCode =
        testPromoCodes[Math.floor(Math.random() * testPromoCodes.length)];
      const codeToUse = promoCode === '' ? undefined : promoCode;

      try {
        await this.createOrder(userId, amount, codeToUse);
        createdCount++;
      } catch (error) {
        console.log(error);
      }

      // Небольшая задержка, чтобы были разные даты
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.logger.log(
      `✅ Created ${createdCount} test orders for user ${userId} (skipped ${skippedCount} duplicates)`,
    );
  }

  // Получить заказы пользователя
  async getUserOrders(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    orders: OrderDocument[];
    total: number;
    page: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.orderModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('promoCodeId', 'code discountPercent')
        .exec(),
      this.orderModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    return {
      orders,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getUserStats(userId: string): Promise<{
    totalOrders: number;
    totalAmount: number;
    totalDiscount: number;
    avgOrderAmount: number;
    promoCodeUsage: number;
  }> {
    const stats = await this.orderModel.aggregate<{
      totalOrders: number;
      totalAmount: number;
      totalDiscount: number;
      totalFinalAmount: number;
      promoCodeUsage: number;
    }>([
      {
        $match: {
          userId: new Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalDiscount: { $sum: '$discountAmount' },
          totalFinalAmount: { $sum: '$finalAmount' },
          promoCodeUsage: {
            $sum: {
              $cond: [{ $ne: ['$promoCodeId', null] }, 1, 0],
            },
          },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        totalOrders: 0,
        totalAmount: 0,
        totalDiscount: 0,
        avgOrderAmount: 0,
        promoCodeUsage: 0,
      };
    }

    const stat = stats[0];

    return {
      totalOrders: stat.totalOrders,
      totalAmount: stat.totalAmount,
      totalDiscount: stat.totalDiscount,
      avgOrderAmount:
        stat.totalOrders > 0
          ? Math.round(stat.totalFinalAmount / stat.totalOrders)
          : 0,
      promoCodeUsage: stat.promoCodeUsage,
    };
  }

  // Получить все заказы
  async getAllOrders(
    page: number = 1,
    limit: number = 20,
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    orders: OrderDocument[];
    total: number;
    page: number;
    pages: number;
  }> {
    const query: Record<string, any> = {};

    if (userId) {
      query.userId = new Types.ObjectId(userId);
    }

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};

      if (startDate) {
        dateFilter.$gte = startDate;
      }

      if (endDate) {
        dateFilter.$lte = endDate;
      }

      query.createdAt = dateFilter;
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'email name')
        .populate('promoCodeId', 'code discountPercent')
        .exec(),
      this.orderModel.countDocuments(query),
    ]);

    return {
      orders,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // Вспомогательный метод для получения заказа по ID
  async getOrderById(orderId: string): Promise<OrderDocument | null> {
    if (!Types.ObjectId.isValid(orderId)) {
      return null;
    }
    return this.orderModel.findById(orderId).exec();
  }
}
