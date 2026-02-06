import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ClickHouseService } from '../../clickhouse/service/clickhouse.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly clickHouseService: ClickHouseService) {}

  @Get('promo-codes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get promo code analytics from ClickHouse' })
  @ApiResponse({
    status: 200,
    description: 'Promo code analytics retrieved successfully',
  })
  @ApiQuery({
    name: 'promoCode',
    required: false,
    type: String,
    description: 'Filter by specific promo code',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter from date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter to date (YYYY-MM-DD)',
  })
  async getPromoCodeAnalytics(
    @Query('promoCode') promoCode?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const analytics = await this.clickHouseService.getPromoCodeAnalytics(
      promoCode,
      startDate,
      endDate,
    );

    return {
      success: true,
      data: analytics,
      metadata: {
        source: 'ClickHouse',
        timestamp: new Date().toISOString(),
        filteredByPromoCode: !!promoCode,
      },
    };
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user analytics from ClickHouse' })
  @ApiResponse({
    status: 200,
    description: 'User analytics retrieved successfully',
  })
  @ApiQuery({ name: 'userId', required: false, type: String })
  async getUserAnalytics(@Query('userId') userId?: string) {
    const analytics = await this.clickHouseService.getUserAnalytics(userId);

    return {
      success: true,
      data: analytics,
      metadata: {
        source: 'ClickHouse',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('users-table')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get users analytics table with pagination and filters',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 20,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: [
      'total_orders',
      'total_amount',
      'total_discount',
      'avg_order_amount',
      'promo_codes_used',
      'last_order_date',
    ],
    description: 'Field to sort by',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by email or name',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter from date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter to date (YYYY-MM-DD)',
  })
  async getUsersTable(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('sortBy') sortBy: string = 'total_amount',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Валидация
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    if (page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    // Получаем данные из ClickHouse
    const result = await this.clickHouseService.getUsersTable(
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      startDate,
      endDate,
    );

    return {
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages,
      },
      filters: {
        search,
        startDate,
        endDate,
        sortBy,
        sortOrder,
      },
      metadata: {
        source: 'ClickHouse',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('revenue')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get revenue statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getRevenue(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    let whereClause = '';
    if (startDate && endDate) {
      whereClause = `WHERE order_date >= '${startDate}' AND order_date <= '${endDate}'`;
    }

    const sql = `
      SELECT 
        SUM(final_amount) as total_revenue,
        COUNT(*) as total_orders,
        AVG(final_amount) as avg_order_value
      FROM analytics.order_analytics
      ${whereClause}
    `;

    const data = await this.clickHouseService.query(sql);

    return {
      success: true,
      data: Array.isArray(data) && data.length ? (data[0] as unknown) : null,

      metadata: {
        period:
          startDate && endDate ? `${startDate} to ${endDate}` : 'all time',
        source: 'ClickHouse',
      },
    };
  }
}
