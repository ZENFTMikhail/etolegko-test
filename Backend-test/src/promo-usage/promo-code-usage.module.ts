import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromoCodeUsageService } from './service/promo-code-usage.service';
import { ClickHouseModule } from '../clickhouse/clickhouse.module';
import { PromoUsage, PromoUsageSchema } from './schemas/promo-usage.schema';
import { PromoCodesModule } from 'src/promo-codes/promo-codes.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PromoUsage.name, schema: PromoUsageSchema },
    ]),
    PromoCodesModule,
    ClickHouseModule,
  ],
  providers: [PromoCodeUsageService],
  exports: [PromoCodeUsageService],
})
export class PromoCodeUsageModule {}
