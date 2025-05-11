// src/uniswap/queries.ts
// GraphQL queries for Uniswap subgraph

export const TOP_POOLS_FOR_APR_QUERY = `
  query TopPoolsForAPRCalculation {
    pools(
      orderBy: totalValueLockedUSD
      orderDirection: desc
      first: 50
      subgraphError: allow
    ) {
      id
      token0 {
        id
        symbol
        name
      }
      token1 {
        id
        symbol
        name
      }
      feeTier
      totalValueLockedUSD
      poolDayData(orderBy: date, orderDirection: desc, first: 7) {
        date
        feesUSD
        volumeUSD
        tvlUSD
      }
    }
  }
`;
