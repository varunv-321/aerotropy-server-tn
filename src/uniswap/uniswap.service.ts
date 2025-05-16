import { Injectable, Logger } from '@nestjs/common';
import { gql } from '@apollo/client/core';
import { TOP_POOLS_FOR_APR_QUERY } from './queries';
import { GraphqlClientService } from '../graph/graphql-client.service';

// Interfaces for The Graph API response
interface Token {
  id: string;
  symbol: string;
  name: string;
}

interface PoolDayData {
  date: number; // Assuming date is a Unix timestamp
  feesUSD: string; // Fees generated on this specific day
  volumeUSD: string;
  tvlUSD: string; // TVL snapshot at the end of this day
}

interface Pool {
  id: string; // Pool address
  token0: Token;
  token1: Token;
  feeTier: string;
  totalValueLockedUSD: string; // Current TVL of the pool
  poolDayData: PoolDayData[];
}

export interface PoolWithAPR extends Pool {
  apr: number | null; // Annual Percentage Rate (latest)
  averageApr7d?: number | null; // N-day average APR
  averageVolume7d?: number | null; // N-day average daily volume
  aprStdDev?: number | null; // Volatility: standard deviation of daily APRs
  tvlTrend?: number | null; // Percent change in TVL over window
  volumeTrend?: number | null; // Percent change in volume over window
  tvlSlope?: number | null; // Regression slope of TVL
  createdAtTimestamp?: string; // Timestamp when the pool was created
  correlation?: number; // Token correlation score
  volumeSlope?: number | null; // Regression slope of volume
  score?: number; // Composite investment score
  sharpeRatio?: number | null; // Risk-adjusted return (APR volatility)
}

interface GraphQLResponse {
  data: {
    pools: Pool[];
  };
  errors?: any[];
}

@Injectable()
export class UniswapService {
  private readonly logger = new Logger(UniswapService.name);

  constructor(private readonly graphqlClientService: GraphqlClientService) {}

  /**
   * Fetches Uniswap V3 pools with calculated APR.
   * @param network
   * @returns Array of PoolWithAPR (unsorted, unfiltered)
   */
  async getUniswapPoolsWithAPR(
    network: string,
    historyDays = 7,
    version?: number,
  ): Promise<PoolWithAPR[]> {
    // For now, we'll hardcode to 'base' and use the predefined URL.
    // Later, this could be dynamic based on the 'network' parameter.
    if (network !== 'base') {
      this.logger.warn(
        `Network '${network}' not supported yet, defaulting to Base.`,
      );
      // Potentially throw an error or handle other networks if their subgraphs are known
    }

    // Import the GraphQL query from queries.ts
    // (import statement added at top of file)

    // Define a DTO for the GraphQL request body
    interface GraphQLRequestBody {
      query: string;
      variables?: Record<string, any>;
    }

    // Dynamically generate the GraphQL query to fetch the desired number of days
    const queryWithHistory = TOP_POOLS_FOR_APR_QUERY.replace(
      /poolDayData\(orderBy: date, orderDirection: desc, first: \d+\)/,
      `poolDayData(orderBy: date, orderDirection: desc, first: ${historyDays})`,
    );

    // Use Apollo Client to query the subgraph
    try {
      const apolloClient =
        version === 3
          ? this.graphqlClientService.getClient()
          : this.graphqlClientService.getClientV4();
      const response = await apolloClient.query<GraphQLResponse>({
        query: gql`
          ${queryWithHistory}
        `,
        fetchPolicy: 'cache-first',
      });

      if (response.errors && response.errors.length > 0) {
        this.logger.error('GraphQL errors:', response.errors);
        // Depending on the error, you might want to throw or return empty
      }

      const pools = (response.data as any)?.pools || [];
      const riskFreeRate = 0; // You can set this to a stablecoin yield if desired
      // Helper: regression slope (least squares)
      function regressionSlope(xs: number[], ys: number[]): number | null {
        if (xs.length !== ys.length || xs.length < 2) return null;
        const n = xs.length;
        const xMean = xs.reduce((a, b) => a + b, 0) / n;
        const yMean = ys.reduce((a, b) => a + b, 0) / n;
        let num = 0,
          den = 0;
        for (let i = 0; i < n; i++) {
          num += (xs[i] - xMean) * (ys[i] - yMean);
          den += Math.pow(xs[i] - xMean, 2);
        }
        return den === 0 ? null : num / den;
      }

      const poolsWithAPR: PoolWithAPR[] = pools.map((pool: Pool) => {
        let apr: number | null = null;
        let averageApr7d: number | null = null;
        let averageVolume7d: number | null = null;
        let aprStdDev: number | null = null;
        let tvlTrend: number | null = null;
        let volumeTrend: number | null = null;
        let tvlSlope: number | null = null;
        let volumeSlope: number | null = null;
        let sharpeRatio: number | null = null;
        const currentTVL = parseFloat(pool.totalValueLockedUSD);

        // Historical APR/volume/volatility/trend calculation
        if (pool.poolDayData && pool.poolDayData.length > 0 && currentTVL > 0) {
          // Latest APR calculation (as before)
          const latestDayData = pool.poolDayData[0];
          const dailyFeesUSD = parseFloat(latestDayData.feesUSD);
          if (!isNaN(dailyFeesUSD) && dailyFeesUSD >= 0) {
            apr = (dailyFeesUSD / currentTVL) * 365 * 100;
          } else {
            this.logger.warn(
              `Invalid dailyFeesUSD for pool ${pool.id}: ${latestDayData.feesUSD}`,
            );
          }

          // N-day average APR and volume, volatility, and trend
          const validDays = pool.poolDayData.filter(
            (d) =>
              !isNaN(parseFloat(d.feesUSD)) &&
              !isNaN(parseFloat(d.tvlUSD)) &&
              parseFloat(d.tvlUSD) > 0,
          );
          if (validDays.length > 0) {
            const aprs = validDays.map(
              (day) =>
                (parseFloat(day.feesUSD) / parseFloat(day.tvlUSD)) * 365 * 100,
            );
            averageApr7d = aprs.reduce((a, b) => a + b, 0) / aprs.length;
            // Standard deviation (volatility)
            const mean = averageApr7d;
            const variance =
              aprs.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
              aprs.length;
            aprStdDev = Math.sqrt(variance);

            // Sharpe Ratio (risk-adjusted return)
            if (averageApr7d !== null && aprStdDev !== null && aprStdDev > 0) {
              sharpeRatio = (averageApr7d - riskFreeRate) / aprStdDev;
            } else {
              sharpeRatio = null;
            }

            const volumes = validDays.map((day) => parseFloat(day.volumeUSD));
            averageVolume7d =
              volumes.reduce((a, b) => a + b, 0) / volumes.length;

            // TVL and Volume trend: percent change from oldest to newest (descending order)
            if (validDays.length > 1) {
              const tvlStart = parseFloat(
                validDays[validDays.length - 1].tvlUSD,
              );
              const tvlEnd = parseFloat(validDays[0].tvlUSD);
              if (tvlStart > 0) {
                tvlTrend = ((tvlEnd - tvlStart) / tvlStart) * 100;
              }
              const volStart = parseFloat(
                validDays[validDays.length - 1].volumeUSD,
              );
              const volEnd = parseFloat(validDays[0].volumeUSD);
              if (volStart > 0) {
                volumeTrend = ((volEnd - volStart) / volStart) * 100;
              }
              // Regression slope for TVL and volume
              const xs = validDays.map((_, i) => i);
              const tvls = validDays.map((d) => parseFloat(d.tvlUSD));
              const vols = validDays.map((d) => parseFloat(d.volumeUSD));
              tvlSlope = regressionSlope(xs, tvls);
              volumeSlope = regressionSlope(xs, vols);
            }
          }
        } else if (currentTVL <= 0) {
          this.logger.warn(
            `Pool ${pool.id} has zero or negative TVL: ${currentTVL}`,
          );
        } else {
          this.logger.warn(
            `No poolDayData found for pool ${pool.id} to calculate APR.`,
          );
        }

        return {
          ...pool,
          apr,
          averageApr7d,
          averageVolume7d,
          aprStdDev,
          tvlTrend,
          volumeTrend,
          tvlSlope,
          volumeSlope,
          sharpeRatio,
        };
      });

      return poolsWithAPR;
    } catch (error) {
      this.logger.error(
        'Failed to fetch data from Uniswap V3 subgraph:',
        error,
      );
      throw error; // Or handle more gracefully
    }
  }

  /**
   * Get best pools, scored and filtered by investment opportunity.
   * @param network
   * @param options Filtering and scoring options
   * @returns Array of PoolWithAPR, sorted by score
   */
  async getBestPoolsWithScore(
    network: string,
    options?: {
      // Basic filtering parameters
      minTVL?: number; // Minimum TVL in USD
      minAPR?: number; // Minimum APR in %
      topN?: number; // Return top N pools
      maxPoolAgeDays?: number; // Maximum age of pool in days (for new pools)
      preferredFeeTiers?: number[]; // Preferred fee tiers in basis points

      // Token correlation parameters
      minTokenCorrelation?: number; // Minimum correlation coefficient
      maxTokenCorrelation?: number; // Maximum correlation coefficient
      correlationWeight?: number; // Weight for token correlation in scoring
      preferStableCorrelation?: boolean; // Whether to prefer stable pairs
      preferStableBase?: boolean; // Whether to prefer pairs with one stable
      avoidExoticPairs?: boolean; // Whether to avoid exotic pairs

      // Scoring weights
      aprWeight?: number; // Weight for APR in score
      tvlWeight?: number; // Weight for TVL in score
      volatilityWeight?: number; // Weight for volatility (aprStdDev, negative)
      tvlTrendWeight?: number; // Weight for TVL trend (positive)
      volumeTrendWeight?: number; // Weight for volume trend (positive)
      historyDays?: number; // Number of days for historical analysis
    },
    version?: number,
  ): Promise<PoolWithAPR[]> {
    // Import token correlation utilities
    const {
      calculateTokenCorrelation,
      meetsCorrelationCriteria,
      isPreferredFeeTier,
    } = await import('./token-correlation.utils');

    const {
      // Basic filtering parameters
      minTVL = 100000,
      minAPR = 0,
      topN = 10,
      maxPoolAgeDays,
      preferredFeeTiers,

      // Token correlation parameters
      minTokenCorrelation = 0,
      maxTokenCorrelation = 1,
      correlationWeight = 0,
      preferStableCorrelation = false,
      preferStableBase = false,
      avoidExoticPairs = false,

      // Scoring weights
      aprWeight = 0.4,
      tvlWeight = 0.2,
      volatilityWeight = 0.2, // negative weight (penalize volatility)
      tvlTrendWeight = 0.1, // positive weight
      volumeTrendWeight = 0.1, // positive weight
      historyDays = 7,
    } = options || {};

    const pools = await this.getUniswapPoolsWithAPR(
      network,
      historyDays,
      version,
    );

    if (!pools.length) return [];

    // Normalization helpers
    const aprs = pools.map((p) => p.apr ?? 0);
    const tvls = pools.map((p) => parseFloat(p.totalValueLockedUSD));
    const volatilities = pools.map((p) => p.aprStdDev ?? 0);
    const tvlTrends = pools.map((p) => p.tvlTrend ?? 0);
    const volumeTrends = pools.map((p) => p.volumeTrend ?? 0);
    const minApr = Math.min(...aprs),
      maxApr = Math.max(...aprs);
    const minTvl = Math.min(...tvls),
      maxTvl = Math.max(...tvls);
    const minVol = Math.min(...volatilities),
      maxVol = Math.max(...volatilities);
    const minTvlTrend = Math.min(...tvlTrends),
      maxTvlTrend = Math.max(...tvlTrends);
    const minVolumeTrend = Math.min(...volumeTrends),
      maxVolumeTrend = Math.max(...volumeTrends);
    const normalize = (val: number, min: number, max: number) =>
      max > min ? (val - min) / (max - min) : 0;

    // Calculate correlations for all pools to use in normalization
    const correlations = pools.map((pool) =>
      calculateTokenCorrelation(pool, {
        preferStableCorrelation,
        preferStableBase,
        avoidExoticPairs,
      }),
    );
    const minCorrelation = Math.min(...correlations);
    const maxCorrelation = Math.max(...correlations);

    // Filter and score
    const filtered = pools
      .filter((p) => {
        // Basic filtering criteria
        const meetsBasicCriteria =
          (p.apr ?? 0) >= minAPR && parseFloat(p.totalValueLockedUSD) >= minTVL;

        // Pool age filtering if specified
        // Skip age filtering if createdAtTimestamp is null/undefined
        const meetsAgeRequirement =
          !maxPoolAgeDays ||
          !p.createdAtTimestamp ||
          (Date.now() / 1000 - parseInt(p.createdAtTimestamp)) /
            (60 * 60 * 24) <=
            maxPoolAgeDays;

        // Fee tier filtering if specified
        const meetsFeeRequirement = isPreferredFeeTier(p, preferredFeeTiers);

        // Token correlation filtering
        const meetsCorrelationRequirements = meetsCorrelationCriteria(p, {
          minTokenCorrelation,
          maxTokenCorrelation,
          preferStableCorrelation,
          preferStableBase,
          avoidExoticPairs,
        });

        return (
          meetsBasicCriteria &&
          meetsAgeRequirement &&
          meetsFeeRequirement &&
          meetsCorrelationRequirements
        );
      })
      .map((p) => {
        // Standard metrics normalization
        const aprNorm = normalize(p.apr ?? 0, minApr, maxApr);
        const tvlNorm = normalize(
          parseFloat(p.totalValueLockedUSD),
          minTvl,
          maxTvl,
        );
        // For volatility, lower is better, so invert normalization
        const volNorm = 1 - normalize(p.aprStdDev ?? 0, minVol, maxVol);
        const tvlTrendNorm = normalize(
          p.tvlTrend ?? 0,
          minTvlTrend,
          maxTvlTrend,
        );
        const volumeTrendNorm = normalize(
          p.volumeTrend ?? 0,
          minVolumeTrend,
          maxVolumeTrend,
        );

        // Calculate correlation score
        const correlation = calculateTokenCorrelation(p, {
          preferStableCorrelation,
          preferStableBase,
          avoidExoticPairs,
        });
        const correlationNorm = normalize(
          correlation,
          minCorrelation,
          maxCorrelation,
        );

        // Calculate composite score with correlation
        // Note: The actual weights should add up to 1.0
        // If correlationWeight is non-zero, other weights need to be scaled accordingly
        const weightSum =
          aprWeight +
          tvlWeight +
          volatilityWeight +
          tvlTrendWeight +
          volumeTrendWeight +
          Math.abs(correlationWeight);

        const weightAdjustment =
          correlationWeight !== 0
            ? (1 - Math.abs(correlationWeight)) / weightSum
            : 1;

        const score =
          aprNorm * aprWeight * weightAdjustment +
          tvlNorm * tvlWeight * weightAdjustment +
          volNorm * volatilityWeight * weightAdjustment +
          tvlTrendNorm * tvlTrendWeight * weightAdjustment +
          volumeTrendNorm * volumeTrendWeight * weightAdjustment +
          // Note: correlationWeight can be negative to prefer exotic pairs
          (correlationWeight >= 0
            ? correlationNorm * correlationWeight
            : (1 - correlationNorm) * Math.abs(correlationWeight));

        return { ...p, score, correlation };
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return filtered.slice(0, topN);
  }
}
