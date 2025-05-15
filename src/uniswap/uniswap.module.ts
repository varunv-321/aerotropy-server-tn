import { Module } from '@nestjs/common';
import { UniswapController } from './uniswap.controller';
import { UniswapService } from './uniswap.service';
import { UniswapMintService } from './uniswap-mint.service';
import { GraphModule } from '../graph/graph.module';

@Module({
  imports: [GraphModule],
  controllers: [UniswapController],
  providers: [UniswapService, UniswapMintService],
  exports: [UniswapService, UniswapMintService],
})
export class UniswapModule {}
