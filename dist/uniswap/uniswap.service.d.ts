import { GraphqlClientService } from '../graph/graphql-client.service';
interface Token {
    id: string;
    symbol: string;
    name: string;
}
interface PoolDayData {
    date: number;
    feesUSD: string;
    volumeUSD: string;
    tvlUSD: string;
}
interface Pool {
    id: string;
    token0: Token;
    token1: Token;
    feeTier: string;
    totalValueLockedUSD: string;
    poolDayData: PoolDayData[];
}
export interface PoolWithAPR extends Pool {
    apr: number | null;
    averageApr7d?: number | null;
    averageVolume7d?: number | null;
    aprStdDev?: number | null;
    tvlTrend?: number | null;
    volumeTrend?: number | null;
    tvlSlope?: number | null;
    volumeSlope?: number | null;
    score?: number;
    sharpeRatio?: number | null;
}
export declare class UniswapService {
    private readonly graphqlClientService;
    private readonly logger;
    constructor(graphqlClientService: GraphqlClientService);
    getV3PoolsWithAPR(network: string, historyDays?: number): Promise<PoolWithAPR[]>;
    getBestPoolsWithScore(network: string, options?: {
        minTVL?: number;
        minAPR?: number;
        topN?: number;
        aprWeight?: number;
        tvlWeight?: number;
        volatilityWeight?: number;
        tvlTrendWeight?: number;
        volumeTrendWeight?: number;
        historyDays?: number;
    }): Promise<PoolWithAPR[]>;
}
export {};
