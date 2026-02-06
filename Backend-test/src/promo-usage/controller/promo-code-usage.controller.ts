import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PromoCodeUsageService } from '../service/promo-code-usage.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('promo-code-usage')
@Controller('promo-code-usage')
export class PromoCodeUsageController {
  constructor(private readonly promoCodeUsageService: PromoCodeUsageService) {}

  @Get('promo/:code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get promo code usage history (from MongoDB)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPromoCodeHistory(
    @Param('code') code: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    if (!code) {
      throw new BadRequestException('Promo code is required');
    }

    const history = await this.promoCodeUsageService.getPromoCodeHistory(
      code,
      page,
      limit,
    );

    return {
      success: true,
      source: 'MongoDB (operational data)',
      ...history,
    };
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user promo code usage history (from MongoDB)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserPromoCodeHistory(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const history = await this.promoCodeUsageService.getUserPromoCodeHistory(
      userId,
      page,
      limit,
    );

    return {
      success: true,
      source: 'MongoDB (operational data)',
      ...history,
    };
  }
}
