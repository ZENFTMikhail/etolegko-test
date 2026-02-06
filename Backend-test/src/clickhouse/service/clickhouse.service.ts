// clickhouse/service/clickhouse.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, ClickHouseClient } from '@clickhouse/client';

// Интерфейсы для типизации
interface UserStatsData {
  user_id: string;
  email: string;
  name: string;
  total_orders: number;
  total_amount: number;
  total_discount: number;
  avg_order_amount: number;
  promo_codes_used: number;
  first_order_date: string;
  last_order_date: string;
}

interface PromoCodeStatsData {
  promo_code: string;
  discount_percent: number;
  total_uses: number;
  total_discount_given: number;
  total_revenue: number;
  unique_users: number;
  avg_discount_per_order: number;
  first_use_date: string;
  last_use_date: string;
}

interface PromoCodeUsageData {
  usage_id: string;
  user_id: string;
  promo_code: string;
  order_id: string;
  order_amount: number;
  discount_amount: number;
  final_amount: number;
  usage_date: Date;
}

interface OrderAnalyticsData {
  order_id: string;
  user_id: string;
  order_date: string; // YYYY-MM-DD
  hour: number;
  day_of_week: number;
  month: number;
  order_amount: number;
  discount_amount: number;
  final_amount: number;
  has_promo_code: number; // 0 или 1
  promo_code: string;
}

@Injectable()
export class ClickHouseService {
  private readonly logger = new Logger(ClickHouseService.name);
  private client: ClickHouseClient | null = null;

  constructor(private configService: ConfigService) {
    void this.initialize();
  }

  private async initialize() {
    try {
      const host = this.configService.get<string>('CLICKHOUSE_HOST');
      const username = this.configService.get<string>('CLICKHOUSE_USER');
      const password = this.configService.get<string>('CLICKHOUSE_PASSWORD');

      if (!host) {
        this.logger.warn(
          'ClickHouse host not configured, skipping initialization',
        );
        return;
      }

      this.client = createClient({
        url: host,
        username,
        password,
      });

      // Тестируем подключение
      await this.client.ping();
      this.logger.log('✅ ClickHouse connected');

      // Создаем таблицы если их нет
      await this.createTables();
    } catch (error) {
      this.logger.error('❌ ClickHouse connection failed:', error);
      this.client = null;
    }
  }

  async createTables(): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.exec({
        query: `CREATE DATABASE IF NOT EXISTS analytics`,
      });

      this.logger.log('✅ ClickHouse database verified');

      await this.client.exec({
        query: `
      CREATE TABLE IF NOT EXISTS analytics.user_stats (
          user_id String,
          email String,
          name String,
          total_orders UInt32,
          total_amount Decimal(10, 2),
          total_discount Decimal(10, 2),
          avg_order_amount Decimal(10, 2),
          promo_codes_used UInt32,
          first_order_date DateTime,
          last_order_date DateTime,
          updated_at DateTime DEFAULT now()
      ) ENGINE = MergeTree()
      ORDER BY user_id;
      `,
      });

      await this.client.exec({
        query: `
      CREATE TABLE IF NOT EXISTS analytics.promo_code_stats (
          promo_code String,
          discount_percent UInt8,
          total_uses UInt32,
          total_discount_given Decimal(10, 2),
          total_revenue Decimal(10, 2),
          unique_users UInt32,
          avg_discount_per_order Decimal(10, 2),
          first_use_date DateTime,
          last_use_date DateTime,
          updated_at DateTime DEFAULT now()
      ) ENGINE = MergeTree()
      ORDER BY promo_code;
      `,
      });

      await this.client.exec({
        query: `
      CREATE TABLE IF NOT EXISTS analytics.promo_code_usage_history (
          usage_id String,
          user_id String,
          promo_code String,
          order_id String,
          order_amount Decimal(10, 2),
          discount_amount Decimal(10, 2),
          final_amount Decimal(10, 2),
          usage_date DateTime,
          created_at DateTime DEFAULT now()
      ) ENGINE = MergeTree()
      ORDER BY (usage_date, promo_code);
      `,
      });

      await this.client.exec({
        query: `
      CREATE TABLE IF NOT EXISTS analytics.order_analytics (
          order_id String,
          user_id String,
          order_date Date,
          hour UInt8,
          day_of_week UInt8,
          month UInt8,
          order_amount Decimal(10, 2),
          discount_amount Decimal(10, 2),
          final_amount Decimal(10, 2),
          has_promo_code UInt8,
          promo_code String,
          created_at DateTime DEFAULT now()
      ) ENGINE = MergeTree()
      ORDER BY (order_date, user_id);
      `,
      });

      this.logger.log('✅ ClickHouse tables created/verified');
    } catch (error) {
      this.logger.error('❌ Failed to create ClickHouse tables:', error);
    }
  }

  // Методы для вставки данных
  async insertUserStats(data: UserStatsData): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.insert({
        table: 'analytics.user_stats',
        values: [data],
        format: 'JSONEachRow',
      });
    } catch (error) {
      this.logger.error('Failed to insert user stats:', error);
    }
  }

  async insertPromoCodeStats(data: PromoCodeStatsData): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.insert({
        table: 'analytics.promo_code_stats',
        values: [data],
        format: 'JSONEachRow',
      });
    } catch (error) {
      this.logger.error('Failed to insert promo code stats:', error);
    }
  }

  async insertPromoCodeUsage(data: PromoCodeUsageData): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.insert({
        table: 'analytics.promo_code_usage_history',
        values: [
          {
            usage_id: data.usage_id,
            user_id: data.user_id,
            promo_code: data.promo_code,
            order_id: data.order_id,
            order_amount: data.order_amount,
            discount_amount: data.discount_amount,
            final_amount: data.final_amount,
            usage_date: data.usage_date
              .toISOString()
              .replace('T', ' ')
              .substring(0, 19),
          },
        ],
        format: 'JSONEachRow',
      });
    } catch (error) {
      this.logger.error('Failed to insert promo code usage:', error);
    }
  }

  async insertOrderAnalytics(data: OrderAnalyticsData): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.insert({
        table: 'analytics.order_analytics',
        values: [data],
        format: 'JSONEachRow',
      });
    } catch (error) {
      this.logger.error('Failed to insert order analytics:', error);
    }
  }

  // Методы для запросов (аналитика)
  async query<T = any>(sql: string): Promise<T[]> {
    if (!this.client) {
      this.logger.warn('ClickHouse not available, returning empty array');
      return [];
    }

    try {
      const result = await this.client.query({
        query: sql,
        format: 'JSONEachRow',
      });
      return await result.json();
    } catch (error) {
      this.logger.error('ClickHouse query failed:', error);
      return [];
    }
  }

  async getPromoCodeAnalytics(
    promoCode?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any[]> {
    const whereClauses: string[] = [];

    if (promoCode) {
      whereClauses.push(`promo_code = '${promoCode}'`);
    }

    if (startDate && endDate) {
      whereClauses.push(
        `usage_date >= '${startDate}' AND usage_date <= '${endDate}'`,
      );
    }

    const whereClause =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
    SELECT 
      promo_code,
      COUNT(*) as total_uses,
      SUM(discount_amount) as total_discount_given,
      SUM(final_amount) as total_revenue,
      COUNT(DISTINCT user_id) as unique_users,
      AVG(discount_amount) as avg_discount_per_order,
      groupArray(DISTINCT user_id) as user_ids
    FROM analytics.promo_code_usage_history
    ${whereClause}
    GROUP BY promo_code
    ORDER BY total_uses DESC
  `;

    return this.query(sql);
  }

  async getUserAnalytics(userId?: string): Promise<any[]> {
    let whereClause = '';
    if (userId) {
      whereClause = `WHERE user_id = '${userId}'`;
    }

    const sql = `
      SELECT 
        user_id,
        email,
        name,
        total_orders,
        total_amount,
        total_discount,
        avg_order_amount,
        promo_codes_used
      FROM analytics.user_stats
      ${whereClause}
      ORDER BY total_amount DESC
    `;

    return this.query(sql);
  }

  async getUsersTable(
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'total_amount',
    sortOrder: 'asc' | 'desc' = 'desc',
    search?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const whereClauses: string[] = [];

    if (startDate) {
      whereClauses.push(`last_order_date >= '${startDate}'`);
    }

    if (endDate) {
      whereClauses.push(`last_order_date <= '${endDate}'`);
    }

    if (search) {
      whereClauses.push(
        `(email LIKE '%${search}%' OR name LIKE '%${search}%')`,
      );
    }

    const whereClause =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const validSortFields = [
      'user_id',
      'email',
      'name',
      'total_orders',
      'total_amount',
      'total_discount',
      'avg_order_amount',
      'promo_codes_used',
      'first_order_date',
      'last_order_date',
    ];

    const safeSortBy = validSortFields.includes(sortBy)
      ? sortBy
      : 'total_amount';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countSql = `
    SELECT COUNT(*) as total
    FROM analytics.user_stats
    ${whereClause}
  `;

    const dataSql = `
    SELECT 
      user_id,
      email,
      name,
      total_orders,
      total_amount,
      total_discount,
      avg_order_amount,
      promo_codes_used,
      first_order_date,
      last_order_date
    FROM analytics.user_stats
    ${whereClause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ${limit} OFFSET ${(page - 1) * limit}
  `;

    // Выполняем оба запроса параллельно
    const [countResult, data] = await Promise.all([
      this.query<{ total: number }>(countSql),
      this.query<any>(dataSql),
    ]);

    const total = countResult[0]?.total || 0;

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async updateStatsAfterOrder(
    orderId: string,
    userId: string,
    userEmail: string,
    userName: string,
    orderAmount: number,
    discountAmount: number,
    finalAmount: number,
    promoCode?: string,
    discountPercent: number = 0,
  ): Promise<void> {
    const orderDate = new Date();
    const formattedDate = this.formatDateForClickHouse(orderDate);

    // 1. Вставляем использование промокода
    if (promoCode) {
      await this.insertPromoCodeUsage({
        usage_id: `${orderId}_${Date.now()}`,
        user_id: userId,
        promo_code: promoCode,
        order_id: orderId,
        order_amount: orderAmount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        usage_date: orderDate,
      });
    }

    // 2. Вставляем аналитику заказа
    await this.insertOrderAnalytics({
      order_id: orderId,
      user_id: userId,
      order_date: orderDate.toISOString().split('T')[0],
      hour: orderDate.getHours(),
      day_of_week: orderDate.getDay(),
      month: orderDate.getMonth() + 1,
      order_amount: orderAmount,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      has_promo_code: promoCode ? 1 : 0,
      promo_code: promoCode || '',
    });

    // 3. Обновляем статистику пользователя
    await this.updateUserStats({
      user_id: userId,
      email: userEmail,
      name: userName,
      total_orders: 1,
      total_amount: orderAmount,
      total_discount: discountAmount,
      promo_codes_used: promoCode ? 1 : 0,
      first_order_date: formattedDate,
      last_order_date: formattedDate,
      avg_order_amount: orderAmount,
    });

    // 4. Обновляем статистику промокода
    if (promoCode) {
      await this.updatePromoCodeStats({
        promo_code: promoCode,
        discount_percent: discountPercent,
        total_uses: 1,
        total_discount_given: discountAmount,
        total_revenue: finalAmount,
        unique_users: 1,
        first_use_date: formattedDate,
        last_use_date: formattedDate,
        avg_discount_per_order: discountAmount,
      });
    }
  }

  // Upsert для user_stats
  private async updateUserStats(data: UserStatsData): Promise<void> {
    if (!this.client) return;

    try {
      // 1. Получаем текущую статистику пользователя
      const currentStats = await this.query<UserStatsData>(`
      SELECT * FROM analytics.user_stats 
      WHERE user_id = '${data.user_id}'
    `);

      if (currentStats.length > 0) {
        const current = currentStats[0];

        // 2. Суммируем с новыми данными
        const totalOrders = current.total_orders + data.total_orders;
        const totalAmount = current.total_amount + data.total_amount;
        const totalDiscount = current.total_discount + data.total_discount;
        const promoCodesUsed = current.promo_codes_used + data.promo_codes_used;

        // 3. Обновляем с удалением старой записи
        await this.client.exec({
          query: `ALTER TABLE analytics.user_stats DELETE WHERE user_id = '${data.user_id}'`,
        });

        await this.insertUserStats({
          user_id: data.user_id,
          email: data.email,
          name: data.name,
          total_orders: totalOrders,
          total_amount: totalAmount,
          total_discount: totalDiscount,
          avg_order_amount: totalAmount / totalOrders,
          promo_codes_used: promoCodesUsed,
          first_order_date: current.first_order_date,
          last_order_date: data.last_order_date,
        });
      } else {
        // Первый заказ пользователя
        await this.insertUserStats({
          ...data,
          avg_order_amount: data.total_amount,
        });
      }
    } catch (error) {
      this.logger.error('Failed to update user stats:', error);
    }
  }

  // Upsert для promo_code_stats
  private async updatePromoCodeStats(data: PromoCodeStatsData): Promise<void> {
    if (!this.client) return;

    try {
      // Получаем текущую статистику промокода
      const currentStats = await this.query<PromoCodeStatsData>(`
      SELECT * FROM analytics.promo_code_stats 
      WHERE promo_code = '${data.promo_code}'
    `);

      if (currentStats.length > 0) {
        const current = currentStats[0];

        // Суммируем
        const totalUses = current.total_uses + data.total_uses;
        const totalDiscountGiven =
          current.total_discount_given + data.total_discount_given;
        const totalRevenue = current.total_revenue + data.total_revenue;
        const uniqueUsers = current.unique_users + data.unique_users;

        await this.client.exec({
          query: `ALTER TABLE analytics.promo_code_stats DELETE WHERE promo_code = '${data.promo_code}'`,
        });

        await this.insertPromoCodeStats({
          promo_code: data.promo_code,
          discount_percent: data.discount_percent,
          total_uses: totalUses,
          total_discount_given: totalDiscountGiven,
          total_revenue: totalRevenue,
          unique_users: uniqueUsers,
          avg_discount_per_order: totalDiscountGiven / totalUses,
          first_use_date: current.first_use_date,
          last_use_date: data.last_use_date,
        });
      } else {
        await this.insertPromoCodeStats({
          ...data,
          avg_discount_per_order: data.total_discount_given,
        });
      }
    } catch (error) {
      this.logger.error('Failed to update promo code stats:', error);
    }
  }

  private formatDateForClickHouse(date: Date): string {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }
}
