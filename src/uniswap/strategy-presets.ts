// Strategy presets for Uniswap V3 AI Agent

export type StrategyKey = 'low' | 'medium' | 'high';

// Define the full interface including scoring parameters
export interface StrategyPreset {
  // Basic information
  key: StrategyKey;
  name: string;
  description: string;
  systemPrompt: string;

  // Pool filtering parameters
  minTVL?: number; // Minimum TVL for pool consideration in USD
  minAPR?: number; // Minimum APR for pool consideration in percentage
  topN?: number; // Number of top pools to return
  maxPoolAgeDays?: number; // Maximum age of pool in days (for new pools)
  preferredFeeTiers?: number[]; // Preferred fee tiers (e.g., 0.05%, 0.3%, 1%) in basis points

  // Token correlation parameters
  minTokenCorrelation?: number; // Minimum correlation coefficient between tokens (0-1)
  maxTokenCorrelation?: number; // Maximum correlation coefficient between tokens (0-1)
  correlationWeight?: number; // Weight for token correlation in scoring
  preferStableCorrelation?: boolean; // Whether to prefer stable pairs (e.g., USDC/USDT)
  preferStableBase?: boolean; // Whether to prefer pairs with one stable (e.g., ETH/USDC)
  avoidExoticPairs?: boolean; // Whether to avoid exotic/low correlation pairs

  // Scoring weights - these should add up to 1.0
  aprWeight?: number; // Weight for APR in score (higher = prioritize APR)
  tvlWeight?: number; // Weight for TVL in score (higher = prioritize large pools)
  volatilityWeight?: number; // Weight for volatility (higher = penalize volatile APR more)
  tvlTrendWeight?: number; // Weight for TVL trend (higher = prioritize growing pools)
  volumeTrendWeight?: number; // Weight for volume trend (higher = prioritize increased usage)

  // Other parameters
  historyDays?: number; // Number of days for historical analysis
}

export const STRATEGY_PRESETS: Record<StrategyKey, StrategyPreset> = {
  low: {
    // Basic information
    key: 'low',
    name: 'Low Risk',
    description:
      'Invest in established pools with the highest APR. Focuses on stable, mature pools with proven yield, minimizing exposure to volatility or new, untested pools. Prioritizes high token correlation and stable pairs.',
    systemPrompt:
      'You are an investment agent. Your strategy is conservative, focusing on established Uniswap V3 pools with proven stability. Look for pools with high Total Value Locked (TVL) and consistent fees. Prioritize pools with lower volatility, even if they have slightly lower APR. Avoid newly created pools and those showing unstable metrics. Prefer pairs with high correlation like stablecoins or ETH/USDC over exotic pairings.',

    // Pool filtering
    minTVL: 500000, // Substantial TVL (500k USD)
    minAPR: 5, // At least 5% APR
    topN: 10, // Return top 10 pools
    preferredFeeTiers: [500, 3000], // Prefer 0.05% and 0.3% fee tiers for stability

    // Token correlation parameters
    minTokenCorrelation: 0.7, // High correlation minimum (stable/correlated pairs)
    correlationWeight: 0.15, // Significant weight on correlation
    preferStableCorrelation: true, // Prefer stable-to-stable pairs (e.g., USDC/USDT)
    preferStableBase: true, // Prefer one stable in pair (e.g., ETH/USDC)
    avoidExoticPairs: true, // Avoid exotic/unusual pairings

    // Scoring weights (total: 1.0)
    aprWeight: 0.2, // Lower weight on APR
    tvlWeight: 0.3, // High weight on TVL (stability)
    volatilityWeight: 0.2, // High penalty for volatility
    tvlTrendWeight: 0.1, // Some weight on TVL trend
    volumeTrendWeight: 0.05, // Low weight on volume trends

    historyDays: 14, // Look at a longer history (2 weeks)
  },
  medium: {
    // Basic information
    key: 'medium',
    name: 'Medium Risk',
    description:
      'Invest in pools with a positive TVL trend and moderate to high APR, avoiding new or highly volatile pools. Prefer pools with growing liquidity and recent volume spikes. Balances token correlation for optimal risk/reward.',
    systemPrompt:
      'You are an investment agent using a balanced strategy. Focus on Uniswap V3 pools with good balance of yield and stability. Look for pools with positive TVL trends and moderate to high APR. Consider volume growth as an important signal, but avoid pools with extreme volatility. You can consider a wider range of token pairs, including those with moderate correlation, but still prefer pairs with at least one major token. This strategy balances risk and reward.',

    // Pool filtering
    minTVL: 100000, // Medium TVL requirement (100k USD)
    minAPR: 10, // Higher APR threshold
    topN: 15, // More options to review
    preferredFeeTiers: [500, 3000, 10000], // Consider all major fee tiers

    // Token correlation parameters
    minTokenCorrelation: 0.4, // Medium correlation minimum
    correlationWeight: 0.1, // Moderate weight on correlation
    preferStableCorrelation: false, // Don't specifically target stable pairs
    preferStableBase: true, // Still prefer one stable in pair (e.g., ETH/USDC)
    avoidExoticPairs: true, // Still avoid completely exotic pairings

    // Scoring weights (total: 1.0)
    aprWeight: 0.3, // Higher weight on APR
    tvlWeight: 0.2, // Moderate importance to TVL
    volatilityWeight: 0.15, // Still penalize volatility but less
    tvlTrendWeight: 0.15, // Higher weight on growth
    volumeTrendWeight: 0.1, // Moderate weight on usage growth

    historyDays: 7, // Look at 1 week of history
  },
  high: {
    // Basic information
    key: 'high',
    name: 'High Risk',
    description:
      'Invest in new pools as soon as they are created. New pools can offer high rewards but come with significant risk due to lack of history and potential for high volatility. Explores exotic token pairs for maximum return potential.',
    systemPrompt:
      'You are an investment agent using an aggressive strategy for Uniswap V3. Seek out new pools with high potential returns. Focus on pools showing rapid growth in volume and liquidity. Prioritize high APR over stability. Look for new token pairs and emerging projects that could generate outsized returns. Consider exotic token combinations and low correlation pairs that might offer outsized returns. This is a high-risk, high-reward approach.',

    // Pool filtering
    minTVL: 5000, // Even lower TVL threshold (5k USD) - Base has emerging projects
    minAPR: 10, // Lowered APR threshold to capture more opportunities on Base
    topN: 20, // More options (including riskier ones)
    maxPoolAgeDays: 30, // Expanded window for Base which has fewer brand new pools
    preferredFeeTiers: [3000, 10000], // Prefer higher fee tiers for more volatile pairs

    // Token correlation parameters
    minTokenCorrelation: 0, // No minimum correlation - consider all pairs
    maxTokenCorrelation: 0.8, // Avoid the most correlated pairs (less opportunity)
    correlationWeight: -0.05, // Slightly prefer less correlated pairs (negative weight)
    preferStableCorrelation: false, // Don't target stable pairs
    preferStableBase: false, // Don't require stable tokens
    avoidExoticPairs: false, // Specifically allow exotic pairings

    // Scoring weights (total: 1.0)
    aprWeight: 0.45, // Heavy emphasis on APR
    tvlWeight: 0.1, // Low importance to TVL size
    volatilityWeight: 0.05, // Almost ignore volatility
    tvlTrendWeight: 0.2, // High importance to growth rate
    volumeTrendWeight: 0.25, // Increased importance to volume growth

    historyDays: 3, // Only look at very recent performance
  },
};
