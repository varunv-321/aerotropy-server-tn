import { serviceRegistry } from './service-registry';
import { PoolCacheService } from '../../uniswap/pool-cache.service';
import { StrategyKey } from '../../uniswap/strategy-presets';
import { z } from 'zod';
import { tool } from 'ai';

/**
 * Tools for retrieving cached pool data and APR information
 * These are made available to the AI agent for quick access
 * to precomputed pool data by strategy risk profile
 */
export const poolCacheTools = {
  /**
   * Get pools by strategy risk profile from cache
   */
  getCachedPoolsByStrategy: tool({
    description:
      'Get pools filtered by risk strategy (low, medium, high) from cache',
    parameters: z.object({
      strategy: z.enum(['low', 'medium', 'high']),
    }),
    execute: async ({ strategy }) => {
      try {
        // Get the pool cache service from the registry
        const poolCacheService = serviceRegistry.getService(
          'poolCacheService',
        ) as PoolCacheService;

        if (!poolCacheService) {
          throw new Error('Pool cache service not found in registry');
        }

        // Get pools from cache for the specified strategy
        const pools = await poolCacheService.getCachedPoolsByStrategy(
          strategy as StrategyKey,
        );

        // Return a simplified version with key information for the AI
        return pools.map((pool) => ({
          id: pool.id,
          token0: `${pool.token0.symbol} (${pool.token0.name})`,
          token1: `${pool.token1.symbol} (${pool.token1.name})`,
          feeTier: pool.feeTier,
          tvl: pool.totalValueLockedUSD,
          apr: pool.apr !== null ? `${pool.apr.toFixed(2)}%` : 'N/A',
          volatility:
            pool.aprStdDev !== null && pool.aprStdDev !== undefined
              ? pool.aprStdDev.toFixed(2)
              : 'N/A',
          sharpeRatio:
            pool.sharpeRatio !== null && pool.sharpeRatio !== undefined
              ? pool.sharpeRatio.toFixed(2)
              : 'N/A',
        }));
      } catch (error) {
        throw new Error(
          `Error retrieving cached pools by strategy: ${error.message}`,
        );
      }
    },
  }),

  /**
   * Get the average APR for a specific strategy risk profile
   */
  getStrategyAverageApr: tool({
    description: 'Get average APR for a specific risk strategy from cache',
    parameters: z.object({
      strategy: z.enum(['low', 'medium', 'high']),
    }),
    execute: async ({ strategy }) => {
      try {
        // Get the pool cache service from the registry
        const poolCacheService = serviceRegistry.getService(
          'poolCacheService',
        ) as PoolCacheService;

        if (!poolCacheService) {
          throw new Error('Pool cache service not found in registry');
        }

        // Get average APR for the specified strategy
        const apr = await poolCacheService.getAverageAprByStrategy(
          strategy as StrategyKey,
        );

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
  }),

  /**
   * Get APRs for all strategies (low, medium, high)
   */
  getAllStrategyAprs: tool({
    description:
      'Get APRs for all risk strategies (low, medium, high) from cache',
    parameters: z.object({}),
    execute: async () => {
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
  }),

  /**
   * Get the best pools for a specific strategy with a limit
   */
  getTopPoolsByStrategy: tool({
    description:
      'Get top-performing pools for a specific risk strategy from cache',
    parameters: z.object({
      strategy: z.enum(['low', 'medium', 'high']),
      limit: z.number().min(1).max(20).optional().default(5),
    }),
    execute: async ({ strategy, limit = 5 }) => {
      try {
        // Get the pool cache service from the registry
        const poolCacheService = serviceRegistry.getService(
          'poolCacheService',
        ) as PoolCacheService;

        if (!poolCacheService) {
          throw new Error('Pool cache service not found in registry');
        }

        // Get pools for the strategy and take the top N by APR
        const pools = await poolCacheService.getCachedPoolsByStrategy(
          strategy as StrategyKey,
        );

        // Sort by APR (descending) and take the top N
        const topPools = pools
          .filter((pool) => pool.apr !== null)
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
            volatility:
              pool.aprStdDev !== null && pool.aprStdDev !== undefined
                ? pool.aprStdDev.toFixed(2)
                : 'N/A',
            sharpeRatio:
              pool.sharpeRatio !== null && pool.sharpeRatio !== undefined
                ? pool.sharpeRatio.toFixed(2)
                : 'N/A',
          }));

        return {
          strategy,
          count: topPools.length,
          averageApr:
            pools
              .filter((pool) => pool.apr !== null)
              .reduce((sum, pool) => sum + (pool.apr || 0), 0) / pools.length,
          pools: topPools,
        };
      } catch (error) {
        throw new Error(
          `Error retrieving top pools by strategy: ${error.message}`,
        );
      }
    },
  }),
  
  /**
   * Get a comprehensive summary of all pool strategies and their top pools
   */
  getComprehensivePoolSummary: tool({
    description:
      'Get a comprehensive summary of all pool strategies (low, medium, high) and their top pools in a single call',
    parameters: z.object({
      topN: z.number().min(1).max(10).optional().default(5)
    }),
    execute: async ({ topN = 5 }) => {
      try {
        // Get the pool cache service from the registry
        const poolCacheService = serviceRegistry.getService(
          'poolCacheService',
        ) as PoolCacheService;

        if (!poolCacheService) {
          throw new Error('Pool cache service not found in registry');
        }

        // Make a request to the pool cache service's summary endpoint
        const summary = await poolCacheService.getPoolSummary(topN);
       
        return {
          strategies: {
            low: {
              name: summary.strategies.low.name,
              description: summary.strategies.low.description,
              riskLevel: summary.strategies.low.riskLevel,
              averageApr: `${summary.strategies.low.averageApr.toFixed(2)}%`,
              poolCount: summary.strategies.low.poolCount,
              topPools: summary.strategies.low.topPools.map(formatPoolForAI),
            },
            medium: {
              name: summary.strategies.medium.name,
              description: summary.strategies.medium.description,
              riskLevel: summary.strategies.medium.riskLevel,
              averageApr: `${summary.strategies.medium.averageApr.toFixed(2)}%`,
              poolCount: summary.strategies.medium.poolCount,
              topPools: summary.strategies.medium.topPools.map(formatPoolForAI),
            },
            high: {
              name: summary.strategies.high.name,
              description: summary.strategies.high.description,
              riskLevel: summary.strategies.high.riskLevel,
              averageApr: `${summary.strategies.high.averageApr.toFixed(2)}%`,
              poolCount: summary.strategies.high.poolCount,
              topPools: summary.strategies.high.topPools.map(formatPoolForAI),
            },
          },
          lastUpdated: summary.lastUpdated,
        };
      } catch (error) {
        throw new Error(
          `Error retrieving comprehensive pool summary: ${error.message}`,
        );
      }
    },
  }),
};

// Helper function to format pool data for AI output
function formatPoolForAI(pool: any) {
  return {
    pairName: `${pool.token0.symbol}/${pool.token1.symbol}`,
    apr: pool.apr !== null ? `${pool.apr.toFixed(2)}%` : 'N/A',
    tvl: typeof pool.tvl === 'string' 
      ? `$${Number(pool.tvl).toLocaleString(undefined, { maximumFractionDigits: 2 })}` 
      : 'N/A',
    volatility: pool.volatility !== undefined ? pool.volatility.toFixed(2) : 'N/A',
    sharpeRatio: pool.sharpeRatio !== undefined ? pool.sharpeRatio.toFixed(2) : 'N/A',
    volume7d: pool.volume7d 
      ? `$${Number(pool.volume7d).toLocaleString(undefined, { maximumFractionDigits: 2 })}` 
      : 'N/A',
  };
}
