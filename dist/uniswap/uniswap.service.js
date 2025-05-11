"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UniswapService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniswapService = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@apollo/client/core");
const queries_1 = require("./queries");
const graphql_client_service_1 = require("../graph/graphql-client.service");
let UniswapService = UniswapService_1 = class UniswapService {
    graphqlClientService;
    logger = new common_1.Logger(UniswapService_1.name);
    constructor(graphqlClientService) {
        this.graphqlClientService = graphqlClientService;
    }
    async getV3PoolsWithAPR(network, historyDays = 7) {
        if (network !== 'base') {
            this.logger.warn(`Network '${network}' not supported yet, defaulting to Base.`);
        }
        const queryWithHistory = queries_1.TOP_POOLS_FOR_APR_QUERY.replace(/poolDayData\(orderBy: date, orderDirection: desc, first: \d+\)/, `poolDayData(orderBy: date, orderDirection: desc, first: ${historyDays})`);
        try {
            const apolloClient = this.graphqlClientService.getClient();
            const response = await apolloClient.query({
                query: (0, core_1.gql) `
          ${queryWithHistory}
        `,
                fetchPolicy: 'cache-first',
            });
            if (response.errors && response.errors.length > 0) {
                this.logger.error('GraphQL errors:', response.errors);
            }
            const pools = response.data?.pools || [];
            const riskFreeRate = 0;
            function regressionSlope(xs, ys) {
                if (xs.length !== ys.length || xs.length < 2)
                    return null;
                const n = xs.length;
                const xMean = xs.reduce((a, b) => a + b, 0) / n;
                const yMean = ys.reduce((a, b) => a + b, 0) / n;
                let num = 0, den = 0;
                for (let i = 0; i < n; i++) {
                    num += (xs[i] - xMean) * (ys[i] - yMean);
                    den += Math.pow(xs[i] - xMean, 2);
                }
                return den === 0 ? null : num / den;
            }
            const poolsWithAPR = pools.map((pool) => {
                let apr = null;
                let averageApr7d = null;
                let averageVolume7d = null;
                let aprStdDev = null;
                let tvlTrend = null;
                let volumeTrend = null;
                let tvlSlope = null;
                let volumeSlope = null;
                let sharpeRatio = null;
                const currentTVL = parseFloat(pool.totalValueLockedUSD);
                if (pool.poolDayData && pool.poolDayData.length > 0 && currentTVL > 0) {
                    const latestDayData = pool.poolDayData[0];
                    const dailyFeesUSD = parseFloat(latestDayData.feesUSD);
                    if (!isNaN(dailyFeesUSD) && dailyFeesUSD >= 0) {
                        apr = (dailyFeesUSD / currentTVL) * 365 * 100;
                    }
                    else {
                        this.logger.warn(`Invalid dailyFeesUSD for pool ${pool.id}: ${latestDayData.feesUSD}`);
                    }
                    const validDays = pool.poolDayData.filter((d) => !isNaN(parseFloat(d.feesUSD)) &&
                        !isNaN(parseFloat(d.tvlUSD)) &&
                        parseFloat(d.tvlUSD) > 0);
                    if (validDays.length > 0) {
                        const aprs = validDays.map((day) => (parseFloat(day.feesUSD) / parseFloat(day.tvlUSD)) * 365 * 100);
                        averageApr7d = aprs.reduce((a, b) => a + b, 0) / aprs.length;
                        const mean = averageApr7d;
                        const variance = aprs.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
                            aprs.length;
                        aprStdDev = Math.sqrt(variance);
                        if (averageApr7d !== null && aprStdDev !== null && aprStdDev > 0) {
                            sharpeRatio = (averageApr7d - riskFreeRate) / aprStdDev;
                        }
                        else {
                            sharpeRatio = null;
                        }
                        const volumes = validDays.map((day) => parseFloat(day.volumeUSD));
                        averageVolume7d =
                            volumes.reduce((a, b) => a + b, 0) / volumes.length;
                        if (validDays.length > 1) {
                            const tvlStart = parseFloat(validDays[validDays.length - 1].tvlUSD);
                            const tvlEnd = parseFloat(validDays[0].tvlUSD);
                            if (tvlStart > 0) {
                                tvlTrend = ((tvlEnd - tvlStart) / tvlStart) * 100;
                            }
                            const volStart = parseFloat(validDays[validDays.length - 1].volumeUSD);
                            const volEnd = parseFloat(validDays[0].volumeUSD);
                            if (volStart > 0) {
                                volumeTrend = ((volEnd - volStart) / volStart) * 100;
                            }
                            const xs = validDays.map((_, i) => i);
                            const tvls = validDays.map((d) => parseFloat(d.tvlUSD));
                            const vols = validDays.map((d) => parseFloat(d.volumeUSD));
                            tvlSlope = regressionSlope(xs, tvls);
                            volumeSlope = regressionSlope(xs, vols);
                        }
                    }
                }
                else if (currentTVL <= 0) {
                    this.logger.warn(`Pool ${pool.id} has zero or negative TVL: ${currentTVL}`);
                }
                else {
                    this.logger.warn(`No poolDayData found for pool ${pool.id} to calculate APR.`);
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
        }
        catch (error) {
            this.logger.error('Failed to fetch data from Uniswap V3 subgraph:', error);
            throw error;
        }
    }
    async getBestPoolsWithScore(network, options) {
        const { minTVL = 100000, minAPR = 0, topN = 10, aprWeight = 0.4, tvlWeight = 0.2, volatilityWeight = 0.2, tvlTrendWeight = 0.1, volumeTrendWeight = 0.1, } = options || {};
        const pools = await this.getV3PoolsWithAPR(network, options?.historyDays ?? 7);
        if (!pools.length)
            return [];
        const aprs = pools.map((p) => p.apr ?? 0);
        const tvls = pools.map((p) => parseFloat(p.totalValueLockedUSD));
        const volatilities = pools.map((p) => p.aprStdDev ?? 0);
        const tvlTrends = pools.map((p) => p.tvlTrend ?? 0);
        const volumeTrends = pools.map((p) => p.volumeTrend ?? 0);
        const minApr = Math.min(...aprs), maxApr = Math.max(...aprs);
        const minTvl = Math.min(...tvls), maxTvl = Math.max(...tvls);
        const minVol = Math.min(...volatilities), maxVol = Math.max(...volatilities);
        const minTvlTrend = Math.min(...tvlTrends), maxTvlTrend = Math.max(...tvlTrends);
        const minVolumeTrend = Math.min(...volumeTrends), maxVolumeTrend = Math.max(...volumeTrends);
        const normalize = (val, min, max) => max > min ? (val - min) / (max - min) : 0;
        const filtered = pools
            .filter((p) => (p.apr ?? 0) >= minAPR && parseFloat(p.totalValueLockedUSD) >= minTVL)
            .map((p) => {
            const aprNorm = normalize(p.apr ?? 0, minApr, maxApr);
            const tvlNorm = normalize(parseFloat(p.totalValueLockedUSD), minTvl, maxTvl);
            const volNorm = 1 - normalize(p.aprStdDev ?? 0, minVol, maxVol);
            const tvlTrendNorm = normalize(p.tvlTrend ?? 0, minTvlTrend, maxTvlTrend);
            const volumeTrendNorm = normalize(p.volumeTrend ?? 0, minVolumeTrend, maxVolumeTrend);
            const score = aprNorm * aprWeight +
                tvlNorm * tvlWeight +
                volNorm * volatilityWeight +
                tvlTrendNorm * tvlTrendWeight +
                volumeTrendNorm * volumeTrendWeight;
            return { ...p, score };
        })
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        return filtered.slice(0, topN);
    }
};
exports.UniswapService = UniswapService;
exports.UniswapService = UniswapService = UniswapService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [graphql_client_service_1.GraphqlClientService])
], UniswapService);
//# sourceMappingURL=uniswap.service.js.map