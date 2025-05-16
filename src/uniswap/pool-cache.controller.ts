import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PoolCacheService } from './pool-cache.service';
import { StrategyKey } from './strategy-presets';
import { PoolWithAPR } from './uniswap.service';

// Define interfaces for the detailed pool information
interface TokenDetails {
  symbol: string;
  name: string;
  address: string;
  decimals?: number;
  logoUri?: string;
}

interface PoolDetails {
  id: string;
  token0: TokenDetails;
  token1: TokenDetails;
  feeTier: string;
  apr: number | null;
  tvl: string;
  volatility?: number;
  sharpeRatio?: number;
  volume24h?: string;
  volume7d?: string;
}

interface StrategyDetails {
  name: string;
  description: string;
  riskLevel: string;
  averageApr: number;
  poolCount: number;
  topPools: PoolDetails[];
}

interface PoolSummary {
  strategies: {
    low: StrategyDetails;
    medium: StrategyDetails;
    high: StrategyDetails;
  };
  timestamp: number;
  lastUpdated: string;
}

@ApiTags('pool-cache')
@Controller('uniswap/cache')
export class PoolCacheController {
  // Strategy descriptions for the summary endpoint
  private readonly strategyDescriptions = {
    low: 'Conservative strategy focusing on established pools with proven stability, high TVL, and consistent fees. Prioritizes lower volatility over APR.',
    medium: 'Balanced strategy that seeks moderate risk and return. Targets pools with good volume and reasonable APR while maintaining acceptable volatility.',
    high: 'Aggressive strategy that targets maximum APR and accepts higher volatility. Focuses on newer or more volatile pools with potential for higher returns.',
  };

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
   * Get comprehensive pool summary with details for all strategies
   */
  @Get('summary')
  @ApiOperation({
    summary: 'Get comprehensive pool summary',
    description: 'Returns detailed information about all strategies and their top pools in a single request.',
  })
  @ApiResponse({
    status: 200,
    description: 'Comprehensive pool summary with details for all strategies.',
  })
  async getComprehensivePoolSummary(@Query('topN') topN: number = 5): Promise<PoolSummary> {
    // Get the APRs for all strategies
    const aprs = await this.poolCacheService.getAllStrategyAprs();
    
    // Get the cached pools for each strategy
    const [lowPools, mediumPools, highPools] = await Promise.all([
      this.poolCacheService.getCachedPoolsByStrategy('low'),
      this.poolCacheService.getCachedPoolsByStrategy('medium'),
      this.poolCacheService.getCachedPoolsByStrategy('high'),
    ]);
    
    // Get the top N pools for each strategy sorted by APR
    const getTopPools = (pools: PoolWithAPR[], count: number): PoolDetails[] => {
      return pools
        .filter(pool => pool.apr !== null)
        .sort((a, b) => (b.apr || 0) - (a.apr || 0))
        .slice(0, count)
        .map(pool => ({
          id: pool.id,
          token0: {
            symbol: pool.token0.symbol,
            name: pool.token0.name,
            address: pool.token0.id,
          },
          token1: {
            symbol: pool.token1.symbol,
            name: pool.token1.name,
            address: pool.token1.id,
          },
          feeTier: pool.feeTier,
          apr: pool.apr,
          tvl: pool.totalValueLockedUSD,
          volatility: pool.aprStdDev !== null ? pool.aprStdDev : undefined,
          sharpeRatio: pool.sharpeRatio !== null ? pool.sharpeRatio : undefined,
          // Add volume metrics if available (using poolDayData if needed)
          volume7d: pool.averageVolume7d ? pool.averageVolume7d.toString() : undefined,
        }));
    };

    // Build the response object
    const summary: PoolSummary = {
      strategies: {
        low: {
          name: 'Low Risk Strategy',
          description: this.strategyDescriptions.low,
          riskLevel: 'low',
          averageApr: aprs.low,
          poolCount: lowPools.length,
          topPools: getTopPools(lowPools, topN),
        },
        medium: {
          name: 'Medium Risk Strategy',
          description: this.strategyDescriptions.medium,
          riskLevel: 'medium',
          averageApr: aprs.medium,
          poolCount: mediumPools.length,
          topPools: getTopPools(mediumPools, topN),
        },
        high: {
          name: 'High Risk Strategy',
          description: this.strategyDescriptions.high,
          riskLevel: 'high',
          averageApr: aprs.high,
          poolCount: highPools.length,
          topPools: getTopPools(highPools, topN),
        },
      },
      timestamp: Date.now(),
      lastUpdated: new Date().toISOString(),
    };
    
    return summary;
  }

  /**
   * Force refresh the pool cache
   */
  @Get('refresh')
  @ApiOperation({
    summary: 'Force refresh the pool cache',
    description: 'Forces a refresh of the pool cache for all strategies.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pool cache refreshed.',
  })
  async refreshCache() {
    await this.poolCacheService.refreshPoolCache();
    return { success: true, message: 'Pool cache refreshed successfully' };
  }
}
