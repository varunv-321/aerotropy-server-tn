// test/best-pools.e2e.js
// Node.js script for comprehensive testing of the best-pools endpoint
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/v1/uniswap/v3/base/best-pools';

const strategies = ['low', 'medium', 'high'];
const customQueries = [
  '',
  'minTVL=0',
  'minAPR=0',
  'topN=2',
  'aprWeight=1&tvlWeight=0&volatilityWeight=0&tvlTrendWeight=0&volumeTrendWeight=0', // pure APR
  'aprWeight=0&tvlWeight=1&volatilityWeight=0&tvlTrendWeight=0&volumeTrendWeight=0', // pure TVL
  'aprWeight=0.3&tvlWeight=0.3&volatilityWeight=0.3&tvlTrendWeight=0.05&volumeTrendWeight=0.05', // balanced
];

async function testEndpoint() {
  for (const strategy of strategies) {
    const url = `${BASE_URL}?strategy=${strategy}`;
    const { data } = await axios.get(url);
    console.log(`\n--- Results for strategy=${strategy} ---`);
    analyseOutput(data, strategy);
  }
  for (const query of customQueries) {
    const url = `${BASE_URL}${query ? '?' + query : ''}`;
    const { data } = await axios.get(url);
    console.log(`\n--- Results for custom query: ${query || 'default'} ---`);
    analyseOutput(data, query);
  }
}

function analyseOutput(data, label) {
  if (!Array.isArray(data)) {
    console.error('❌ Not an array response!');
    return;
  }
  if (data.length === 0) {
    console.warn('⚠️  No pools returned for', label);
    return;
  }
  // Check required fields
  const requiredFields = ['id', 'score', 'apr', 'averageApr7d', 'aprStdDev', 'totalValueLockedUSD'];
  const missing = requiredFields.filter(f => !(f in data[0]));
  if (missing.length) {
    console.error('❌ Missing fields:', missing);
  }
  // Print summary
  data.slice(0, 3).forEach((pool, i) => {
    console.log(`Pool #${i + 1}:`, {
      id: pool.id,
      score: pool.score,
      apr: pool.apr,
      avgAPR: pool.averageApr7d,
      aprStdDev: pool.aprStdDev,
      tvl: pool.totalValueLockedUSD,
    });
  });
  // Check sorting
  let sorted = true;
  for (let i = 1; i < data.length; i++) {
    if ((data[i - 1].score ?? 0) < (data[i].score ?? 0)) {
      sorted = false;
      break;
    }
  }
  if (!sorted) {
    console.warn('⚠️  Pools are not sorted by score!');
  } else {
    console.log('✅ Pools sorted by score.');
  }
}

// Run the test
if (require.main === module) {
  testEndpoint().catch(e => {
    console.error('Test failed:', e.message);
    process.exit(1);
  });
}
