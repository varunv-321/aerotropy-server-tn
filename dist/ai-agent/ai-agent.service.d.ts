import { StrategyKey } from '../uniswap/strategy-presets';
export declare class AiAgentService {
    private agentKit;
    private tools;
    private readonly logger;
    private ensureInitialized;
    chat({ prompt, system, maxSteps, strategy, }: {
        prompt: string;
        system?: string;
        maxSteps?: number;
        strategy?: StrategyKey;
    }): Promise<string>;
}
