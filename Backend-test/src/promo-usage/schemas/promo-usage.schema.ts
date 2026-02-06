import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PromoUsageDocument = HydratedDocument<PromoUsage>;

@Schema({ timestamps: true })
export class PromoUsage {
  @Prop({
    type: Types.ObjectId,
    ref: 'PromoCode',
    required: true,
    index: true,
  })
  promoCodeId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true,
    index: true,
  })
  orderId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  orderAmount: number;

  @Prop({ required: true, min: 0 })
  discountAmount: number;

  @Prop({ required: true, min: 0 })
  finalAmount: number;

  @Prop({ required: true, min: 1, max: 100 })
  discountPercent: number;

  @Prop({
    required: true,
    index: true,
    uppercase: true,
  })
  promoCode: string;

  @Prop({ default: Date.now })
  usedAt: Date;
}

export const PromoUsageSchema = SchemaFactory.createForClass(PromoUsage);

PromoUsageSchema.index({ userId: 1, promoCodeId: 1 });
PromoUsageSchema.index({ promoCodeId: 1, createdAt: 1 });
PromoUsageSchema.index({ userId: 1, createdAt: 1 });
PromoUsageSchema.index({ promoCode: 1, createdAt: 1 });
PromoUsageSchema.index({ usedAt: -1 });
PromoUsageSchema.index(
  { promoCodeId: 1, userId: 1, orderId: 1 },
  { unique: true },
);
PromoUsageSchema.index({ promoCode: 1, discountAmount: 1 });
