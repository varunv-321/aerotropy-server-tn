import { z } from 'zod';

// Uniswap agent tools for Vercel AI SDK + Coinbase AgentKit
// Extend this array to add more endpoints as agent tools
export const uniswapTools = [
  {
    name: 'getUniswapPoolsByStrategy',
    description:
      'Get Uniswap V3 pools filtered and scored by investment strategy (low, medium, high).',
    parameters: z.object({
      network: z.string().describe('Blockchain network (e.g., base, mainnet)'),
      strategy: z
        .enum(['low', 'medium', 'high'])
        .describe('Investment strategy risk level'),
      topN: z.number().int().optional().describe('Number of pools to return'),
      historyDays: z
        .number()
        .int()
        .optional()
        .describe('Number of days for historical metrics'),
    }),
    async execute({ network, strategy, topN, historyDays }) {
      const params = new URLSearchParams();
      if (topN) params.append('topN', topN);
      if (historyDays) params.append('historyDays', historyDays);
      const url = `${process.env.UNISWAP_API_BASE_URL || 'http://localhost:3000'}/v1/uniswap/v3/${network}/pools/strategy/${strategy}?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`Uniswap API error: ${response.statusText}`);
      return await response.json();
    },
  },
  {
    name: 'getUniswapBestPools',
    description:
      'Get the best Uniswap V3 pools by score (APR, TVL, volatility, trend).',
    parameters: z.object({
      network: z.string().describe('Blockchain network (e.g., base, mainnet)'),
      minTVL: z.string().optional().describe('Minimum TVL in USD'),
      minAPR: z.string().optional().describe('Minimum APR (%)'),
      topN: z.number().int().optional().describe('Number of pools to return'),
      strategy: z
        .enum(['low', 'medium', 'high'])
        .optional()
        .describe('Investment strategy risk level (optional)'),
    }),
    async execute({ network, minTVL, minAPR, topN, strategy }) {
      const params = new URLSearchParams();
      if (minTVL) params.append('minTVL', minTVL);
      if (minAPR) params.append('minAPR', minAPR);
      if (topN) params.append('topN', topN);
      if (strategy) params.append('strategy', strategy);
      const url = `${process.env.UNISWAP_API_BASE_URL || 'http://localhost:3000'}/v1/uniswap/v3/${network}/best-pools?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`Uniswap API error: ${response.statusText}`);
      return await response.json();
    },
  },
  {
    name: 'getUniswapPoolsWithApr',
    description:
      'Get Uniswap V3 pools with calculated APR and historical metrics.',
    parameters: z.object({
      network: z.string().describe('Blockchain network (e.g., base, mainnet)'),
    }),
    async execute({ network }) {
      const url = `${process.env.UNISWAP_API_BASE_URL || 'http://localhost:3000'}/v1/uniswap/v3/${network}/pools-with-apr`;
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`Uniswap API error: ${response.statusText}`);
      return await response.json();
    },
  },
  {
    name: 'mintUniswapPosition',
    description: 'Mint a new Uniswap V3 liquidity position (invest in a pool).',
    parameters: z.object({
      network: z
        .string()
        .describe('Blockchain network (e.g., base-mainnet, base-sepolia)'),
      poolData: z
        .object({
          id: z.string().describe('Pool address'),
          feeTier: z
            .string()
            .describe(
              'Fee tier as string (e.g., "100", "500", "3000", "10000")',
            ),
          token0: z
            .object({
              id: z.string().describe('Token0 address'),
              symbol: z.string().describe('Token0 symbol'),
              name: z.string().describe('Token0 name'),
              decimals: z.string().describe('Token0 decimals as string'),
            })
            .describe('Token0 data'),
          token1: z
            .object({
              id: z.string().describe('Token1 address'),
              symbol: z.string().describe('Token1 symbol'),
              name: z.string().describe('Token1 name'),
              decimals: z.string().describe('Token1 decimals as string'),
            })
            .describe('Token1 data'),
        })
        .describe('Pool data from a graph query or previous pool search'),
      amount0: z
        .string()
        .describe('Amount of token0 to add (in human-readable format)'),
      amount1: z
        .string()
        .describe('Amount of token1 to add (in human-readable format)'),
      tickLowerOffset: z
        .number()
        .int()
        .min(1)
        .default(1000)
        .describe('Offset from the current tick for the lower bound'),
      tickUpperOffset: z
        .number()
        .int()
        .min(1)
        .default(1000)
        .describe('Offset from the current tick for the upper bound'),
      slippageTolerance: z
        .number()
        .min(0)
        .max(100)
        .default(0.5)
        .describe('Slippage tolerance in percentage'),
    }),
    async execute({
      network,
      poolData,
      amount0,
      amount1,
      tickLowerOffset,
      tickUpperOffset,
      slippageTolerance,
    }) {
      // The payload needs to match MintPositionDto
      const payload = {
        poolData,
        amount0,
        amount1,
        tickLowerOffset,
        tickUpperOffset,
        network,
        slippageTolerance,
      };

      const url = `${process.env.UNISWAP_API_BASE_URL || 'http://localhost:3000'}/v1/uniswap/v3/${network}/mint-position`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to mint position: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      return await response.json(); // Returns { tokenId: string }
    },
  },
  {
    name: 'removeUniswapPosition',
    description:
      'Remove liquidity from a Uniswap V3 position and optionally burn the NFT.',
    parameters: z.object({
      network: z
        .string()
        .describe('Blockchain network (e.g., base-mainnet, base-sepolia)'),
      tokenId: z
        .string()
        .describe('The NFT token ID of the position to remove liquidity from'),
      burnNFT: z
        .boolean()
        .default(false)
        .describe('Whether to burn the NFT position after removing liquidity'),
      slippageTolerance: z
        .number()
        .min(0)
        .max(100)
        .default(0.5)
        .describe('Slippage tolerance in percentage'),
    }),
    async execute({ network, tokenId, burnNFT, slippageTolerance }) {
      // The payload needs to match RemovePositionDto
      const payload = {
        tokenId,
        network,
        burnNFT,
        slippageTolerance,
      };

      const url = `${process.env.UNISWAP_API_BASE_URL || 'http://localhost:3000'}/v1/uniswap/v3/${network}/remove-position`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to remove position: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const result = await response.json();
      return {
        ...result,
        summary:
          `Successfully removed liquidity from position ${tokenId}:
` +
          `- Amount of token0 removed: ${result.amount0Removed}
` +
          `- Amount of token1 removed: ${result.amount1Removed}
` +
          `- Position NFT ${result.positionBurned ? 'was burned' : 'remains intact'}`,
      };
    },
  },
];
