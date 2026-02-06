import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './controller/orders.controller';
import { OrdersService } from './service/orders.service';
import { Order, OrderSchema } from './schemas/order.schema';
import { PromoCodesModule } from 'src/promo-codes/promo-codes.module';
import { PromoCodeUsageModule } from 'src/promo-usage/promo-code-usage.module';
import { UsersModule } from 'src/users/user.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    BullModule.registerQueue({
      name: 'orders',
    }),
    PromoCodesModule,
    PromoCodeUsageModule,
    UsersModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
