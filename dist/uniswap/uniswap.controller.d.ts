import { UniswapService, PoolWithAPR } from './uniswap.service';
import { StrategyKey } from './strategy-presets';
export declare class UniswapController {
    private readonly uniswapService;
    private readonly logger;
    constructor(uniswapService: UniswapService);
    getPoolsWithAPR(network: string): Promise<PoolWithAPR[]>;
    getBestPools(network: string, minTVL?: string, minAPR?: string, topN?: string, aprWeight?: string, tvlWeight?: string, volatilityWeight?: string, tvlTrendWeight?: string, volumeTrendWeight?: string, historyDays?: string, strategy?: string): Promise<PoolWithAPR[]>;
    getPoolsByStrategy(network: string, strategy: StrategyKey, topN?: string, historyDays?: string): Promise<PoolWithAPR[]>;
}
