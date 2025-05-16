import { serviceRegistry } from './service-registry';
import { PoolCacheService } from '../../uniswap/pool-cache.service';
import { StrategyKey } from '../../uniswap/strategy-presets';

/**
 * Tools for retrieving cached pool data and APR information
 * These are made available to the AI agent for quick access
 * to precomputed pool data by strategy risk profile
 */
export const poolCacheTools = {
  /**
   * Get pools by strategy risk profile from cache
   */
  getCachedPoolsByStrategy: async ({ strategy }: { strategy: StrategyKey }) => {
    try {
      // Get the pool cache service from the registry
      const poolCacheService = serviceRegistry.getService(
        'poolCacheService',
      ) as PoolCacheService;

      if (!poolCacheService) {
        throw new Error('Pool cache service not found in registry');
      }

      // Validate the strategy parameter
      if (!['low', 'medium', 'high'].includes(strategy)) {
        throw new Error(
          'Invalid strategy. Must be one of: low, medium, high',
        );
      }

      // Get pools from cache for the specified strategy
      const pools = await poolCacheService.getCachedPoolsByStrategy(strategy);

      // Return a simplified version with key information for the AI
      return pools.map((pool) => ({
        id: pool.id,
        token0: `${pool.token0.symbol} (${pool.token0.name})`,
        token1: `${pool.token1.symbol} (${pool.token1.name})`,
        feeTier: pool.feeTier,
        tvl: pool.totalValueLockedUSD,
        apr: pool.apr !== null ? `${pool.apr.toFixed(2)}%` : 'N/A',
        volatility: pool.aprStdDev !== null && pool.aprStdDev !== undefined ? pool.aprStdDev.toFixed(2) : 'N/A',
        sharpeRatio: pool.sharpeRatio !== null && pool.sharpeRatio !== undefined ? pool.sharpeRatio.toFixed(2) : 'N/A',
      }));
    } catch (error) {
      throw new Error(
        `Error retrieving cached pools by strategy: ${error.message}`,
      );
    }
  },

  /**
   * Get the average APR for a specific strategy risk profile
   */
  getStrategyAverageApr: async ({ strategy }: { strategy: StrategyKey }) => {
    try {
      // Get the pool cache service from the registry
      const poolCacheService = serviceRegistry.getService(
        'poolCacheService',
      ) as PoolCacheService;

      if (!poolCacheService) {
        throw new Error('Pool cache service not found in registry');
      }

      // Validate the strategy parameter
      if (!['low', 'medium', 'high'].includes(strategy)) {
        throw new Error(
          'Invalid strategy. Must be one of: low, medium, high',
        );
      }

      // Get average APR for the specified strategy
      const apr = await poolCacheService.getAverageAprByStrategy(strategy);

      return {
        strategy,
        averageApr: `${apr.toFixed(2)}%`,
        averageAprNumeric: apr,
      };
    } catch (error) {
      throw new Error(
        `Error retrieving strategy average APR: ${error.message}`,
      );
    }
  },

  /**
   * Get APRs for all strategies (low, medium, high)
   */
  getAllStrategyAprs: async () => {
    try {
      // Get the pool cache service from the registry
      const poolCacheService = serviceRegistry.getService(
        'poolCacheService',
      ) as PoolCacheService;

      if (!poolCacheService) {
        throw new Error('Pool cache service not found in registry');
      }

      // Get APRs for all strategies
      const aprs = await poolCacheService.getAllStrategyAprs();

      return {
        low: `${aprs.low.toFixed(2)}%`,
        medium: `${aprs.medium.toFixed(2)}%`,
        high: `${aprs.high.toFixed(2)}%`,
        // Also include numeric values for possible calculations
        lowNumeric: aprs.low,
        mediumNumeric: aprs.medium,
        highNumeric: aprs.high,
      };
    } catch (error) {
      throw new Error(`Error retrieving all strategy APRs: ${error.message}`);
    }
  },

  /**
   * Get the best pools for a specific strategy with a limit
   */
  getTopPoolsByStrategy: async ({
    strategy,
    limit = 5,
  }: {
    strategy: StrategyKey;
    limit?: number;
  }) => {
    try {
      // Get the pool cache service from the registry
      const poolCacheService = serviceRegistry.getService(
        'poolCacheService',
      ) as PoolCacheService;

      if (!poolCacheService) {
        throw new Error('Pool cache service not found in registry');
      }

      // Validate the strategy parameter
      if (!['low', 'medium', 'high'].includes(strategy)) {
        throw new Error(
          'Invalid strategy. Must be one of: low, medium, high',
        );
      }

      // Validate limit parameter
      if (limit <= 0 || limit > 20) {
        throw new Error('Limit must be between 1 and 20');
      }

      // Get pools for the strategy and take the top N by APR
      const pools = await poolCacheService.getCachedPoolsByStrategy(strategy);
      
      // Sort by APR (descending) and take the top N
      const topPools = pools
        .filter(pool => pool.apr !== null)
        .sort((a, b) => (b.apr || 0) - (a.apr || 0))
        .slice(0, limit)
        .map((pool) => ({
          id: pool.id,
          pairName: `${pool.token0.symbol}/${pool.token1.symbol}`,
          token0: `${pool.token0.symbol} (${pool.token0.name})`,
          token1: `${pool.token1.symbol} (${pool.token1.name})`,
          feeTier: pool.feeTier,
          tvl: `$${Number(pool.totalValueLockedUSD).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
          apr: pool.apr !== null ? `${pool.apr.toFixed(2)}%` : 'N/A',
          volatility: pool.aprStdDev !== null && pool.aprStdDev !== undefined ? pool.aprStdDev.toFixed(2) : 'N/A',
          sharpeRatio: pool.sharpeRatio !== null && pool.sharpeRatio !== undefined ? pool.sharpeRatio.toFixed(2) : 'N/A',
        }));

      return {
        strategy,
        count: topPools.length,
        averageApr: pools
          .filter(pool => pool.apr !== null)
          .reduce((sum, pool) => sum + (pool.apr || 0), 0) / pools.length,
        pools: topPools,
      };
    } catch (error) {
      throw new Error(
        `Error retrieving top pools by strategy: ${error.message}`,
      );
    }
  },
};
