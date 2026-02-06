import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

export enum OrderStatus {
  PENDING = 'pending',
  PAYED = 'payed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

@Schema()
export class Order {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    required: true,
    min: 1,
  })
  amount: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'PromoCode',
    default: null,
    index: true,
  })
  promoCodeId?: Types.ObjectId;

  @Prop({
    min: 0,
    default: 0,
  })
  discountAmount?: number;

  @Prop({
    min: 0,
    default: 0,
  })
  finalAmount: number;

  @Prop({
    default: OrderStatus.COMPLETED,
    enum: OrderStatus,
    index: true,
  })
  status: OrderStatus;

  @Prop({ type: String })
  promoCode?: string;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.pre<OrderDocument>('save', function () {
  if (this.isModified('amount') || this.isModified('discountAmount')) {
    this.finalAmount = this.amount - (this.discountAmount || 0);
  }
});

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ promoCodeId: 1, createdAt: -1 });
OrderSchema.index({ finalAmount: -1 });
OrderSchema.index({ userId: 1, status: 1 });
