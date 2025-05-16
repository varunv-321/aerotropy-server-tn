import { Module } from '@nestjs/common';
import { UniswapController } from './uniswap.controller';
import { UniswapService } from './uniswap.service';
import { UniswapMintService } from './uniswap-mint.service';
import { UniswapRemoveService } from './uniswap-remove.service';
import { GraphModule } from '../graph/graph.module';
import { PoolCacheController } from './pool-cache.controller';
import { PoolCacheService } from './pool-cache.service';

@Module({
  imports: [GraphModule],
  controllers: [UniswapController, PoolCacheController],
  providers: [UniswapService, UniswapMintService, UniswapRemoveService, PoolCacheService],
  exports: [UniswapService, UniswapMintService, UniswapRemoveService, PoolCacheService],
})
export class UniswapModule {}
