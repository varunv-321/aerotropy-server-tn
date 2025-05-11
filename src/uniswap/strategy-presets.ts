// Strategy presets for Uniswap V3 AI Agent

export type StrategyKey = 'low' | 'medium' | 'high';

export interface StrategyPreset {
  key: StrategyKey;
  name: string;
  description: string;
  systemPrompt: string;
}

export const STRATEGY_PRESETS: Record<StrategyKey, StrategyPreset> = {
  low: {
    key: 'low',
    name: 'Low Risk',
    description:
      'Invest in established pools with the highest APR. Focuses on stable, mature pools with proven yield, minimizing exposure to volatility or new, untested pools.',
    systemPrompt:
      'You are an investment agent. Your strategy is to find pools with the highest APR and invest in them.',
  },
  medium: {
    key: 'medium',
    name: 'Medium Risk',
    description:
      'Invest in pools with a positive TVL trend and moderate to high APR, avoiding new or highly volatile pools. Prefer pools with growing liquidity and recent volume spikes.',
    systemPrompt:
      'You are an investment agent. Your strategy is to find Uniswap V3 pools with a positive TVL trend and moderate to high APR, avoiding new or highly volatile pools. Prefer pools with growing liquidity and recent volume spikes.',
  },
  high: {
    key: 'high',
    name: 'High Risk',
    description:
      'Invest in new pools as soon as they are created. New pools can offer high rewards but come with significant risk due to lack of history and potential for high volatility.',
    systemPrompt:
      'You are an investment agent. Your strategy is to monitor for new pools on Uniswap V3 and invest in them as soon as they appear.',
  },
};
