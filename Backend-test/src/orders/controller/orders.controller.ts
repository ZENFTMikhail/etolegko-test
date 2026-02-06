import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  BadRequestException,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { OrdersService } from '../service/orders.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PromoCodesService } from 'src/promo-codes/service/promo-code.service';
import { CreateOrderDto } from '../dto/create-order.dto';

interface AuthRequest extends Request {
  user: {
    userId: string;
    email: string;
  };
}

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly promoCodesService: PromoCodesService,
  ) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new order' })
  async createOrder(
    @Req() req: AuthRequest,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    const userId = req.user.userId;
    const { amount, promoCode } = createOrderDto;

    if (!amount) {
      throw new BadRequestException('Missing required field: amount');
    }

    const result = await this.ordersService.createOrder(
      userId,
      amount,
      promoCode,
    );

    return {
      success: true,
      message: 'Order queued for processing',
      jobId: result.jobId,
      status: result.status,
      queueStatus: 'processing',
    };
  }

  @Post('generate-test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Generate test orders' })
  @ApiBody({
    description: 'Generate test orders',
    schema: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          example: 5,
          default: 5,
        },
      },
    },
  })
  async generateTestOrders(
    @Req() req: AuthRequest,
    @Body() body: { count?: number },
  ) {
    const userId = req.user.userId;
    const count = body.count || 5;

    await this.ordersService.createTestOrders(userId, count);

    return {
      success: true,
      message: `Generated ${count} test orders`,
    };
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user orders' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserOrders(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.ordersService.getUserOrders(userId, page, limit);
  }

  @Get('stats/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user order statistics' })
  async getUserStats(@Param('userId') userId: string) {
    const stats = await this.ordersService.getUserStats(userId);

    return {
      success: true,
      userId,
      stats,
    };
  }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all orders (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  async getAllOrders(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('userId') userId?: string,
  ) {
    return this.ordersService.getAllOrders(page, limit, userId);
  }

  @Post('apply-promo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Apply promo code to order and calculate discount' })
  @ApiBody({
    description: 'Apply promo code to calculate discount',
    schema: {
      type: 'object',
      properties: {
        orderAmount: {
          type: 'number',
          example: 1000,
          description: 'Order amount before discount',
          minimum: 1,
        },
        promoCode: {
          type: 'string',
          example: 'SUMMER2024',
          description: 'Promo code to apply',
        },
      },
      required: ['orderAmount', 'promoCode'],
    },
  })
  async applyPromoCode(
    @Req() req: AuthRequest,
    @Body() body: { orderAmount: number; promoCode: string },
  ) {
    const userId = req.user.userId;
    const { orderAmount, promoCode } = body;

    if (!orderAmount || !promoCode) {
      throw new BadRequestException(
        'Missing required fields: orderAmount, promoCode',
      );
    }

    if (orderAmount <= 0) {
      throw new BadRequestException('Order amount must be greater than 0');
    }

    const promoResult = await this.promoCodesService.applyPromoCode(
      promoCode,
      userId,
      orderAmount,
    );

    if (!promoResult.success) {
      throw new BadRequestException(promoResult.message);
    }

    return {
      success: true,
      message: 'Promo code applied successfully',
      data: {
        originalAmount: orderAmount,
        discountAmount: promoResult.discountAmount,
        finalAmount: promoResult.finalAmount,
        discountPercent: promoResult.discountPercent,
        promoCode,
      },
    };
  }
}
