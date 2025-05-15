import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsString,
  IsOptional,
  ValidateNested,
  IsObject,
  Min,
  IsInt,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for position price range
 */
export class PriceRangeDto {
  @ApiProperty({
    description: 'Lower bound of price range',
    type: Number,
    example: 1.05,
  })
  @IsNumber()
  lowerPrice: number;

  @ApiProperty({
    description: 'Upper bound of price range',
    type: Number,
    example: 1.25,
  })
  @IsNumber()
  upperPrice: number;
}

/**
 * DTO for current position details
 */
export class CurrentPositionDto {
  @ApiProperty({
    description: 'Uniswap V3 pool ID',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @IsString()
  poolId: string;

  @ApiProperty({
    description: 'Current position size in USD',
    type: Number,
    example: 1000,
  })
  @IsNumber()
  @Min(0)
  size: number;

  @ApiProperty({
    description: 'Current price range of the position',
    type: PriceRangeDto,
    required: false,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PriceRangeDto)
  priceRange?: PriceRangeDto;

  @ApiProperty({
    description: 'Unix timestamp when position was entered',
    type: Number,
    required: false,
    example: 1683720000, // May 10, 2023
  })
  @IsOptional()
  @IsNumber()
  entryDate?: number;
}

/**
 * DTO for position rebalancing request
 */
export class RebalancePortfolioDto {
  @ApiProperty({
    description: 'Current positions in portfolio',
    type: [CurrentPositionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurrentPositionDto)
  currentPositions: CurrentPositionDto[];

  @ApiProperty({
    description: 'Additional capital available to deploy (in USD)',
    type: Number,
    required: false,
    default: 0,
    example: 5000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  availableLiquidity?: number;

  @ApiProperty({
    description: 'Minimum change threshold to trigger a rebalance (percent)',
    type: Number,
    required: false,
    default: 10,
    example: 15,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minActionThreshold?: number;

  @ApiProperty({
    description: 'Maximum number of positions to maintain',
    type: Number,
    required: false,
    default: 10,
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxPositions?: number;
}

/**
 * DTO for rebalance action responses
 */
export enum RebalanceActionType {
  MAINTAIN = 'maintain',
  ADJUST_RANGE = 'adjust_range',
  INCREASE_SIZE = 'increase_size',
  DECREASE_SIZE = 'decrease_size',
  EXIT_POSITION = 'exit_position',
  ENTER_POSITION = 'enter_position',
}

export class RebalanceActionDto {
  @ApiProperty({
    description: 'Type of rebalancing action to take',
    enum: RebalanceActionType,
  })
  @IsEnum(RebalanceActionType)
  actionType: RebalanceActionType;

  @ApiProperty({
    description: 'Uniswap V3 pool ID',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @IsString()
  poolId: string;

  @ApiProperty({
    description: 'Token0 symbol',
    required: false,
    example: 'USDC',
  })
  @IsOptional()
  @IsString()
  token0?: string;

  @ApiProperty({
    description: 'Token1 symbol',
    required: false,
    example: 'ETH',
  })
  @IsOptional()
  @IsString()
  token1?: string;

  @ApiProperty({
    description: 'Current position size in USD',
    type: Number,
    required: false,
    example: 1000,
  })
  @IsOptional()
  @IsNumber()
  currentSize?: number;

  @ApiProperty({
    description: 'Target position size in USD',
    type: Number,
    required: false,
    example: 1500,
  })
  @IsOptional()
  @IsNumber()
  targetSize?: number;

  @ApiProperty({
    description: 'Change in size as percentage',
    type: Number,
    required: false,
    example: 50, // 50% increase
  })
  @IsOptional()
  @IsNumber()
  sizeChangePercent?: number;

  @ApiProperty({
    description: 'Current price range',
    type: PriceRangeDto,
    required: false,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PriceRangeDto)
  currentPriceRange?: PriceRangeDto;

  @ApiProperty({
    description: 'Recommended new price range',
    type: PriceRangeDto,
    required: false,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PriceRangeDto)
  recommendedPriceRange?: PriceRangeDto;

  @ApiProperty({
    description: 'Codes explaining the reason for rebalance',
    type: [String],
    example: ['apr_decline', 'range_inefficiency'],
  })
  @IsArray()
  @IsString({ each: true })
  reasonCodes: string[];

  @ApiProperty({
    description: 'Human-readable explanations for the rebalance action',
    type: [String],
    example: ['Pool APR has declined by 12.5%', 'Position range is no longer optimal'],
  })
  @IsArray()
  @IsString({ each: true })
  reasons: string[];

  @ApiProperty({
    description: 'Priority of the action (1-10 scale, 10 being highest)',
    type: Number,
    minimum: 1,
    maximum: 10,
    example: 8,
  })
  @IsNumber()
  @Min(1)
  priority: number;
}

/**
 * DTO for the rebalance portfolio response
 */
export class RebalancePortfolioResponseDto {
  @ApiProperty({
    description: 'Risk strategy used for recommendations',
    enum: ['low', 'medium', 'high'],
    example: 'medium',
  })
  strategy: string;

  @ApiProperty({
    description: 'Number of recommendations returned',
    type: Number,
    example: 3,
  })
  recommendationsCount: number;

  @ApiProperty({
    description: 'List of rebalancing action recommendations',
    type: [RebalanceActionDto],
  })
  recommendations: RebalanceActionDto[];

  @ApiProperty({
    description: 'Market conditions at time of recommendation',
    type: Object,
    example: {
      timestamp: 1683720000,
      network: 'base',
      poolsAnalyzed: 150,
    },
  })
  marketConditions: {
    timestamp: number;
    network: string;
    poolsAnalyzed: number;
  };
}
