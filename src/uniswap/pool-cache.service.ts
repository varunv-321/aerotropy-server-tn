import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UniswapService, PoolWithAPR } from './uniswap.service';
import { STRATEGY_PRESETS, StrategyKey } from './strategy-presets';

@Injectable()
export class PoolCacheService implements OnModuleInit {
  private readonly logger = new Logger(PoolCacheService.name);
  private readonly strategies: StrategyKey[] = ['low', 'medium', 'high'];
  private readonly network = 'base'; // Default network

  // In-memory storage for pool data
  private cachedPools: Record<
    StrategyKey,
    {
      pools: PoolWithAPR[];
      averageApr: number;
      timestamp: Date;
    }
  > = {
    low: { pools: [], averageApr: 0, timestamp: new Date(0) },
    medium: { pools: [], averageApr: 0, timestamp: new Date(0) },
    high: { pools: [], averageApr: 0, timestamp: new Date(0) },
  };

  constructor(private uniswapService: UniswapService) {}

  /**
   * On module initialization, refresh the pool cache immediately
   */
  async onModuleInit() {
    this.logger.log('Initializing pool cache on startup');
    await this.refreshPoolCache();
  }

  /**
   * Scheduled task to refresh the pool cache every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async scheduledRefresh() {
    this.logger.log('Running scheduled pool cache refresh');
    await this.refreshPoolCache();
  }

  /**
   * Refresh the pool cache for all strategies
   */
  async refreshPoolCache() {
    try {
      this.logger.log('Refreshing pool cache for all strategies');

      // Run all strategy refreshes in parallel for efficiency
      await Promise.all(
        this.strategies.map((strategy) => this.refreshStrategyPools(strategy)),
      );

      this.logger.log('Pool cache refresh completed');
    } catch (error) {
      this.logger.error(
        `Error refreshing pool cache: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Refresh the pool cache for a specific strategy
   */
  private async refreshStrategyPools(strategy: StrategyKey) {
    try {
      this.logger.log(`Refreshing ${strategy} risk pool cache`);

      // Get strategy preset options
      const preset = STRATEGY_PRESETS[strategy];

      // Use original values from the strategy preset, just increase topN
      const opts: any = {
        ...preset,
        topN: 50, // Increase maximum number of results
        strategy,
      };

      // Set max pool age days for high risk strategy as per original preset
      if (strategy === 'high' && preset.maxPoolAgeDays) {
        opts.maxPoolAgeDays = preset.maxPoolAgeDays;
      }

      // Query both Uniswap v3 and v4 pools to get more results
      // While keeping the original strategy values
      this.logger.log(
        `Querying Uniswap v3 pools for ${strategy} risk strategy`,
      );

      // Add timeout mechanism to prevent hanging
      let v3Pools: PoolWithAPR[] = [];
      try {
        // Create a promise that rejects after 15 seconds
        const timeoutPromise = new Promise<PoolWithAPR[]>((_, reject) => {
          setTimeout(
            () =>
              reject(new Error('Uniswap v3 query timed out after 15 seconds')),
            15000,
          );
        });

        // Race the actual query against the timeout
        v3Pools = await Promise.race([
          this.uniswapService.getBestPoolsWithScore(
            this.network,
            opts,
            3, // Explicitly specify v3
          ),
          timeoutPromise,
        ]);

        this.logger.log(
          `Successfully retrieved ${v3Pools.length} v3 pools for ${strategy} risk strategy`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to fetch v3 pools for ${strategy} risk strategy: ${error.message}. Continuing with empty result.`,
        );
        // Continue with empty array so we can still try v4 pools
      }

      this.logger.log(
        `Querying Uniswap v4 pools for ${strategy} risk strategy`,
      );

      let v4Pools: PoolWithAPR[] = [];
      try {
        // Create a promise that rejects after 15 seconds
        const timeoutPromise = new Promise<PoolWithAPR[]>((_, reject) => {
          setTimeout(
            () =>
              reject(new Error('Uniswap v4 query timed out after 15 seconds')),
            15000,
          );
        });

        // Race the actual query against the timeout
        v4Pools = await Promise.race([
          this.uniswapService.getBestPoolsWithScore(
            this.network,
            opts,
            4, // Explicitly specify v4
          ),
          timeoutPromise,
        ]);

        this.logger.log(
          `Successfully retrieved ${v4Pools.length} v4 pools for ${strategy} risk strategy`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to fetch v4 pools for ${strategy} risk strategy: ${error.message}. Continuing with empty result.`,
        );
      }

      // Combine results from both versions
      const pools = [...v3Pools, ...v4Pools];

      // Calculate average APR across all pools
      const validAprs = pools
        .map((pool) => pool.apr)
        .filter((apr) => apr !== null && apr !== undefined) as number[];

      const averageApr =
        validAprs.length > 0
          ? validAprs.reduce((sum, apr) => sum + apr, 0) / validAprs.length
          : 0;

      // Save to in-memory cache
      this.cachedPools[strategy] = {
        pools,
        averageApr,
        timestamp: new Date(),
      };

      this.logger.log(
        `Cached ${pools.length} pools for ${strategy} risk strategy. Average APR: ${averageApr.toFixed(2)}%`,
      );
    } catch (error) {
      this.logger.error(
        `Error refreshing ${strategy} pool cache: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get cached pools for a specific strategy
   */
  async getCachedPoolsByStrategy(
    strategy: StrategyKey,
  ): Promise<PoolWithAPR[]> {
    try {
      // Check if we have cached data
      const cacheEntry = this.cachedPools[strategy];

      // If cache exists and is not too old (less than 6 hours old)
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      if (cacheEntry.pools.length > 0 && cacheEntry.timestamp > sixHoursAgo) {
        return cacheEntry.pools;
      }

      // If no cache found or it's too old, refresh and return fresh data
      this.logger.log(
        `No recent cache found for ${strategy} strategy, fetching fresh data`,
      );
      await this.refreshStrategyPools(strategy);

      return this.cachedPools[strategy].pools;
    } catch (error) {
      this.logger.error(
        `Error getting cached pools for ${strategy}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Get the average APR for a specific strategy
   */
  async getAverageAprByStrategy(strategy: StrategyKey): Promise<number> {
    try {
      // Check if we have cached data
      const cacheEntry = this.cachedPools[strategy];

      // If cache exists and is not too old (less than 6 hours old)
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      if (cacheEntry.timestamp > sixHoursAgo) {
        return cacheEntry.averageApr;
      }

      // If no cache found or it's too old, refresh and return fresh data
      await this.refreshStrategyPools(strategy);
      return this.cachedPools[strategy].averageApr;
    } catch (error) {
      this.logger.error(
        `Error getting average APR for ${strategy}: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Get all strategy average APRs
   */
  async getAllStrategyAprs(): Promise<Record<StrategyKey, number>> {
    const result: Partial<Record<StrategyKey, number>> = {};

    // Use Promise.all for concurrent execution
    await Promise.all(
      this.strategies.map(async (strategy) => {
        result[strategy] = await this.getAverageAprByStrategy(strategy);
      }),
    );

    return result as Record<StrategyKey, number>;
  }

  /**
   * Get a comprehensive summary of all pool strategies
   * This includes strategy descriptions, average APRs, and top pools for each strategy
   */
  async getPoolSummary(topN: number = 5) {
    try {
      this.logger.log(
        `Generating comprehensive pool summary with top ${topN} pools per strategy`,
      );

      // Get all the strategy APRs
      const aprs = await this.getAllStrategyAprs();

      // Helper function to create strategy description
      const getStrategyDescription = (strategy: StrategyKey): string => {
        switch (strategy) {
          case 'low':
            return 'Conservative strategy focusing on established pools with proven stability, high TVL, and consistent fees. Prioritizes lower volatility over APR.';
          case 'medium':
            return 'Balanced strategy that seeks moderate risk and return. Targets pools with good volume and reasonable APR while maintaining acceptable volatility.';
          case 'high':
            return 'Aggressive strategy that targets maximum APR and accepts higher volatility. Focuses on newer or more volatile pools with potential for higher returns.';
        }
      };

      // Get pools for each strategy
      const [lowPools, mediumPools, highPools] = await Promise.all([
        this.getCachedPoolsByStrategy('low'),
        this.getCachedPoolsByStrategy('medium'),
        this.getCachedPoolsByStrategy('high'),
      ]);

      // Helper function to get top N pools for a strategy sorted by APR
      const getTopPools = (pools: PoolWithAPR[], count: number) => {
        return pools
          .filter((pool) => pool.apr !== null)
          .sort((a, b) => (b.apr || 0) - (a.apr || 0))
          .slice(0, count);
      };

      // Build and return the summary object
      return {
        strategies: {
          low: {
            name: 'Low Risk Strategy',
            description: getStrategyDescription('low'),
            riskLevel: 'low',
            averageApr: aprs.low,
            poolCount: lowPools.length,
            topPools: getTopPools(lowPools, topN),
          },
          medium: {
            name: 'Medium Risk Strategy',
            description: getStrategyDescription('medium'),
            riskLevel: 'medium',
            averageApr: aprs.medium,
            poolCount: mediumPools.length,
            topPools: getTopPools(mediumPools, topN),
          },
          high: {
            name: 'High Risk Strategy',
            description: getStrategyDescription('high'),
            riskLevel: 'high',
            averageApr: aprs.high,
            poolCount: highPools.length,
            topPools: getTopPools(highPools, topN),
          },
        },
        timestamp: Date.now(),
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Error generating pool summary: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
