import {
  Controller,
  Get,
  Post,
  Logger,
  Param,
  Query,
  Body,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiQuery,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiOkResponse,
  ApiBody,
} from '@nestjs/swagger';
import { UniswapService, PoolWithAPR } from './uniswap.service';
import { UniswapMintService } from './uniswap-mint.service';
import { MintPositionDto } from './dto/mint-position.dto';
import { STRATEGY_PRESETS, StrategyKey } from './strategy-presets';

@ApiTags('Uniswap V3')
@Controller('uniswap/v3')
export class UniswapController {
  private readonly logger = new Logger(UniswapController.name);

  constructor(
    private readonly uniswapService: UniswapService,
    private readonly uniswapMintService: UniswapMintService,
  ) {}

  @Get(':network/pools-with-apr')
  @ApiOperation({
    summary: 'Get Uniswap V3 pools with calculated APR',
    description:
      "Fetches top pools by TVL from the specified network (currently only 'base' is supported) and calculates their estimated APR based on recent fees and TVL.",
  })
  @ApiParam({
    name: 'network',
    required: true,
    description: "The blockchain network to query (e.g., 'base').",
    type: String,
    example: 'base',
  })
  @ApiOkResponse({
    description: 'A list of Uniswap V3 pools with their calculated APR.',
    type: [Object], // In a real app, you'd use a DTO class that matches PoolWithAPR structure
  })
  async getPoolsWithAPR(
    @Param('network') network: string,
  ): Promise<PoolWithAPR[]> {
    this.logger.log(
      `Received request for pools with APR on network: ${network}`,
    );
    if (network !== 'base') {
      this.logger.warn(
        `Request for unsupported network: ${network}. UniswapService will default to 'base'.`,
      );
    }
    return this.uniswapService.getUniswapPoolsWithAPR(network);
  }

  @Get(':network/best-pools')
  @ApiOperation({
    summary: 'Get best Uniswap V3 pools by score (APR, TVL, volatility, trend)',
  })
  @ApiQuery({
    name: 'minTVL',
    required: false,
    type: Number,
    description: 'Minimum TVL (USD)',
  })
  @ApiQuery({
    name: 'minAPR',
    required: false,
    type: Number,
    description: 'Minimum APR (%)',
  })
  @ApiQuery({
    name: 'topN',
    required: false,
    type: Number,
    description: 'Number of top pools to return',
  })
  @ApiQuery({
    name: 'aprWeight',
    required: false,
    type: Number,
    description: 'Weight for APR in score (default: 0.4)',
  })
  @ApiQuery({
    name: 'tvlWeight',
    required: false,
    type: Number,
    description: 'Weight for TVL in score (default: 0.2)',
  })
  @ApiQuery({
    name: 'volatilityWeight',
    required: false,
    type: Number,
    description: 'Weight for volatility (APR stddev, penalized, default: 0.2)',
  })
  @ApiQuery({
    name: 'tvlTrendWeight',
    required: false,
    type: Number,
    description: 'Weight for TVL trend (default: 0.1)',
  })
  @ApiQuery({
    name: 'volumeTrendWeight',
    required: false,
    type: Number,
    description: 'Weight for volume trend (default: 0.1)',
  })
  @ApiQuery({
    name: 'strategy',
    required: false,
    type: String,
    description:
      "Risk strategy preset: 'low', 'medium', or 'high'. If set, applies preset weights/filters. Custom weights override preset.",
  })
  @ApiQuery({
    name: 'version',
    required: false,
    type: Number,
    description: 'Version of Uniswap to use (default: 3)',
  })
  @ApiQuery({
    name: 'historyDays',
    required: false,
    type: Number,
    description: 'Number of days for historical analytics (default: 7)',
  })
  @ApiResponse({
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
  })
  async getBestPools(
    @Param('network') network: string,
    @Query('minTVL') minTVL?: string,
    @Query('minAPR') minAPR?: string,
    @Query('topN') topN?: string,
    @Query('aprWeight') aprWeight?: string,
    @Query('tvlWeight') tvlWeight?: string,
    @Query('volatilityWeight') volatilityWeight?: string,
    @Query('tvlTrendWeight') tvlTrendWeight?: string,
    @Query('volumeTrendWeight') volumeTrendWeight?: string,
    @Query('historyDays') historyDays?: string,
    @Query('strategy') strategy?: string,
    @Query('version') version?: number,
  ): Promise<PoolWithAPR[]> {
    // Use STRATEGY_PRESETS if strategy is set
    let opts: any =
      strategy && STRATEGY_PRESETS[strategy as StrategyKey]
        ? { ...STRATEGY_PRESETS[strategy as StrategyKey] }
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
    return this.uniswapService.getBestPoolsWithScore(network, opts, version);
  }

  @Get(':network/pools/strategy/:strategy')
  @ApiOperation({
    summary: 'Get Uniswap V3 pools by investment strategy',
    description:
      'Returns pools filtered and scored according to a strategy preset: low, medium, or high risk.',
  })
  @ApiParam({ name: 'network', required: true })
  @ApiParam({
    name: 'strategy',
    required: true,
    enum: ['low', 'medium', 'high'],
  })
  @ApiParam({ name: 'version', required: false })
  @ApiResponse({
    status: 200,
    description: 'List of pools for the chosen strategy.',
  })
  async getPoolsByStrategy(
    @Param('network') network: string,
    @Param('strategy') strategy: StrategyKey,
    @Query('topN') topN?: string,
    @Query('historyDays') historyDays?: string,
  ): Promise<PoolWithAPR[]> {
    // Use STRATEGY_PRESETS for clean logic
    const preset = STRATEGY_PRESETS[strategy] || STRATEGY_PRESETS.low;
    const opts: any = {
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

  /**
   * Mint a new Uniswap V3 position (invest in a pool)
   * POST /uniswap/v3/:network/mint-position
   */
  @Post(':network/mint-position')
  @ApiOperation({
    summary: 'Mint a new Uniswap V3 position (invest in a pool)',
    description:
      'Invest in a Uniswap V3 pool by minting a new position. Returns the NFT token ID representing the position.',
  })
  @ApiBody({
    type: MintPositionDto,
    description: 'Parameters required to mint a Uniswap V3 position.',
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully minted position',
    schema: { example: { tokenId: '12345' } },
  })
  @ApiResponse({ status: 400, description: 'Invalid input or minting failed.' })
  async mintPosition(
    @Param('network') network: string,
    @Body() dto: MintPositionDto,
  ): Promise<{ tokenId: string }> {
    this.logger.log(`Received mint position request for network: ${network}`);
    if (network !== dto.network) {
      throw new BadRequestException('Network in path and body must match');
    }
    try {
      const tokenId = await this.uniswapMintService.mintPosition(dto);
      return { tokenId };
    } catch (err) {
      this.logger.error('Mint position error', err);
      throw new BadRequestException(err?.message || 'Mint position failed');
    }
  }
}
