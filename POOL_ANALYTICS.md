# Uniswap Pool Analytics Documentation

## Overview

This document describes the analytics and metrics provided by the Aerotropy DeFi backend for Uniswap V3 pools. These analytics are available via the `/v1/uniswap/v3/:network/best-pools` API endpoint and are designed to help users evaluate DeFi investment opportunities based on robust, risk-aware historical data.

---

## API Usage

- **Endpoint:** `/v1/uniswap/v3/:network/best-pools`
- **Description:** Returns the best Uniswap V3 pools for investment, ranked by a composite score that incorporates APR, TVL, volatility, and trends. All analytics are min-max normalized for fair comparison.

### Query Parameters

- `minTVL`: Minimum TVL in USD (default: 100000)
- `minAPR`: Minimum APR in % (default: 0)
- `topN`: Number of top pools to return (default: 10)
- `aprWeight`: Weight for APR in score (default: 0.4)
- `tvlWeight`: Weight for TVL in score (default: 0.2)
- `volatilityWeight`: Weight for volatility (APR stddev, penalized, default: 0.2)
- `tvlTrendWeight`: Weight for TVL trend (default: 0.1)
- `volumeTrendWeight`: Weight for volume trend (default: 0.1)
- `historyDays`: Number of days of historical data to use for analytics (default: 7)

### Response Fields

- `id`: Pool address
- `feeTier`: Pool fee tier (in bps)
- `token0`, `token1`: Token metadata (id, symbol, name)
- `totalValueLockedUSD`: Current TVL (USD)
- `apr`: Latest daily APR (%)
- `averageApr7d`: N-day average APR (%)
- `averageVolume7d`: N-day average daily volume (USD)
- `aprStdDev`: Standard deviation of daily APRs (volatility)
- `tvlTrend`: Percent change in TVL over window
- `volumeTrend`: Percent change in daily volume over window
- `score`: Composite investment score (normalized, weighted)
- `poolDayData`: Array of daily snapshots (fees, TVL, volume, date)

---

## Scoring Formula

```
score = (
  normalized_apr * aprWeight +
  normalized_tvl * tvlWeight +
  (1 - normalized_volatility) * volatilityWeight +
  normalized_tvlTrend * tvlTrendWeight +
  normalized_volumeTrend * volumeTrendWeight
)
```

- **All metrics are min-max normalized to [0,1] across all returned pools.**
- **Volatility is inverted:** Lower volatility (risk) increases score.
- **Weights:** User-configurable via query params. Defaults sum to 1.0 but do not have to.

### How Each Metric is Calculated

- **APR:** `(dailyFeesUSD / currentTVL) * 365 * 100` (annualized daily return)
- **Average APR:** Arithmetic mean of daily APRs over the window
- **APR Volatility:** Standard deviation of daily APRs (population stddev)
- **TVL/Volume Trend:** `((end - start) / start) * 100` (% change from oldest to newest day)

---

## Robustness & Best Practices

- All calculations use industry-standard DeFi analytics math.
- Normalization is safe for constant values (returns 0 if all values are equal).
- If a pool has incomplete data (less than `historyDays`), analytics are computed on available data.
- Filtering by `minAPR` and `minTVL` occurs before scoring.
- Use the weights to tune for your risk/return profile (e.g., increase volatilityWeight to penalize risk more).

## Usage Tips

- **Frontend:** Expose all analytics and allow users to adjust weights for personalized ranking.
- **API Consumers:** Use the `score` field to sort pools, but also show volatility and trends for transparency.
- **Interpretation:** High score = high APR, high TVL, low volatility, and positive trends.

---

## Metric Definitions

### APR (Annual Percentage Rate)

- **Formula:** `(Daily Fees / TVL) * 365 * 100`
- **Interpretation:** Higher APR means higher yield, but may be more volatile.

### averageApr7d

- **Formula:** Arithmetic mean of daily APRs over the last N days.
- **Interpretation:** Smoother view of pool yield over time.

### averageVolume7d

- **Formula:** Arithmetic mean of daily volume (USD) over the last N days.
- **Interpretation:** Indicates trading activity and fee generation potential.

### aprStdDev (Volatility)

- **Formula:** Standard deviation of daily APRs over the window.
- **Interpretation:** Higher value = more volatile (riskier) APR.

### tvlTrend

- **Formula:** `((TVL_newest - TVL_oldest) / TVL_oldest) * 100`
- **Interpretation:** Positive = TVL is growing (liquidity inflow), negative = shrinking.

### volumeTrend

- **Formula:** `((Volume_newest - Volume_oldest) / Volume_oldest) * 100`
- **Interpretation:** Positive = trading activity is increasing, negative = declining.

### score

- **Formula:**
  ```
  score = (
    normalized_apr * aprWeight +
    normalized_tvl * tvlWeight +
    (1 - normalized_volatility) * volatilityWeight +
    normalized_tvlTrend * tvlTrendWeight +
    normalized_volumeTrend * volumeTrendWeight
  )
  ```
- **Interpretation:** Composite score for ranking pools by investment attractiveness, factoring in APR, TVL, volatility (penalized), and positive trends (rewarded). All metrics are min-max normalized to [0,1]. Volatility is inverted so lower risk increases score.

### Robustness & Math Verification

- All calculations use industry-standard formulas for APR, volatility (population stddev), and percent change for trends.
- Normalization is min-max, with safe fallback for constant values.
- Volatility is penalized by inverting normalization (lower is better).
- Data completeness: If a pool has fewer than N days, averages and trends are computed on available data, but consider flagging such pools in frontend.
- For very small N, consider using sample stddev (divide by N-1) for volatility.
- Filtering by minAPR and minTVL occurs before scoring.
- All weights are user-configurable via API query parameters.

### Example Weights (Default)

- aprWeight: 0.4
- tvlWeight: 0.2
- volatilityWeight: 0.2
- tvlTrendWeight: 0.1
- volumeTrendWeight: 0.1

### Best Practices

- Prefer pools with high score, low volatility, and positive trends.
- Use the weights to tune for your risk/return profile.

---

## Example Response

```json
[
  {
    "id": "0x...",
    "token0": { "symbol": "WETH", ... },
    "token1": { "symbol": "USDC", ... },
    "feeTier": "3000",
    "totalValueLockedUSD": "1000000.00",
    "apr": 25.4,
    "averageApr7d": 24.7,
    "averageVolume7d": 1500000.25,
    "aprStdDev": 4.2,
    "tvlTrend": 2.5,
    "volumeTrend": -1.2,
    "score": 0.82,
    "poolDayData": [ ...N days... ]
  },
  ...
]
```

---

## Usage Recommendations

- **APR Volatility:** Prefer pools with high average APR but low `aprStdDev` for more stable returns.
- **TVL/Volume Trends:** Pools with positive `tvlTrend` and `volumeTrend` are generally healthier and more attractive.
- **Custom Scoring:** Adjust `aprWeight` and `tvlWeight` to match your risk/reward preferences.
- **History Window:** Use `historyDays` to analyze short-term vs. long-term pool behavior.

---

## Limitations & Notes

- Metrics are only as reliable as the data returned by The Graph/Uniswap subgraph.
- For very new pools, historical averages and trends may be less meaningful (check poolDayData length).
- These analytics do not account for impermanent loss, external incentives, or protocol-specific risks.

---

## Automated Endpoint Testing & Results

A comprehensive Node.js script (`test/best-pools.e2e.js`) was used to validate the `/best-pools` endpoint:

- **Tested:** All strategy presets (`low`, `medium`, `high`) and custom queries (pure APR, TVL, balanced, etc.)
- **Checks:** Response array, required fields, sorting by score, edge cases (restrictive filters)
- **Results:**
  - Presets `low` and `high` return pools as expected; `medium` may be too restrictive (returns empty)
  - Custom queries behave as intended (e.g., pure APR returns highest-APR pool)
  - All required fields present and pools sorted by score
  - No malformed or missing data

**Recommendation:** FE can confidently use this endpoint. Handle empty results gracefully. See `test/best-pools.e2e.js` for details.

---

## Strategy Presets

| Preset | minTVL | aprWeight | tvlWeight | volatilityWeight | tvlTrendWeight | volumeTrendWeight |
| ------ | ------ | --------- | --------- | ---------------- | -------------- | ----------------- |
| low    | 100000 | 0.2       | 0.3       | 0.3              | 0.1            | 0.1               |
| medium | 50000  | 0.3       | 0.2       | 0.2              | 0.15           | 0.15              |
| high   | 10000  | 0.5       | 0.1       | 0.05             | 0.15           | 0.2               |

Preset strategies can be selected via `strategy=low|medium|high` query param. Custom weights override these.

---

## Error Handling & Edge Cases

- **Invalid Parameters:** Returns HTTP 400 with error message (e.g., for invalid weights or missing network).
- **Unsupported Network:** Returns HTTP 404 or 400 with descriptive message.
- **Internal Errors:** Returns HTTP 500 with error details.
- **Empty Results:** If filters are too restrictive, returns an empty array (`[]`). FE should display a friendly message.

---

## Quick Testing Guide

- **Manual Test:**
  ```sh
  curl 'http://localhost:3000/v1/uniswap/v3/base/best-pools?strategy=low'
  ```
- **Automated Test:**
  Run: `node test/best-pools.e2e.js` (ensure backend is running)
- **Swagger/OpenAPI:** See `/api` endpoint if enabled for interactive docs.

---

## Contact

For questions, suggestions, or contributions, please contact the Aerotropy team.
