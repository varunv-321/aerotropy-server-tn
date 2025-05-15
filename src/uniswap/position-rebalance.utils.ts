/**
 * Position rebalancing utilities for Uniswap V3 pools
 * Helps determine when positions need adjustment and provides rebalancing recommendations
 */
import { PoolWithAPR } from './uniswap.service';
import { StrategyPreset } from './strategy-presets';

// Types of rebalancing actions
export enum RebalanceActionType {
  MAINTAIN = 'maintain', // No action needed
  ADJUST_RANGE = 'adjust_range', // Update price range but maintain position size
  INCREASE_SIZE = 'increase_size', // Add more liquidity to the position
  DECREASE_SIZE = 'decrease_size', // Remove some liquidity from the position
  EXIT_POSITION = 'exit_position', // Fully exit the position
  ENTER_POSITION = 'enter_position', // Add a new position to the portfolio
}

export interface PriceRange {
  lowerPrice: number; // Lower bound of price range
  upperPrice: number; // Upper bound of price range
}

export interface RebalanceAction {
  actionType: RebalanceActionType;
  poolId: string;
  token0?: string;
  token1?: string;
  feeTier?: string;
  currentSize?: number; // Current position size in USD
  targetSize?: number; // Target position size in USD
  sizeChangePercent?: number; // Change in size as percentage
  currentPriceRange?: PriceRange; // Current price range
  recommendedPriceRange?: PriceRange; // Recommended new price range
  reasonCodes: string[]; // Codes explaining the reason for rebalance
  reasons: string[]; // Human-readable explanations
  priority: number; // 1-10 scale, 10 being highest priority
}

export interface PositionRebalanceOptions {
  strategy?: StrategyPreset;
  currentPositions: {
    poolId: string;
    size: number; // Position size in USD
    priceRange?: PriceRange;
    entryDate?: number; // Unix timestamp when position was entered
  }[];
  availableLiquidity?: number; // Additional capital available to deploy
  minActionThreshold?: number; // Minimum change threshold to trigger a rebalance (percent)
  maxPositions?: number; // Maximum number of positions to maintain
}

// Reason codes for position rebalancing
export const REBALANCE_REASONS = {
  PRICE_DRIFT: 'price_drift', // Current price has drifted too far from position range
  APR_DECLINE: 'apr_decline', // Pool APR has significantly decreased
  APR_INCREASE: 'apr_increase', // Pool APR has significantly increased
  VOLATILITY_CHANGE: 'volatility_change', // Pool volatility profile has changed
  CORRELATION_CHANGE: 'correlation_change', // Token correlation has changed
  NEW_OPPORTUNITY: 'new_opportunity', // Better opportunities available
  POOL_TVL_DECLINE: 'pool_tvl_decline', // Pool TVL has significantly declined
  RANGE_INEFFICIENCY: 'range_inefficiency', // Position range is inefficient
  PORTFOLIO_IMBALANCE: 'portfolio_imbalance', // Portfolio allocation is suboptimal
  FEE_ACCUMULATION: 'fee_accumulation', // Significant fees have accumulated
  AGE_THRESHOLD: 'age_threshold', // Position has been held beyond optimal period
};

/**
 * Calculate optimal price range based on historical volatility and strategy risk profile
 * @param pool Pool data with historical information
 * @param currentPrice Current token price
 * @param strategy Strategy risk profile
 * @returns Recommended price range
 */
export function calculateOptimalPriceRange(
  pool: PoolWithAPR,
  currentPrice: number,
  strategy?: StrategyPreset,
): PriceRange {
  // Default values if strategy not provided
  const riskProfile = strategy?.key || 'medium';
  
  // Range width based on volatility and risk profile
  const volatility = pool.aprStdDev ? pool.aprStdDev / 100 : 0.05; // Default to 5% if not available
  
  // Different width multipliers based on risk profile
  const widthMultipliers = {
    low: 4.0, // Wide range for low risk (less active management)
    medium: 2.5, // Balanced range
    high: 1.5, // Narrow range for high risk (higher fee capture, more active management)
  };
  
  const multiplier = widthMultipliers[riskProfile as keyof typeof widthMultipliers];
  const rangeWidth = volatility * multiplier;
  
  // Calculate range bounds - centered around current price for simplicity
  // In a more advanced implementation, this would account for price trends
  const lowerPrice = currentPrice * (1 - rangeWidth);
  const upperPrice = currentPrice * (1 + rangeWidth);
  
  return { lowerPrice, upperPrice };
}

/**
 * Determine if a position needs range adjustment based on price movement
 * @param currentPriceRange Current position price range
 * @param optimalPriceRange Optimal price range based on current conditions
 * @param currentPrice Current token price
 * @param minThresholdPercent Minimum difference threshold to trigger rebalance
 * @returns Whether position range needs adjustment
 */
export function needsRangeAdjustment(
  currentPriceRange: PriceRange,
  optimalPriceRange: PriceRange,
  currentPrice: number,
  minThresholdPercent = 15, // Default 15% difference threshold
): boolean {
  // Check if current price is near boundaries of current range
  const currentLower = currentPriceRange.lowerPrice;
  const currentUpper = currentPriceRange.upperPrice;
  const currentWidth = currentUpper - currentLower;
  
  const optimalLower = optimalPriceRange.lowerPrice;
  const optimalUpper = optimalPriceRange.upperPrice;
  const optimalWidth = optimalUpper - optimalLower;
  
  // Calculate percentage difference in ranges
  const lowerDiffPercent = Math.abs((optimalLower - currentLower) / currentLower * 100);
  const upperDiffPercent = Math.abs((optimalUpper - currentUpper) / currentUpper * 100);
  const widthDiffPercent = Math.abs((optimalWidth - currentWidth) / currentWidth * 100);
  
  // Check if price is getting close to range boundary (within 20% of the range)
  const priceProximityToLower = (currentPrice - currentLower) / currentWidth;
  const priceProximityToUpper = (currentUpper - currentPrice) / currentWidth;
  const isNearBoundary = priceProximityToLower < 0.2 || priceProximityToUpper < 0.2;
  
  // Need adjustment if range significantly different or price near boundary
  return (
    lowerDiffPercent > minThresholdPercent ||
    upperDiffPercent > minThresholdPercent ||
    widthDiffPercent > minThresholdPercent ||
    isNearBoundary
  );
}

/**
 * Generate rebalancing recommendations for a portfolio of Uniswap V3 positions
 * @param currentPools Current pool data for existing and potential positions
 * @param options Rebalancing options
 * @returns Array of recommended rebalancing actions
 */
export function generateRebalanceRecommendations(
  currentPools: PoolWithAPR[],
  options: PositionRebalanceOptions,
): RebalanceAction[] {
  const {
    strategy,
    currentPositions,
    availableLiquidity = 0,
    minActionThreshold = 10, // 10% default threshold for changes
    maxPositions = currentPositions.length,
  } = options;
  
  const riskProfile = strategy?.key || 'medium';
  const actions: RebalanceAction[] = [];
  
  // Create lookup map for pools
  const poolsMap = new Map<string, PoolWithAPR>();
  currentPools.forEach(pool => poolsMap.set(pool.id, pool));
  
  // Track total portfolio value
  const totalPortfolioValue = currentPositions.reduce(
    (sum, position) => sum + position.size,
    0
  ) + availableLiquidity;
  
  // Step 1: Analyze existing positions for rebalance needs
  for (const position of currentPositions) {
    const pool = poolsMap.get(position.poolId);
    if (!pool) {
      // Pool data not available, recommend exit due to lack of data
      actions.push({
        actionType: RebalanceActionType.EXIT_POSITION,
        poolId: position.poolId,
        currentSize: position.size,
        targetSize: 0,
        sizeChangePercent: -100,
        reasonCodes: [REBALANCE_REASONS.POOL_TVL_DECLINE],
        reasons: ['Pool data not available, possible liquidity issues'],
        priority: 9,
      });
      continue;
    }
    
    // Mock current price for demonstration
    // In a real implementation, this would come from an oracle or price feed
    const currentPrice = 1.0; // Placeholder, assume 1:1 for now
    
    // Calculate APR change (if historical data available)
    // For now, just use a mock deviation for demonstration
    const aprChangePercent = 0; // Placeholder
    
    // Check if position still aligns with our strategy
    const optimalPriceRange = calculateOptimalPriceRange(pool, currentPrice, strategy);
    
    // Variables to track reasons and priority
    const reasons: string[] = [];
    const reasonCodes: string[] = [];
    let priority = 1; // Default low priority
    
    // Determine if range adjustment needed
    let rangeAdjustmentNeeded = false;
    if (position.priceRange) {
      rangeAdjustmentNeeded = needsRangeAdjustment(
        position.priceRange,
        optimalPriceRange,
        currentPrice,
        minActionThreshold,
      );
      
      if (rangeAdjustmentNeeded) {
        reasonCodes.push(REBALANCE_REASONS.RANGE_INEFFICIENCY);
        reasons.push('Position range is no longer optimal for current market conditions');
        priority = Math.max(priority, 7);
      }
    }
    
    // Check APR changes
    if (Math.abs(aprChangePercent) > minActionThreshold) {
      if (aprChangePercent < 0) {
        reasonCodes.push(REBALANCE_REASONS.APR_DECLINE);
        reasons.push(`Pool APR has declined by ${Math.abs(aprChangePercent).toFixed(1)}%`);
        priority = Math.max(priority, 6);
      } else {
        reasonCodes.push(REBALANCE_REASONS.APR_INCREASE);
        reasons.push(`Pool APR has increased by ${aprChangePercent.toFixed(1)}%`);
        // Increase priority, but not as high as a decline
        priority = Math.max(priority, 4);
      }
    }
    
    // Determine position size adjustment based on risk profile and pool performance
    let sizeAdjustmentPercent = 0;
    let actionType = RebalanceActionType.MAINTAIN;
    
    // Factor in correlation score if available
    if (pool.correlation !== undefined) {
      // Different correlation thresholds based on risk profile
      const correlationThresholds = {
        low: 0.7, // High correlation required for low risk
        medium: 0.4, // Moderate correlation for medium risk
        high: 0.0, // No minimum correlation for high risk
      };
      
      const threshold = correlationThresholds[riskProfile as keyof typeof correlationThresholds];
      
      // If correlation doesn't meet threshold, consider reducing position
      if (pool.correlation < threshold) {
        reasonCodes.push(REBALANCE_REASONS.CORRELATION_CHANGE);
        reasons.push(`Token correlation (${pool.correlation.toFixed(2)}) below threshold for ${riskProfile} risk profile`);
        sizeAdjustmentPercent -= 50; // Reduce position by 50%
        priority = Math.max(priority, 8);
      }
    }
    
    // If APR is negative or very low compared to other options, consider exit
    if (pool.apr !== null && pool.apr < 5) { // Assuming 5% APR as minimum viable return
      reasonCodes.push(REBALANCE_REASONS.APR_DECLINE);
      reasons.push(`Pool APR (${pool.apr.toFixed(1)}%) is below minimum threshold`);
      sizeAdjustmentPercent -= 100; // Exit completely
      priority = Math.max(priority, 9);
    }
    
    // Determine action type based on size adjustment and range adjustment
    if (sizeAdjustmentPercent <= -100) {
      actionType = RebalanceActionType.EXIT_POSITION;
    } else if (sizeAdjustmentPercent < 0) {
      actionType = RebalanceActionType.DECREASE_SIZE;
    } else if (sizeAdjustmentPercent > 0) {
      actionType = RebalanceActionType.INCREASE_SIZE;
    } else if (rangeAdjustmentNeeded) {
      actionType = RebalanceActionType.ADJUST_RANGE;
    } else {
      actionType = RebalanceActionType.MAINTAIN;
    }
    
    // If no action needed, skip adding to results
    if (actionType === RebalanceActionType.MAINTAIN) {
      continue;
    }
    
    // Calculate target size
    const targetSize = Math.max(
      0,
      position.size * (1 + sizeAdjustmentPercent / 100)
    );
    
    actions.push({
      actionType,
      poolId: position.poolId,
      token0: pool.token0.symbol,
      token1: pool.token1.symbol,
      feeTier: pool.feeTier,
      currentSize: position.size,
      targetSize,
      sizeChangePercent: sizeAdjustmentPercent,
      currentPriceRange: position.priceRange,
      recommendedPriceRange: optimalPriceRange,
      reasonCodes,
      reasons,
      priority,
    });
  }
  
  // Step 2: Identify new opportunities if there's available liquidity
  if (availableLiquidity > 0 && currentPositions.length < maxPositions) {
    // Find best pools not already in the portfolio
    const existingPoolIds = new Set(currentPositions.map(p => p.poolId));
    const newPoolCandidates = currentPools
      .filter(pool => !existingPoolIds.has(pool.id))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    
    // Number of new positions to add
    const slotsAvailable = maxPositions - currentPositions.length;
    
    // Average position size for new positions
    // Use a conservative approach - only use 80% of available liquidity
    const safeAvailableLiquidity = availableLiquidity * 0.8;
    const avgNewPositionSize = safeAvailableLiquidity / Math.min(slotsAvailable, newPoolCandidates.length);
    
    // Add new opportunities
    for (let i = 0; i < Math.min(slotsAvailable, newPoolCandidates.length); i++) {
      const pool = newPoolCandidates[i];
      
      // Skip low APR pools
      if (pool.apr === null || pool.apr < 5) continue;
      
      // Check correlation thresholds
      if (pool.correlation !== undefined) {
        const correlationThresholds = {
          low: 0.7,
          medium: 0.4,
          high: 0.0,
        };
        
        const threshold = correlationThresholds[riskProfile as keyof typeof correlationThresholds];
        if (pool.correlation < threshold) continue;
      }
      
      const currentPrice = 1.0; // Placeholder
      const recommendedPriceRange = calculateOptimalPriceRange(pool, currentPrice, strategy);
      
      actions.push({
        actionType: RebalanceActionType.ENTER_POSITION,
        poolId: pool.id,
        token0: pool.token0.symbol,
        token1: pool.token1.symbol,
        feeTier: pool.feeTier,
        currentSize: 0,
        targetSize: avgNewPositionSize,
        sizeChangePercent: 100,
        recommendedPriceRange,
        reasonCodes: [REBALANCE_REASONS.NEW_OPPORTUNITY],
        reasons: [
          `New high-performing pool (APR: ${pool.apr.toFixed(1)}%) aligned with ${riskProfile} risk profile`,
          `Pool has favorable correlation: ${pool.correlation?.toFixed(2) || 'N/A'}`,
        ],
        priority: 5,
      });
    }
  }
  
  // Sort actions by priority (highest first)
  return actions.sort((a, b) => b.priority - a.priority);
}

/**
 * Estimates impermanent loss for a position based on price change scenarios
 * @param initialPrice Initial token price
 * @param priceChangePercent Percentage price change scenario
 * @returns Estimated impermanent loss as a percentage
 */
export function estimateImpermanentLoss(initialPrice: number, priceChangePercent: number): number {
  // Convert percentage to ratio
  const priceRatio = 1 + (priceChangePercent / 100);
  
  // Calculate IL using standard formula: IL = 2 * sqrt(priceRatio) / (1 + priceRatio) - 1
  const sqrtPriceRatio = Math.sqrt(priceRatio);
  const impermanentLoss = (2 * sqrtPriceRatio / (1 + priceRatio)) - 1;
  
  // Convert to percentage loss (negative value)
  return impermanentLoss * 100;
}

/**
 * Compares current token price to the position's price range
 * @param currentPrice Current token price
 * @param priceRange Position's price range
 * @returns Position of price relative to range (-1: below, 0: within, 1: above)
 */
export function getPricePositionInRange(
  currentPrice: number,
  priceRange: PriceRange,
): number {
  if (currentPrice < priceRange.lowerPrice) return -1; // Below range
  if (currentPrice > priceRange.upperPrice) return 1; // Above range
  return 0; // Within range
}

/**
 * Calculate fee returns vs impermanent loss trade-off
 * @param pool Pool data with APR
 * @param priceVolatility Expected price volatility percentage
 * @param daysHeld Number of days position will be held
 * @returns Net expected return percentage (fees minus IL)
 */
export function calculateFeeVsILTradeoff(
  pool: PoolWithAPR,
  priceVolatility: number,
  daysHeld: number,
): number {
  if (pool.apr === null) return 0;
  
  // Calculate expected fee return for the holding period
  const feesReturnPercent = (pool.apr / 365) * daysHeld;
  
  // Estimate expected IL based on historical volatility
  // This is a simplified model - in reality, IL depends on the specific price path
  const expectedILPercent = estimateImpermanentLoss(1.0, priceVolatility);
  
  // Net return: fees minus IL
  return feesReturnPercent + expectedILPercent; // IL is negative, so we add it
}
