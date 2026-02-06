import { Module } from '@nestjs/common';
import { AnalyticsController } from './controller/analytics.controller';
import { ClickHouseModule } from '../clickhouse/clickhouse.module';

@Module({
  imports: [ClickHouseModule],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
