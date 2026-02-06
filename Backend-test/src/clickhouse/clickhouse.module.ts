import { Module, Global } from '@nestjs/common';
import { ClickHouseService } from './service/clickhouse.service';

@Global()
@Module({
  providers: [ClickHouseService],
  exports: [ClickHouseService],
})
export class ClickHouseModule {}
