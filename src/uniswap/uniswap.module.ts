import { Module } from '@nestjs/common';
import { UniswapController } from './uniswap.controller';
import { UniswapService } from './uniswap.service';
import { GraphModule } from '../graph/graph.module';

@Module({
  imports: [GraphModule],
  controllers: [UniswapController],
  providers: [UniswapService],
  exports: [UniswapService],
})
export class UniswapModule {}
