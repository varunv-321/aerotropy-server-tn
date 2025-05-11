export type StrategyKey = 'low' | 'medium' | 'high';
export interface StrategyPreset {
    key: StrategyKey;
    name: string;
    description: string;
    systemPrompt: string;
}
export declare const STRATEGY_PRESETS: Record<StrategyKey, StrategyPreset>;
