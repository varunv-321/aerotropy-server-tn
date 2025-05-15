/**
 * Utility functions for token correlation analysis in Uniswap pools
 */
import { PoolWithAPR } from './uniswap.service';

// Well-known token addresses that are considered stable
export const STABLE_TOKENS = {
  // USDC
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': true, // Ethereum
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': true, // Polygon
  '0x7f5c764cbc14f9669b88837ca1490cca17c31607': true, // Optimism
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': true, // Arbitrum
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': true, // Base
  
  // USDT
  '0xdac17f958d2ee523a2206206994597c13d831ec7': true, // Ethereum
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': true, // Polygon
  '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': true, // Optimism
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': true, // Arbitrum
  
  // DAI
  '0x6b175474e89094c44da98b954eedeac495271d0f': true, // Ethereum
  '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': true, // Polygon
  '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1': true, // Optimism & Arbitrum
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': true, // Base
  
  // WETH/ETH (considered baseline liquidity)
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': true, // Ethereum
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': true, // Polygon
  '0x4200000000000000000000000000000000000006': true, // Optimism & Base
  '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': true, // Arbitrum
};

// Major tokens that are considered significant and well-established
export const MAJOR_TOKENS = {
  ...STABLE_TOKENS,
  // WBTC
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': true, // Ethereum
  '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6': true, // Polygon
  '0x68f180fcce6836688e9084f035309e29bf0a2095': true, // Optimism
  '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f': true, // Arbitrum
  '0x1a35ee4640b0a3b87705b0a4b45d227ba60ca2ad': true, // Base
  
  // LINK
  '0x514910771af9ca656af840dff83e8264ecf986ca': true, // Ethereum
  '0xb0897686c545045afc77cf20ec7a532e3120e0f1': true, // Polygon
  '0x350a791bfc2c21f9ed5d10980dad2e2638ffa7f6': true, // Optimism
  '0xf97f4df75117a78c1a5a0dbb814af92458539fb4': true, // Arbitrum
  
  // UNI
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': true, // Ethereum
  '0xb33eaad8d922b1083446dc23f610c2567fb5180f': true, // Optimism
  '0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0': true, // Arbitrum
};

/**
 * Calculate correlation score for a token pair
 * Higher values indicate more correlated/stable pairs
 * @param pool Pool data with token information
 * @param options Configuration options
 * @returns Correlation score between 0 and 1
 */
export function calculateTokenCorrelation(
  pool: PoolWithAPR,
  options?: {
    preferStableCorrelation?: boolean;
    preferStableBase?: boolean;
    avoidExoticPairs?: boolean;
  },
): number {
  const {
    preferStableCorrelation = false,
    preferStableBase = false,
    avoidExoticPairs = false,
  } = options || {};
  
  // Extract token addresses (normalize to lowercase)
  const token0Address = pool.token0?.id?.toLowerCase() || '';
  const token1Address = pool.token1?.id?.toLowerCase() || '';
  
  // Base correlation score
  let correlationScore = 0.5; // Default middle correlation
  
  // Check if both tokens are stable (e.g., USDC/USDT)
  const isToken0Stable = STABLE_TOKENS[token0Address] || false;
  const isToken1Stable = STABLE_TOKENS[token1Address] || false;
  const bothStable = isToken0Stable && isToken1Stable;
  
  // Check if at least one token is a major token
  const isToken0Major = MAJOR_TOKENS[token0Address] || false;
  const isToken1Major = MAJOR_TOKENS[token1Address] || false;
  const hasMajorToken = isToken0Major || isToken1Major;
  
  // Check if at least one token is stable
  const hasStableToken = isToken0Stable || isToken1Stable;
  
  // Calculate correlation based on token types
  if (bothStable) {
    // Two stablecoins have extremely high correlation
    correlationScore = 0.95;
    
    // Boost score if strategy specifically prefers stable pairs
    if (preferStableCorrelation) {
      correlationScore = 1.0;
    }
  } else if (hasStableToken) {
    // One stable token (like ETH/USDC) - good correlation
    correlationScore = 0.8;
    
    // Boost score if strategy prefers a stable base
    if (preferStableBase) {
      correlationScore = 0.9;
    }
  } else if (hasMajorToken) {
    // At least one major token - moderate correlation
    correlationScore = 0.6;
  } else {
    // Exotic pair - low correlation
    correlationScore = 0.3;
    
    // Penalize exotic pairs if the strategy wants to avoid them
    if (avoidExoticPairs) {
      correlationScore = 0.1;
    }
  }
  
  return correlationScore;
}

/**
 * Check if a pool meets the token correlation criteria
 * @param pool Pool data
 * @param options Correlation filtering options
 * @returns Boolean indicating if the pool meets criteria
 */
export function meetsCorrelationCriteria(
  pool: PoolWithAPR,
  options?: {
    minTokenCorrelation?: number;
    maxTokenCorrelation?: number;
    preferStableCorrelation?: boolean;
    preferStableBase?: boolean;
    avoidExoticPairs?: boolean;
  },
): boolean {
  const {
    minTokenCorrelation = 0,
    maxTokenCorrelation = 1,
    ...correlationOptions
  } = options || {};
  
  const correlation = calculateTokenCorrelation(pool, correlationOptions);
  
  return correlation >= minTokenCorrelation && correlation <= maxTokenCorrelation;
}

/**
 * Check if a pool uses one of the preferred fee tiers
 * @param pool Pool data
 * @param preferredFeeTiers Array of preferred fee tiers in basis points
 * @returns Boolean indicating if fee tier is preferred
 */
export function isPreferredFeeTier(
  pool: PoolWithAPR,
  preferredFeeTiers?: number[],
): boolean {
  if (!preferredFeeTiers || preferredFeeTiers.length === 0) {
    return true; // No preference specified, allow all
  }
  
  // Get fee as number (in basis points)
  const fee = parseInt(pool.feeTier || '0', 10);
  
  return preferredFeeTiers.includes(fee);
}
