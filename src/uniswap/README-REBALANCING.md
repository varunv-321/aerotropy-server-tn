# Uniswap V3 Position Rebalancing

This document explains how to use the position rebalancing feature in the AeroTropy server. The rebalancing system helps traders determine when positions need adjustment and provides specific recommendations based on market conditions.

## Overview

The rebalancing system analyzes existing Uniswap V3 positions and compares them to current market conditions to generate actionable recommendations. These recommendations are prioritized based on importance and include detailed explanations.

## Rebalance Actions

The system can recommend several types of actions:

- **Maintain**: No changes needed (position is optimal)
- **Adjust Range**: Update price range but maintain position size
- **Increase Size**: Add more liquidity to an existing position
- **Decrease Size**: Remove some liquidity from a position
- **Exit Position**: Fully exit the position
- **Enter Position**: Create a new position in a recommended pool

## Using the API

### Endpoint

```
POST /uniswap/v3/:network/rebalance-portfolio/:strategy
```

Where:
- `:network` is the blockchain network (e.g., 'base')
- `:strategy` is the risk profile ('low', 'medium', 'high')

### Request Body

```json
{
  "currentPositions": [
    {
      "poolId": "0x55aa9bf126beabf5141d9a60501a56a26af5e4ba",
      "size": 1000,
      "priceRange": {
        "lowerPrice": 1.05,
        "upperPrice": 1.25
      },
      "entryDate": 1683720000
    },
    {
      "poolId": "0x4b5ab61593a2401b1075b90c04cbcdd3f87ce011",
      "size": 2000
    }
  ],
  "availableLiquidity": 5000,
  "minActionThreshold": 15,
  "maxPositions": 5
}
```

### Response

```json
{
  "strategy": "medium",
  "recommendationsCount": 3,
  "recommendations": [
    {
      "actionType": "exit_position",
      "poolId": "0x4b5ab61593a2401b1075b90c04cbcdd3f87ce011",
      "token0": "USDC",
      "token1": "ETH",
      "currentSize": 2000,
      "targetSize": 0,
      "sizeChangePercent": -100,
      "reasonCodes": ["apr_decline", "correlation_change"],
      "reasons": [
        "Pool APR has declined by 12.5%",
        "Token correlation (0.32) below threshold for medium risk profile"
      ],
      "priority": 9
    },
    {
      "actionType": "adjust_range",
      "poolId": "0x55aa9bf126beabf5141d9a60501a56a26af5e4ba",
      "token0": "USDC",
      "token1": "WBTC",
      "currentSize": 1000,
      "targetSize": 1000,
      "sizeChangePercent": 0,
      "currentPriceRange": {
        "lowerPrice": 1.05,
        "upperPrice": 1.25
      },
      "recommendedPriceRange": {
        "lowerPrice": 1.01,
        "upperPrice": 1.31
      },
      "reasonCodes": ["range_inefficiency"],
      "reasons": ["Position range is no longer optimal for current market conditions"],
      "priority": 7
    },
    {
      "actionType": "enter_position",
      "poolId": "0x11b815efb8f581194ae79006d24e0d814b7697f6",
      "token0": "USDT",
      "token1": "ETH",
      "currentSize": 0,
      "targetSize": 1600,
      "sizeChangePercent": 100,
      "recommendedPriceRange": {
        "lowerPrice": 0.95,
        "upperPrice": 1.12
      },
      "reasonCodes": ["new_opportunity"],
      "reasons": [
        "New high-performing pool (APR: 35.2%) aligned with medium risk profile",
        "Pool has favorable correlation: 0.68"
      ],
      "priority": 5
    }
  ],
  "marketConditions": {
    "timestamp": 1683820000,
    "network": "base",
    "poolsAnalyzed": 50
  }
}
```

## Integration with AI Tools

This rebalancing endpoint is designed to be easily accessible to the AI Agent tools. You can call it as follows:

```typescript
// In AI agent tools
async function getRebalancingRecommendations(network: string, strategy: string, positions: any[]) {
  const response = await axios.post(
    `${API_BASE_URL}/uniswap/v3/${network}/rebalance-portfolio/${strategy}`,
    {
      currentPositions: positions,
      availableLiquidity: 5000, // Optional
      minActionThreshold: 10,   // Optional
      maxPositions: 5           // Optional
    }
  );
  return response.data;
}
```

## Implementation Details

The rebalancing logic is implemented in `position-rebalance.utils.ts` and takes into account:

1. **Price Movement**: Detects when prices have moved significantly compared to position ranges
2. **APR Changes**: Identifies pools with declining or improving APR
3. **Correlation Shifts**: Monitors changes in token correlation that might affect risk profiles
4. **New Opportunities**: Discovers better performing pools not yet in the portfolio
5. **TVL & Volume Trends**: Considers liquidity and volume trends for long-term stability

## Strategies and Risk Profiles

Different risk profiles use different thresholds for rebalancing decisions:

- **Low Risk**: 
  - Wide price ranges (less active management)
  - High correlation requirement (0.7+)
  - Conservative position sizing

- **Medium Risk**:
  - Balanced price ranges
  - Moderate correlation requirement (0.4+)
  - Balanced position sizing

- **High Risk**:
  - Narrow price ranges (more active management)
  - No minimum correlation requirement
  - Concentrated position sizing
