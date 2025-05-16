import { z } from 'zod';
import { tool } from 'ai';
import { getDashboardService } from './service-registry';

/**
 * Tools related to dashboard functionality for querying pool and token balances
 */
export const dashboardTools = {
  /**
   * Get user balances across all pools
   */
  getUserBalances: tool({
    description:
      'Get token balances for a wallet across all pools. Use this when the user asks about their token holdings across all pools or their total portfolio value.',
    parameters: z.object({
      walletAddress: z.string().describe('Ethereum wallet address'),
    }),
    execute: async ({ walletAddress }) => {
      // Get the dashboard service from the registry
      const dashboardService = getDashboardService();
      if (!dashboardService) {
        console.error('Dashboard service not found in tool context');
        return {
          success: false,
          error: 'Dashboard service not available',
        };
      }
      try {
        // Format the wallet address to ensure it has the 0x prefix
        const formattedAddress = walletAddress.startsWith('0x')
          ? walletAddress
          : `0x${walletAddress}`;

        const balances =
          await dashboardService.getUserBalances(formattedAddress);

        // Extract relevant data for a cleaner response
        const formattedData = balances.map((pool) => ({
          poolName: pool.pool.name,
          tokens: pool.tokenBalances.map((token) => ({
            symbol: token.token.symbol,
            balance: token.balance,
            formattedBalance: token.formattedBalance,
            valueUSD: token.valueUSD,
          })),
          totalValueUSD: pool.totalValueUSD,
        }));

        return { success: true, balances: formattedData };
      } catch (error) {
        console.error('Error getting user balances:', error);
        return {
          success: false,
          error: `Failed to retrieve token balances: ${error.message}`,
        };
      }
    },
  }),

  /**
   * Get user balances for a specific pool
   */
  getUserPoolBalance: tool({
    description:
      'Get token balances for a wallet in a specific pool. Use this when the user asks about their tokens in a specific pool.',
    parameters: z.object({
      walletAddress: z.string().describe('Ethereum wallet address'),
      poolIndex: z
        .number()
        .optional()
        .describe('Pool index (0: High Growth, 1: Balanced, 2: Stable)'),
    }),
    execute: async ({ walletAddress, poolIndex = 0 }) => {
      // Get the dashboard service from the registry
      const dashboardService = getDashboardService();
      if (!dashboardService) {
        console.error('Dashboard service not found in tool context');
        return {
          success: false,
          error: 'Dashboard service not available',
        };
      }
      try {
        // Format the wallet address to ensure it has the 0x prefix
        const formattedAddress = walletAddress.startsWith('0x')
          ? walletAddress
          : `0x${walletAddress}`;

        // Import pools from constants
        const { POOLS } = await import('../../common/utils/pool.constants');

        if (poolIndex < 0 || poolIndex >= POOLS.length) {
          return {
            success: false,
            error: `Invalid pool index. Must be between 0 and ${POOLS.length - 1}`,
          };
        }

        const pool = POOLS[poolIndex];
        const poolBalance = await dashboardService.getUserPoolBalance(
          formattedAddress,
          pool,
        );

        // Extract relevant data for a cleaner response
        const formattedData = {
          poolName: poolBalance.pool.name,
          tokens: poolBalance.tokenBalances.map((token) => ({
            symbol: token.token.symbol,
            balance: token.balance,
            formattedBalance: token.formattedBalance,
            valueUSD: token.valueUSD,
          })),
          totalValueUSD: poolBalance.totalValueUSD,
        };

        return { success: true, poolBalance: formattedData };
      } catch (error) {
        console.error('Error getting pool balance:', error);
        return {
          success: false,
          error: `Failed to retrieve pool balance: ${error.message}`,
        };
      }
    },
  }),

  /**
   * Get token supplies across all pools
   */
  getPoolTokenSupplies: tool({
    description:
      'Get total token supplies across all pools. Use this when the user asks about total liquidity in pools, pool sizes, or how much of each token is in each pool.',
    parameters: z.object({}), // Empty parameters object since this tool doesn't require any inputs
    execute: async () => {
      // Get the dashboard service from the registry
      const dashboardService = getDashboardService();
      if (!dashboardService) {
        console.error('Dashboard service not found in tool context');
        return {
          success: false,
          error: 'Dashboard service not available',
        };
      }
      try {
        const poolSupplies = await dashboardService.getPoolTokenSupplies();

        // Extract relevant data for a cleaner response
        const formattedData = poolSupplies.map((pool) => ({
          poolName: pool.pool.name,
          tokens: pool.tokenSupplies.map((token) => ({
            symbol: token.token.symbol,
            totalSupply: token.totalSupply,
            formattedSupply: token.formattedSupply,
            valueUSD: token.valueUSD,
          })),
          totalValueUSD: pool.totalValueUSD,
          apr: pool.apr !== undefined ? `${pool.apr.toFixed(2)}%` : 'Unknown',
        }));

        return { success: true, poolSupplies: formattedData };
      } catch (error) {
        console.error('Error getting pool token supplies:', error);
        return { success: false, error: error.message };
      }
    },
  }),

  /**
   * Get token supplies for a specific pool
   */
  getPoolTokenSupply: tool({
    description:
      'Get token supplies for a specific pool. Use this when the user asks about the size of a specific pool or how much of each token is in a specific pool.',
    parameters: z.object({
      poolIndex: z
        .number()
        .describe('Index of the pool (0: High Growth, 1: Balanced, 2: Stable)'),
    }),
    execute: async ({ poolIndex }) => {
      // Get the dashboard service from the registry
      const dashboardService = getDashboardService();
      if (!dashboardService) {
        console.error('Dashboard service not found in tool context');
        return {
          success: false,
          error: 'Dashboard service not available',
        };
      }
      try {
        // Import pools from constants
        const { POOLS } = await import('../../common/utils/pool.constants');

        if (poolIndex < 0 || poolIndex >= POOLS.length) {
          return {
            success: false,
            error: `Invalid pool index. Must be between 0 and ${POOLS.length - 1}`,
          };
        }

        const pool = POOLS[poolIndex];
        const poolSupply = await dashboardService.getPoolTokenSupply(pool);

        // Format the response for cleaner output
        const formattedData = {
          poolName: poolSupply.pool.name,
          tokens: poolSupply.tokenSupplies.map((token) => ({
            symbol: token.token.symbol,
            totalSupply: token.totalSupply,
            formattedSupply: token.formattedSupply,
            valueUSD: token.valueUSD,
          })),
          totalValueUSD: poolSupply.totalValueUSD,
          apr:
            poolSupply.apr !== undefined
              ? `${poolSupply.apr.toFixed(2)}%`
              : 'Unknown',
        };

        return { success: true, poolSupply: formattedData };
      } catch (error) {
        console.error('Error getting pool token supply:', error);
        return { success: false, error: error.message };
      }
    },
  }),
};
