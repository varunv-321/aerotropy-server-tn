import { Module } from '@nestjs/common';
import { UniswapController } from './uniswap.controller';
import { UniswapService } from './uniswap.service';
import { UniswapMintService } from './uniswap-mint.service';
import { UniswapRemoveService } from './uniswap-remove.service';
import { GraphModule } from '../graph/graph.module';

@Module({
  imports: [GraphModule],
  controllers: [UniswapController],
  providers: [UniswapService, UniswapMintService, UniswapRemoveService],
  exports: [UniswapService, UniswapMintService, UniswapRemoveService],
})
export class UniswapModule {}
