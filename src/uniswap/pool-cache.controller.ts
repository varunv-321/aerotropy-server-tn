import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PoolCacheService } from './pool-cache.service';
import { StrategyKey } from './strategy-presets';
import { PoolWithAPR } from './uniswap.service';
import { serviceRegistry } from '../ai-agent/tools/service-registry';

// Import the DashboardService type for type checking
import { DashboardService } from '../dashboard/dashboard.service';

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

interface TokenAllocation {
  symbol: string;
  name: string;
  address: string;
  totalSupply: string;
  formattedSupply: string;
  valueUSD: string;
  logoUrl: string;
}

interface StrategyDetails {
  name: string;
  description: string;
  riskLevel: StrategyKey;
  averageApr: number;
  aprRange: string; // Text representation of APR range for this risk level
  poolCount: number;
  topPools: PoolDetails[];
  tokenAllocation: TokenAllocation[];
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
    medium:
      'Balanced strategy that seeks moderate risk and return. Targets pools with good volume and reasonable APR while maintaining acceptable volatility.',
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
    description:
      'Returns detailed information about all strategies and their top pools in a single request.',
  })
  @ApiResponse({
    status: 200,
    description: 'Comprehensive pool summary with details for all strategies.',
  })
  async getComprehensivePoolSummary(
    @Query('topN') topN: number = 5,
  ): Promise<PoolSummary> {
    // Get the APRs for all strategies
    const aprs = await this.poolCacheService.getAllStrategyAprs();

    // Get the cached pools for each strategy
    const [lowPools, mediumPools, highPools] = await Promise.all([
      this.poolCacheService.getCachedPoolsByStrategy('low'),
      this.poolCacheService.getCachedPoolsByStrategy('medium'),
      this.poolCacheService.getCachedPoolsByStrategy('high'),
    ]);

    // Get the dashboard service from the registry if available (for token supplies)
    let dashboardService;
    try {
      dashboardService = serviceRegistry.getService(
        'dashboardService',
      ) as DashboardService;
    } catch (error) {
      console.warn('Dashboard service not available for token supply data');
    }

    // Get the top N pools for each strategy sorted by APR
    const getTopPools = async (
      pools: PoolWithAPR[],
      count: number,
    ): Promise<PoolDetails[]> => {
      // Get the top pools sorted by APR
      const topPools = pools
        .filter((pool) => pool.apr !== null)
        .sort((a, b) => (b.apr || 0) - (a.apr || 0))
        .slice(0, count);

      // Create the base pool details without token supplies
      const poolDetails = topPools.map((pool) => ({
        id: pool.id,
        token0: {
          symbol: pool.token0.symbol,
          name: pool.token0.name,
          address: pool.token0.id,
        } as TokenDetails,
        token1: {
          symbol: pool.token1.symbol,
          name: pool.token1.name,
          address: pool.token1.id,
        } as TokenDetails,
        feeTier: pool.feeTier,
        apr: pool.apr,
        tvl: pool.totalValueLockedUSD,
        volatility: pool.aprStdDev !== null ? pool.aprStdDev : undefined,
        sharpeRatio: pool.sharpeRatio !== null ? pool.sharpeRatio : undefined,
        // Add volume metrics if available (using poolDayData if needed)
        volume7d: pool.averageVolume7d
          ? pool.averageVolume7d.toString()
          : undefined,
      }));

      // If dashboard service is available, add token supply information
      if (dashboardService) {
        try {
          // For each pool, try to get token supplies
          const poolDetailsWithSupplies = await Promise.all(
            poolDetails.map(async (poolDetail) => {
              try {
                // Create a pool object with name and address for the dashboard service
                // We'll use the pool ID as the address since that's the pool contract address
                const poolObject = {
                  name: `${poolDetail.token0.symbol}/${poolDetail.token1.symbol} ${poolDetail.feeTier}`,
                  address: poolDetail.id,
                };

                // Get token supplies for this pool
                const poolSupply =
                  await dashboardService.getPoolTokenSupply(poolObject);

                // Find the token supplies for token0 and token1
                const token0Supply = poolSupply.tokenSupplies.find(
                  (t) => t.token.symbol === poolDetail.token0.symbol,
                );
                const token1Supply = poolSupply.tokenSupplies.find(
                  (t) => t.token.symbol === poolDetail.token1.symbol,
                );

                // We no longer need to add token supply to individual pool tokens
                // since we have a comprehensive tokenAllocation at the strategy level

                return poolDetail;
              } catch (error) {
                console.error(
                  `Error adding token supplies for pool ${poolDetail.id}:`,
                  error,
                );
                return poolDetail; // Return original pool detail if error
              }
            }),
          );

          return poolDetailsWithSupplies;
        } catch (error) {
          console.error('Error adding token supplies to pool details:', error);
          return poolDetails; // Return original pool details if error
        }
      }

      // If no dashboard service, return the original pool details
      return poolDetails;
    };

    // Function to generate token allocations for all standard tokens
    const calculateTokenAllocations = async (): Promise<TokenAllocation[]> => {
      // Import our standard tokens from constants
      const { TOKENS } = await import('../common/utils/token.constants');

      // Initialize token allocations with default values
      const tokenAllocations: TokenAllocation[] = TOKENS.map((token) => ({
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        totalSupply: '0',
        formattedSupply: `0 ${token.symbol}`,
        valueUSD: '0',
        logoUrl: token.logo,
      }));

      // If dashboard service is available, try to get actual supply data
      if (dashboardService) {
        try {
          // Get pool token supplies from dashboard service
          const poolSupplies = await dashboardService.getPoolTokenSupplies();

          // Update our token allocations with actual data
          for (const poolSupply of poolSupplies) {
            for (const tokenSupply of poolSupply.tokenSupplies) {
              // Find matching token in our allocations
              const matchingToken = tokenAllocations.find(
                (t) =>
                  t.symbol.toLowerCase() ===
                  tokenSupply.token.symbol.toLowerCase(),
              );

              if (matchingToken) {
                // Add to total supply (convert to number, add, then back to string)
                const currentSupply =
                  parseFloat(matchingToken.totalSupply) || 0;
                const additionalSupply =
                  parseFloat(tokenSupply.totalSupply) || 0;
                const newTotalSupply = currentSupply + additionalSupply;

                matchingToken.totalSupply = newTotalSupply.toString();
                matchingToken.formattedSupply = `${newTotalSupply.toLocaleString()} ${matchingToken.symbol}`;

                // Add to USD value
                const currentValueUSD = parseFloat(matchingToken.valueUSD) || 0;
                const additionalValueUSD =
                  parseFloat(tokenSupply.valueUSD) || 0;
                matchingToken.valueUSD = (
                  currentValueUSD + additionalValueUSD
                ).toString();
              }
            }
          }
        } catch (error) {
          console.error('Error calculating token allocations:', error);
        }
      }

      return tokenAllocations;
    };

    // Get token allocations for all standard tokens
    const tokenAllocations = await calculateTokenAllocations();

    // Build the response object
    const summary: PoolSummary = {
      strategies: {
        low: {
          name: 'Low Risk Strategy',
          description:
            'Conservative strategy focusing on established pools with proven stability, high TVL, and consistent fees. Prioritizes lower volatility over APR.',
          riskLevel: 'low',
          averageApr: aprs.low,
          aprRange: '15% to 25%',
          poolCount: lowPools.length,
          topPools: await getTopPools(lowPools, topN),
          tokenAllocation: tokenAllocations,
        },
        medium: {
          name: 'Medium Risk Strategy',
          description:
            'Balanced strategy that seeks moderate risk and return. Targets pools with good volume and reasonable APR while maintaining acceptable volatility.',
          riskLevel: 'medium',
          averageApr: aprs.medium,
          aprRange: '25% to 50%',
          poolCount: mediumPools.length,
          topPools: await getTopPools(mediumPools, topN),
          tokenAllocation: tokenAllocations,
        },
        high: {
          name: 'High Risk Strategy',
          description:
            'Aggressive strategy that targets maximum APR and accepts higher volatility. Focuses on newer or more volatile pools with potential for higher returns.',
          riskLevel: 'high',
          averageApr: aprs.high,
          aprRange: '50% and above',
          poolCount: highPools.length,
          topPools: await getTopPools(highPools, topN),
          tokenAllocation: tokenAllocations,
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
