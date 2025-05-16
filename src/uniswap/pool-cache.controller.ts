import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PoolCacheService } from './pool-cache.service';
import { StrategyKey } from './strategy-presets';
import { PoolWithAPR } from './uniswap.service';

@ApiTags('pool-cache')
@Controller('uniswap/cache')
export class PoolCacheController {
  constructor(private readonly poolCacheService: PoolCacheService) {}

  /**
   * Get cached pools by strategy
   */
  @Get('pools/:strategy')
  @ApiOperation({
    summary: 'Get cached pools by strategy',
    description:
      'Returns cached pools for a specific strategy (low, medium, high).',
  })
  @ApiParam({
    name: 'strategy',
    required: true,
    enum: ['low', 'medium', 'high'],
  })
  @ApiResponse({
    status: 200,
    description: 'List of cached pools for the chosen strategy.',
  })
  async getCachedPoolsByStrategy(
    @Param('strategy') strategy: StrategyKey,
  ): Promise<PoolWithAPR[]> {
    return this.poolCacheService.getCachedPoolsByStrategy(strategy);
  }

  /**
   * Get average APR by strategy
   */
  @Get('apr/:strategy')
  @ApiOperation({
    summary: 'Get average APR by strategy',
    description:
      'Returns the average APR for a specific strategy (low, medium, high).',
  })
  @ApiParam({
    name: 'strategy',
    required: true,
    enum: ['low', 'medium', 'high'],
  })
  @ApiResponse({
    status: 200,
    description: 'Average APR for the chosen strategy.',
  })
  async getAverageAprByStrategy(
    @Param('strategy') strategy: StrategyKey,
  ): Promise<{ apr: number }> {
    const apr = await this.poolCacheService.getAverageAprByStrategy(strategy);
    return { apr };
  }

  /**
   * Get all strategy APRs
   */
  @Get('apr')
  @ApiOperation({
    summary: 'Get all strategy APRs',
    description: 'Returns the average APR for all strategies.',
  })
  @ApiResponse({
    status: 200,
    description: 'Average APRs for all strategies.',
  })
  async getAllStrategyAprs() {
    return this.poolCacheService.getAllStrategyAprs();
  }

  /**
   * Force refresh the pool cache
   */
  @Get('refresh')
  @ApiOperation({
    summary: 'Force refresh the pool cache',
    description:
      'Manually triggers a refresh of the pool cache for all strategies.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache refresh status.',
  })
  async refreshPoolCache() {
    await this.poolCacheService.refreshPoolCache();
    return { success: true, message: 'Pool cache refresh initiated' };
  }
}
