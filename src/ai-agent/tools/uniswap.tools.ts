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
      strategy: z.enum(['low', 'medium', 'high']).describe('Investment strategy risk level'),
      topN: z.number().int().optional().describe('Number of pools to return'),
      historyDays: z.number().int().optional().describe('Number of days for historical metrics'),
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
      strategy: z.enum(['low', 'medium', 'high']).optional().describe('Investment strategy risk level (optional)'),
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
];
