import {
  IsString,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { PromoCodeStatus } from '../schemas/promo-code.schema';

export class CreatePromoCodeDto {
  @IsString()
  @IsEnum(PromoCodeStatus)
  @IsOptional()
  status?: PromoCodeStatus;

  @IsString()
  @IsOptional()
  code?: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  discountPercent: number;

  @IsNumber()
  @Min(1)
  maxUsage: number;

  @IsNumber()
  @Min(1)
  maxUsagePerUser: number;

  @IsOptional()
  @IsDateString()
  validFrom?: Date;

  @IsOptional()
  @IsDateString()
  validUntil?: Date;
}
