import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  providers: [DashboardService],
  controllers: [DashboardController],
  exports: [DashboardService], // Export DashboardService so it can be used in other modules
})
export class DashboardModule {}
