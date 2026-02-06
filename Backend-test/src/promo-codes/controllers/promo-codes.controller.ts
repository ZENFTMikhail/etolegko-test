import {
  Controller,
  Get,
  Post,
  Body,
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

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PromoCodesService } from '../service/promo-code.service';

@ApiTags('promo-codes')
@Controller('promo-codes')
export class PromoCodesController {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Validate promo code' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validatePromoCode(@Body() body: { code: string; userId: string }) {
    const { code, userId } = body;

    if (!code || !userId) {
      throw new BadRequestException('Missing code or userId');
    }

    const validation = await this.promoCodesService.validatePromoCode(
      code,
      userId,
    );

    return {
      success: true,
      validation,
    };
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Apply promo code to calculate discount' })
  async applyPromoCode(
    @Body() body: { code: string; userId: string; orderAmount: number },
  ) {
    const { code, userId, orderAmount } = body;

    if (!code || !userId || !orderAmount) {
      throw new BadRequestException(
        'Missing required fields: code, userId, orderAmount',
      );
    }

    if (orderAmount <= 0) {
      throw new BadRequestException('Order amount must be greater than 0');
    }

    const result = await this.promoCodesService.applyPromoCode(
      code,
      userId,
      orderAmount,
    );

    return {
      success: result.success,
      data: result,
    };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get promo code statistics' })
  @ApiQuery({ name: 'code', required: true, type: String })
  async getPromoCodeStats(@Query('code') code: string) {
    if (!code) {
      throw new BadRequestException('Missing code parameter');
    }

    const stats = await this.promoCodesService.getPromoCodeStats(code);

    return {
      success: true,
      stats,
    };
  }
}
