const fetch = require('node-fetch');

const testRebalancing = async () => {
  console.log('Testing rebalancing endpoint...');
  
  // First, fetch real pool data to get valid pool IDs
  console.log('Fetching pool data to get real pool IDs...');
  const poolsResponse = await fetch('http://localhost:3000/v1/uniswap/v3/base/pools-with-apr');
  
  if (!poolsResponse.ok) {
    throw new Error(`Failed to get pools: ${poolsResponse.status} ${poolsResponse.statusText}`);
  }
  
  const pools = await poolsResponse.json();
  console.log(`Found ${pools.length} pools. Using real pool IDs for testing.`);
  
  // Find pools with specific tokens for better testing
  const ethUsdcPool = pools.find(p => 
    (p.token0.symbol === 'ETH' && p.token1.symbol === 'USDC') || 
    (p.token0.symbol === 'USDC' && p.token1.symbol === 'ETH'));
    
  const btcPool = pools.find(p => 
    p.token0.symbol === 'WBTC' || p.token1.symbol === 'WBTC' || 
    p.token0.symbol === 'cbBTC' || p.token1.symbol === 'cbBTC');
  
  // Fallback to first pools if specific ones not found
  const pool1 = ethUsdcPool || pools[0];
  const pool2 = btcPool || (pools.length > 1 ? pools[1] : pools[0]);
  
  console.log(`Using pools:
1. ${pool1.token0.symbol}-${pool1.token1.symbol} (ID: ${pool1.id})
2. ${pool2.token0.symbol}-${pool2.token1.symbol} (ID: ${pool2.id})`);
  
  // Test data with real pool IDs
  const testData = {
    currentPositions: [
      {
        poolId: pool1.id,
        size: 5000,
        priceRange: {
          lowerPrice: 1.05,
          upperPrice: 1.25
        },
        entryDate: Math.floor(Date.now() / 1000) - (60 * 60 * 24 * 10) // 10 days ago
      },
      {
        poolId: pool2.id,
        size: 3000,
        priceRange: {
          lowerPrice: 0.95,
          upperPrice: 1.10
        },
        entryDate: Math.floor(Date.now() / 1000) - (60 * 60 * 24 * 5) // 5 days ago
      }
    ],
    availableLiquidity: 2000,
    minActionThreshold: 10,
    maxPositions: 4
  };
  
  // Test with 3 different risk profiles
  const strategies = ['low', 'medium', 'high'];
  
  for (const strategy of strategies) {
    console.log(`\n\n=== Testing ${strategy.toUpperCase()} risk strategy ===\n`);
    
    try {
      // Hit the rebalance endpoint
      const response = await fetch(`http://localhost:3000/v1/uniswap/v3/base/rebalance-portfolio/${strategy}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error: ${response.status} ${response.statusText} - ${errorText}`);
        continue;
      }
      
      const result = await response.json();
      
      // Display results in a readable format
      console.log(`Strategy: ${result.strategy}`);
      console.log(`Recommendations Count: ${result.recommendationsCount}`);
      console.log(`Pools Analyzed: ${result.marketConditions.poolsAnalyzed}`);
      
      if (result.recommendations.length === 0) {
        console.log('\nNo rebalancing actions recommended.');
      } else {
        console.log('\nRecommendations:');
        
        // Group recommendations by action type for easier reading
        const actionGroups = {};
        result.recommendations.forEach(rec => {
          if (!actionGroups[rec.actionType]) {
            actionGroups[rec.actionType] = [];
          }
          actionGroups[rec.actionType].push(rec);
        });
        
        for (const [actionType, recs] of Object.entries(actionGroups)) {
          console.log(`\n${actionType.toUpperCase().replace('_', ' ')} ACTIONS (${recs.length}):`);
          
          recs.forEach((rec, i) => {
            const poolSymbols = rec.token0 && rec.token1 ? `${rec.token0}/${rec.token1}` : `Pool ${rec.poolId.substring(0, 6)}...`;
            console.log(`- ${i+1}. ${poolSymbols}:`);
            
            if (rec.actionType === 'adjust_range' && rec.currentPriceRange && rec.recommendedPriceRange) {
              console.log(`  * Adjust range from [${rec.currentPriceRange.lowerPrice.toFixed(4)}-${rec.currentPriceRange.upperPrice.toFixed(4)}]`);
              console.log(`    to [${rec.recommendedPriceRange.lowerPrice.toFixed(4)}-${rec.recommendedPriceRange.upperPrice.toFixed(4)}]`);
            } else if (rec.actionType === 'increase_size' || rec.actionType === 'decrease_size') {
              if (rec.currentSize !== undefined && rec.targetSize !== undefined) {
                console.log(`  * Change position size from $${rec.currentSize.toFixed(2)} to $${rec.targetSize.toFixed(2)}`);
                if (rec.sizeChangePercent !== undefined) {
                  console.log(`    (${rec.sizeChangePercent > 0 ? '+' : ''}${rec.sizeChangePercent}%)`);
                }
              }
            } else if (rec.actionType === 'enter_position') {
              if (rec.targetSize !== undefined) {
                console.log(`  * New position with $${rec.targetSize.toFixed(2)}`);
                if (rec.recommendedPriceRange) {
                  console.log(`    in range [${rec.recommendedPriceRange.lowerPrice.toFixed(4)}-${rec.recommendedPriceRange.upperPrice.toFixed(4)}]`);
                }
              }
            } else if (rec.actionType === 'exit_position' && rec.currentSize !== undefined) {
              console.log(`  * Remove $${rec.currentSize.toFixed(2)} of liquidity`);
            }
            
            console.log(`  * Priority: ${rec.priority}/10`);
            console.log(`  * Reason: ${rec.reasons[0]}`);
            if (rec.reasons.length > 1) {
              rec.reasons.slice(1).forEach(reason => {
                console.log(`    ${reason}`);
              });
            }
          });
        }
      }
      
    } catch (error) {
      console.error(`Failed to test ${strategy} strategy:`, error.message);
    }
  }
};

// Run the test
testRebalancing();
