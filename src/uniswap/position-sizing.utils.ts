/**
 * Position sizing utilities for Uniswap pool investments
 * Uses Modern Portfolio Theory principles to determine optimal position sizes
 */
import { PoolWithAPR } from './uniswap.service';
import { StrategyPreset } from './strategy-presets';

export interface PositionSize {
  poolId: string;
  percentage: number; // Allocation percentage (0-100)
  targetValueUSD: number; // Target position size in USD
}

export interface PositionSizingOptions {
  totalInvestmentUSD: number; // Total capital available to invest
  maxPositionPercentage?: number; // Maximum percentage of capital for a single position (0-100)
  minPositionUSD?: number; // Minimum position size in USD
  equalWeight?: boolean; // Whether to allocate capital equally
  strategy?: StrategyPreset; // Risk profile to use
}

/**
 * Default position sizing parameters for each risk profile
 */
export const DEFAULT_POSITION_SIZING = {
  low: {
    maxPositionPercentage: 30, // No single position should exceed 30% of portfolio
    minPositionUSD: 500, // Minimum $500 per position
    targetPositions: 4, // Target 4 positions for diversification
    concentrationFactor: 0.7, // How much to concentrate in top pools (0-1)
  },
  medium: {
    maxPositionPercentage: 40, // Allow up to 40% in a single position
    minPositionUSD: 250, // Lower minimum to $250 per position
    targetPositions: 3, // Target 3 positions for balanced approach
    concentrationFactor: 0.8, // Higher concentration in top performers
  },
  high: {
    maxPositionPercentage: 60, // Allow concentration up to 60% in a single position
    minPositionUSD: 100, // Low minimum to allow for experimental positions
    targetPositions: 2, // Target only 2 positions for concentrated bets
    concentrationFactor: 0.9, // Highest concentration in top performers
  },
};

/**
 * Calculate optimal position sizes for a set of pools based on strategy and risk profile
 * @param pools Array of pools with scores
 * @param options Position sizing options
 * @returns Array of position size recommendations
 */
export function calculatePositionSizes(
  pools: PoolWithAPR[],
  options: PositionSizingOptions,
): PositionSize[] {
  const {
    totalInvestmentUSD,
    maxPositionPercentage,
    minPositionUSD = 100,
    equalWeight = false,
    strategy,
  } = options;

  if (!pools.length) return [];
  if (totalInvestmentUSD <= 0) return [];

  // Get risk profile specific parameters
  const riskProfile = strategy?.key || 'medium';
  const profileDefaults = DEFAULT_POSITION_SIZING[riskProfile as keyof typeof DEFAULT_POSITION_SIZING];

  // Determine position limits
  const maxPercent = maxPositionPercentage ?? profileDefaults.maxPositionPercentage;
  const maxPositionUSD = (totalInvestmentUSD * maxPercent) / 100;
  const minPositionValueUSD = Math.max(minPositionUSD, profileDefaults.minPositionUSD);
  const targetCount = Math.min(pools.length, profileDefaults.targetPositions);

  // Sort pools by score if not already sorted
  const sortedPools = [...pools].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Position sizing strategy
  if (equalWeight) {
    // Equal weighting strategy
    const positionCount = Math.min(pools.length, Math.floor(totalInvestmentUSD / minPositionValueUSD));
    const percentPerPosition = Math.min(100 / positionCount, maxPercent);
    const valuePerPosition = (totalInvestmentUSD * percentPerPosition) / 100;

    return sortedPools.slice(0, positionCount).map((pool) => ({
      poolId: pool.id,
      percentage: percentPerPosition,
      targetValueUSD: valuePerPosition,
    }));
  } else {
    // Score-weighted strategy with concentration factor
    const poolsToUse = sortedPools.slice(0, targetCount);
    
    // Get total score for normalization
    const totalScore = poolsToUse.reduce((sum, pool) => sum + (pool.score ?? 0), 0);
    if (totalScore <= 0) {
      // Fallback to equal weighting if scores aren't available
      const percentPerPosition = Math.min(100 / poolsToUse.length, maxPercent);
      return poolsToUse.map((pool) => ({
        poolId: pool.id,
        percentage: percentPerPosition,
        targetValueUSD: (totalInvestmentUSD * percentPerPosition) / 100,
      }));
    }

    // Apply the concentration factor to weight more heavily toward top pools
    const concentrationFactor = profileDefaults.concentrationFactor;
    
    // Calculate initial percentages based on score
    let positions = poolsToUse.map((pool, index) => {
      // Apply concentration factor - earlier indexes get boosted more
      const concentrationMultiplier = 1 + (concentrationFactor * (targetCount - index - 1) / (targetCount - 1));
      const weightedScore = (pool.score ?? 0) * concentrationMultiplier;
      
      return {
        poolId: pool.id,
        score: pool.score ?? 0,
        weightedScore,
        percentage: 0, // Initialize percentage
        targetValueUSD: 0, // Initialize value
      };
    });
    
    // Normalize percentages
    const totalWeightedScore = positions.reduce((sum, pos) => sum + pos.weightedScore, 0);
    positions = positions.map(pos => ({
      ...pos,
      percentage: (pos.weightedScore / totalWeightedScore) * 100
    }));
    
    // Apply maximum position constraint
    let remainingPercent = 100;
    let remainingPositions = positions.length;
    
    // First pass - cap oversized positions
    positions = positions.map(position => {
      if (position.percentage > maxPercent) {
        remainingPercent -= maxPercent;
        remainingPositions--;
        return { ...position, percentage: maxPercent };
      }
      remainingPercent -= position.percentage;
      return position;
    });
    
    // Second pass - redistribute excess to remaining positions proportionally
    if (remainingPercent > 0 && remainingPositions > 0) {
      const uncappedPositions = positions.filter(p => p.percentage < maxPercent);
      const totalUncappedScore = uncappedPositions.reduce((sum, p) => sum + p.weightedScore, 0);
      
      positions = positions.map(position => {
        if (position.percentage < maxPercent) {
          const additionalPercent = remainingPercent * (position.weightedScore / totalUncappedScore);
          return { ...position, percentage: position.percentage + additionalPercent };
        }
        return position;
      });
    }
    
    // Final pass - calculate USD values
    positions = positions.map(position => ({
      ...position,
      targetValueUSD: (totalInvestmentUSD * position.percentage) / 100
    }));
    
    // Filter out positions that are too small
    const sizedPositions = positions.filter(p => p.targetValueUSD >= minPositionValueUSD);
    
    // Return the final position sizing recommendations
    return sizedPositions.map(({ poolId, percentage, targetValueUSD }) => ({
      poolId,
      percentage,
      targetValueUSD,
    }));
  }
}

/**
 * Calculate Kelly Criterion position size based on historical performance
 * This is a more aggressive position sizing method for high-risk profiles
 * @param pool Pool with historical performance data
 * @param totalCapital Total capital available
 * @returns Recommended position size as percentage of capital
 */
export function calculateKellyPositionSize(pool: PoolWithAPR, totalCapital: number): number {
  if (!pool.apr || !pool.aprStdDev || pool.aprStdDev === 0) {
    return 0; // Cannot calculate without valid APR and volatility data
  }
  
  // Use historical APR and volatility to estimate win probability and win/loss ratio
  const edgeRatio = pool.apr / 100; // Convert APR to decimal
  const volatility = pool.aprStdDev / 100; // Convert stdDev to decimal
  
  // Estimate probability of profit based on historical performance
  // This is a simplified model assuming normal distribution
  const probProfit = 0.5 + (edgeRatio / (volatility * Math.sqrt(2 * Math.PI)));
  
  // Simplified Kelly formula: K% = W - [(1-W)/R]
  // Where W is win probability and R is win/loss ratio
  const winLossRatio = edgeRatio / volatility;
  
  // Calculate Kelly percentage (capped at 100%)
  const kellyPercentage = Math.min(
    100,
    Math.max(
      0,
      (probProfit - (1 - probProfit) / winLossRatio) * 100
    )
  );
  
  // Conservative approach: use half-Kelly for more conservative sizing
  return kellyPercentage / 2;
}
