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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UniswapController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniswapController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const uniswap_service_1 = require("./uniswap.service");
const strategy_presets_1 = require("./strategy-presets");
let UniswapController = UniswapController_1 = class UniswapController {
    uniswapService;
    logger = new common_1.Logger(UniswapController_1.name);
    constructor(uniswapService) {
        this.uniswapService = uniswapService;
    }
    async getPoolsWithAPR(network) {
        this.logger.log(`Received request for pools with APR on network: ${network}`);
        if (network !== 'base') {
            this.logger.warn(`Request for unsupported network: ${network}. UniswapService will default to 'base'.`);
        }
        return this.uniswapService.getV3PoolsWithAPR(network);
    }
    async getBestPools(network, minTVL, minAPR, topN, aprWeight, tvlWeight, volatilityWeight, tvlTrendWeight, volumeTrendWeight, historyDays, strategy) {
        let opts = strategy && strategy_presets_1.STRATEGY_PRESETS[strategy]
            ? { ...strategy_presets_1.STRATEGY_PRESETS[strategy] }
            : {};
        opts = {
            ...opts,
            minTVL: minTVL ? Number(minTVL) : opts.minTVL,
            minAPR: minAPR ? Number(minAPR) : opts.minAPR,
            topN: topN ? Number(topN) : opts.topN,
            aprWeight: aprWeight ? Number(aprWeight) : opts.aprWeight,
            tvlWeight: tvlWeight ? Number(tvlWeight) : opts.tvlWeight,
            volatilityWeight: volatilityWeight
                ? Number(volatilityWeight)
                : opts.volatilityWeight,
            tvlTrendWeight: tvlTrendWeight
                ? Number(tvlTrendWeight)
                : opts.tvlTrendWeight,
            volumeTrendWeight: volumeTrendWeight
                ? Number(volumeTrendWeight)
                : opts.volumeTrendWeight,
            historyDays: historyDays ? Number(historyDays) : opts.historyDays,
        };
        return this.uniswapService.getBestPoolsWithScore(network, opts);
    }
    async getPoolsByStrategy(network, strategy, topN, historyDays) {
        const preset = strategy_presets_1.STRATEGY_PRESETS[strategy] || strategy_presets_1.STRATEGY_PRESETS.low;
        const opts = {
            ...preset,
            topN: topN ? Number(topN) : 10,
            historyDays: historyDays ? Number(historyDays) : 7,
            strategy,
        };
        if (strategy === 'high') {
            opts.maxPoolAgeDays = 3;
        }
        return this.uniswapService.getBestPoolsWithScore(network, opts);
    }
};
exports.UniswapController = UniswapController;
__decorate([
    (0, common_1.Get)(':network/pools-with-apr'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get Uniswap V3 pools with calculated APR',
        description: "Fetches top pools by TVL from the specified network (currently only 'base' is supported) and calculates their estimated APR based on recent fees and TVL.",
    }),
    (0, swagger_1.ApiParam)({
        name: 'network',
        required: true,
        description: "The blockchain network to query (e.g., 'base').",
        type: String,
        example: 'base',
    }),
    (0, swagger_1.ApiOkResponse)({
        description: 'A list of Uniswap V3 pools with their calculated APR.',
        type: [Object],
    }),
    __param(0, (0, common_1.Param)('network')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UniswapController.prototype, "getPoolsWithAPR", null);
__decorate([
    (0, common_1.Get)(':network/best-pools'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get best Uniswap V3 pools by score (APR, TVL, volatility, trend)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'minTVL',
        required: false,
        type: Number,
        description: 'Minimum TVL (USD)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'minAPR',
        required: false,
        type: Number,
        description: 'Minimum APR (%)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'topN',
        required: false,
        type: Number,
        description: 'Number of top pools to return',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'aprWeight',
        required: false,
        type: Number,
        description: 'Weight for APR in score (default: 0.4)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'tvlWeight',
        required: false,
        type: Number,
        description: 'Weight for TVL in score (default: 0.2)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'volatilityWeight',
        required: false,
        type: Number,
        description: 'Weight for volatility (APR stddev, penalized, default: 0.2)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'tvlTrendWeight',
        required: false,
        type: Number,
        description: 'Weight for TVL trend (default: 0.1)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'volumeTrendWeight',
        required: false,
        type: Number,
        description: 'Weight for volume trend (default: 0.1)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'strategy',
        required: false,
        type: String,
        description: "Risk strategy preset: 'low', 'medium', or 'high'. If set, applies preset weights/filters. Custom weights override preset.",
    }),
    (0, swagger_1.ApiQuery)({
        name: 'historyDays',
        required: false,
        type: Number,
        description: 'Number of days for historical analytics (default: 7)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Array of pools with advanced analytics and composite score',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    feeTier: { type: 'string' },
                    token0: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            symbol: { type: 'string' },
                            name: { type: 'string' },
                        },
                    },
                    token1: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            symbol: { type: 'string' },
                            name: { type: 'string' },
                        },
                    },
                    totalValueLockedUSD: { type: 'string' },
                    apr: { type: 'number', description: 'Latest daily APR (%)' },
                    averageApr7d: {
                        type: 'number',
                        description: 'N-day average APR (%)',
                    },
                    averageVolume7d: {
                        type: 'number',
                        description: 'N-day average daily volume (USD)',
                    },
                    aprStdDev: {
                        type: 'number',
                        description: 'Standard deviation of daily APRs (volatility)',
                    },
                    tvlTrend: {
                        type: 'number',
                        description: 'Percent change in TVL over window',
                    },
                    volumeTrend: {
                        type: 'number',
                        description: 'Percent change in daily volume over window',
                    },
                    score: {
                        type: 'number',
                        description: 'Composite investment score (normalized, weighted)',
                    },
                    poolDayData: { type: 'array', items: { type: 'object' } },
                },
            },
        },
    }),
    __param(0, (0, common_1.Param)('network')),
    __param(1, (0, common_1.Query)('minTVL')),
    __param(2, (0, common_1.Query)('minAPR')),
    __param(3, (0, common_1.Query)('topN')),
    __param(4, (0, common_1.Query)('aprWeight')),
    __param(5, (0, common_1.Query)('tvlWeight')),
    __param(6, (0, common_1.Query)('volatilityWeight')),
    __param(7, (0, common_1.Query)('tvlTrendWeight')),
    __param(8, (0, common_1.Query)('volumeTrendWeight')),
    __param(9, (0, common_1.Query)('historyDays')),
    __param(10, (0, common_1.Query)('strategy')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], UniswapController.prototype, "getBestPools", null);
__decorate([
    (0, common_1.Get)(':network/pools/strategy/:strategy'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get Uniswap V3 pools by investment strategy',
        description: 'Returns pools filtered and scored according to a strategy preset: low, medium, or high risk.',
    }),
    (0, swagger_1.ApiParam)({ name: 'network', required: true }),
    (0, swagger_1.ApiParam)({
        name: 'strategy',
        required: true,
        enum: ['low', 'medium', 'high'],
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of pools for the chosen strategy.',
    }),
    __param(0, (0, common_1.Param)('network')),
    __param(1, (0, common_1.Param)('strategy')),
    __param(2, (0, common_1.Query)('topN')),
    __param(3, (0, common_1.Query)('historyDays')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], UniswapController.prototype, "getPoolsByStrategy", null);
exports.UniswapController = UniswapController = UniswapController_1 = __decorate([
    (0, swagger_1.ApiTags)('Uniswap V3'),
    (0, common_1.Controller)('uniswap/v3'),
    __metadata("design:paramtypes", [uniswap_service_1.UniswapService])
], UniswapController);
//# sourceMappingURL=uniswap.controller.js.map