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
  {
    name: 'rebalanceUniswapPortfolio',
    description:
      'Get rebalancing recommendations for Uniswap V3 positions based on current market conditions and selected risk strategy.',
    parameters: z.object({
      network: z
        .string()
        .describe('Blockchain network (e.g., base-mainnet, base-sepolia)'),
      strategy: z
        .enum(['low', 'medium', 'high'])
        .describe('Investment strategy risk level'),
      currentPositions: z
        .array(
          z.object({
            poolId: z.string().describe('Uniswap V3 pool ID'),
            size: z.number().describe('Current position size in USD'),
            priceRange: z
              .object({
                lowerPrice: z.number().describe('Lower bound of price range'),
                upperPrice: z.number().describe('Upper bound of price range'),
              })
              .optional()
              .describe('Current price range of the position'),
            entryDate: z
              .number()
              .optional()
              .describe('Unix timestamp when position was entered'),
          }),
        )
        .describe('Array of current positions to analyze'),
      availableLiquidity: z
        .number()
        .optional()
        .describe('Additional capital available to deploy in USD'),
      minActionThreshold: z
        .number()
        .optional()
        .describe('Minimum change threshold to trigger a rebalance (percent)'),
      maxPositions: z
        .number()
        .optional()
        .describe('Maximum number of positions to maintain'),
    }),
    async execute({
      network,
      strategy,
      currentPositions,
      availableLiquidity,
      minActionThreshold,
      maxPositions,
    }) {
      // Prepare payload according to RebalancePortfolioDto
      const payload = {
        currentPositions,
        availableLiquidity,
        minActionThreshold,
        maxPositions,
      };

      const url = `${process.env.UNISWAP_API_BASE_URL || 'http://localhost:3000'}/v1/uniswap/v3/${network}/rebalance-portfolio/${strategy}`;

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
          `Failed to get rebalancing recommendations: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      // Define types for rebalancing responses to ensure proper type safety
      type PriceRange = { lowerPrice: number; upperPrice: number };

      type RebalanceAction = {
        actionType:
          | 'maintain'
          | 'adjust_range'
          | 'increase_size'
          | 'decrease_size'
          | 'exit_position'
          | 'enter_position';
        poolId: string;
        token0?: string;
        token1?: string;
        currentSize?: number;
        targetSize?: number;
        sizeChangePercent?: number;
        currentPriceRange?: PriceRange;
        recommendedPriceRange?: PriceRange;
        reasonCodes: string[];
        reasons: string[];
        priority: number;
      };

      type RebalanceResult = {
        strategy: string;
        recommendationsCount: number;
        recommendations: RebalanceAction[];
        marketConditions: {
          timestamp: number;
          network: string;
          poolsAnalyzed: number;
        };
      };

      const result = (await response.json()) as RebalanceResult;

      // Add a human-readable summary for the AI to use
      let summaryText = `Portfolio Rebalancing Recommendations (${strategy} risk strategy):
`;

      if (result.recommendations.length === 0) {
        summaryText += '- No rebalancing actions needed at this time.';
      } else {
        // Group by action type for a cleaner summary
        const actionGroups: Record<string, RebalanceAction[]> = {};
        result.recommendations.forEach((rec) => {
          if (!actionGroups[rec.actionType]) {
            actionGroups[rec.actionType] = [];
          }
          actionGroups[rec.actionType].push(rec);
        });

        // Add each group to the summary
        for (const [actionType, recs] of Object.entries(actionGroups)) {
          summaryText += `
${actionType.toUpperCase().replace('_', ' ')} ACTIONS (${recs.length}):
`;

          recs.forEach((rec, i) => {
            const poolSymbols =
              rec.token0 && rec.token1
                ? `${rec.token0}/${rec.token1}`
                : `Pool ${rec.poolId.substring(0, 6)}...`;
            summaryText += `- ${i + 1}. ${poolSymbols}: `;

            if (
              rec.actionType === 'adjust_range' &&
              rec.currentPriceRange &&
              rec.recommendedPriceRange
            ) {
              summaryText += `Adjust range from [${rec.currentPriceRange.lowerPrice.toFixed(4)}-${rec.currentPriceRange.upperPrice.toFixed(4)}] `;
              summaryText += `to [${rec.recommendedPriceRange.lowerPrice.toFixed(4)}-${rec.recommendedPriceRange.upperPrice.toFixed(4)}]`;
            } else if (
              (rec.actionType === 'increase_size' ||
                rec.actionType === 'decrease_size') &&
              rec.currentSize !== undefined &&
              rec.targetSize !== undefined
            ) {
              summaryText += `Change position size from $${rec.currentSize.toFixed(2)} to $${rec.targetSize.toFixed(2)} `;
              if (rec.sizeChangePercent !== undefined) {
                summaryText += `(${rec.sizeChangePercent > 0 ? '+' : ''}${rec.sizeChangePercent}%)`;
              }
            } else if (
              rec.actionType === 'enter_position' &&
              rec.targetSize !== undefined &&
              rec.recommendedPriceRange
            ) {
              summaryText += `New position with $${rec.targetSize.toFixed(2)} in range [${rec.recommendedPriceRange.lowerPrice.toFixed(4)}-${rec.recommendedPriceRange.upperPrice.toFixed(4)}]`;
            } else if (
              rec.actionType === 'exit_position' &&
              rec.currentSize !== undefined
            ) {
              summaryText += `Remove $${rec.currentSize.toFixed(2)} of liquidity`;
            }

            summaryText += ` (Priority: ${rec.priority}/10)
`;
            if (rec.reasons.length > 0) {
              summaryText += `  Reason: ${rec.reasons[0]}
`;
            }
          });
        }
      }

      return {
        ...result,
        summary: summaryText,
      };
    },
  },
];
