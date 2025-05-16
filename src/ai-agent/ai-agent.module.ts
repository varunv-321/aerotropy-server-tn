import { Module } from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { AiAgentController } from './ai-agent.controller';
import { DashboardModule } from '../dashboard/dashboard.module';
import { UniswapModule } from '../uniswap/uniswap.module';

@Module({
  imports: [DashboardModule, UniswapModule],
  providers: [AiAgentService],
  controllers: [AiAgentController]
})
export class AiAgentModule {}
