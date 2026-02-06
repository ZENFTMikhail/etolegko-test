import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({
    description: 'Order amount',
    example: 1000,
    required: true,
  })
  @IsNumber()
  @IsPositive()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: 'Promo code (optional)',
    example: 'SUMMER2024',
    required: false,
  })
  @IsOptional()
  @IsString()
  promoCode?: string;
}
