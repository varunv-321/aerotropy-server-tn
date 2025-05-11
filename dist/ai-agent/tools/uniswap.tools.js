"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniswapTools = void 0;
const zod_1 = require("zod");
exports.uniswapTools = [
    {
        name: 'getUniswapPoolsByStrategy',
        description: 'Get Uniswap V3 pools filtered and scored by investment strategy (low, medium, high).',
        parameters: zod_1.z.object({
            network: zod_1.z.string().describe('Blockchain network (e.g., base, mainnet)'),
            strategy: zod_1.z.enum(['low', 'medium', 'high']).describe('Investment strategy risk level'),
            topN: zod_1.z.number().int().optional().describe('Number of pools to return'),
            historyDays: zod_1.z.number().int().optional().describe('Number of days for historical metrics'),
        }),
        async execute({ network, strategy, topN, historyDays }) {
            const params = new URLSearchParams();
            if (topN)
                params.append('topN', topN);
            if (historyDays)
                params.append('historyDays', historyDays);
            const url = `${process.env.UNISWAP_API_BASE_URL || 'http://localhost:3000'}/v1/uniswap/v3/${network}/pools/strategy/${strategy}?${params.toString()}`;
            const response = await fetch(url);
            if (!response.ok)
                throw new Error(`Uniswap API error: ${response.statusText}`);
            return await response.json();
        },
    },
    {
        name: 'getUniswapBestPools',
        description: 'Get the best Uniswap V3 pools by score (APR, TVL, volatility, trend).',
        parameters: zod_1.z.object({
            network: zod_1.z.string().describe('Blockchain network (e.g., base, mainnet)'),
            minTVL: zod_1.z.string().optional().describe('Minimum TVL in USD'),
            minAPR: zod_1.z.string().optional().describe('Minimum APR (%)'),
            topN: zod_1.z.number().int().optional().describe('Number of pools to return'),
            strategy: zod_1.z.enum(['low', 'medium', 'high']).optional().describe('Investment strategy risk level (optional)'),
        }),
        async execute({ network, minTVL, minAPR, topN, strategy }) {
            const params = new URLSearchParams();
            if (minTVL)
                params.append('minTVL', minTVL);
            if (minAPR)
                params.append('minAPR', minAPR);
            if (topN)
                params.append('topN', topN);
            if (strategy)
                params.append('strategy', strategy);
            const url = `${process.env.UNISWAP_API_BASE_URL || 'http://localhost:3000'}/v1/uniswap/v3/${network}/best-pools?${params.toString()}`;
            const response = await fetch(url);
            if (!response.ok)
                throw new Error(`Uniswap API error: ${response.statusText}`);
            return await response.json();
        },
    },
    {
        name: 'getUniswapPoolsWithApr',
        description: 'Get Uniswap V3 pools with calculated APR and historical metrics.',
        parameters: zod_1.z.object({
            network: zod_1.z.string().describe('Blockchain network (e.g., base, mainnet)'),
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
//# sourceMappingURL=uniswap.tools.js.map