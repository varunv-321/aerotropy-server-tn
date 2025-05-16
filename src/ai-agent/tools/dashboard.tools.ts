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
};
