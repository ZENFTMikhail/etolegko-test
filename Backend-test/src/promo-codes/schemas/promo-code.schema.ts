import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PromoCodeDocument = HydratedDocument<PromoCode>;

export enum PromoCodeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true })
export class PromoCode {
  @Prop({
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 4,
    maxlength: 50,
  })
  code: string;

  @Prop({
    required: true,
    min: 1,
    max: 100,
  })
  discountPercent: number;

  @Prop({
    required: true,
    min: 1,
    default: 100,
  })
  maxUsage: number;

  @Prop({
    required: true,
    min: 1,
    default: 1,
  })
  maxUsagePerUser: number;

  @Prop({ default: null })
  validFrom: Date;

  @Prop({ default: null })
  validUntil: Date;

  @Prop({
    default: PromoCodeStatus.ACTIVE,
    enum: PromoCodeStatus,
    index: true,
  })
  status: PromoCodeStatus;

  @Prop({ default: 0, min: 0 })
  usedCount: number;

  @Prop({ default: 0 })
  totalDiscountGiven: number;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'User' }],
    default: [],
  })
  usedBy: Types.ObjectId[];
}

export const PromoCodeSchema = SchemaFactory.createForClass(PromoCode);

PromoCodeSchema.index({ status: 1 });
PromoCodeSchema.index({ validUntil: 1 });
PromoCodeSchema.index({ createdAt: -1 });
PromoCodeSchema.index({ status: 1, validUntil: 1 });
PromoCodeSchema.index({ discountPercent: -1 });
