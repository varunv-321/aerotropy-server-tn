import {
  IsString,
  IsNumberString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class TokenInfoDto {
  @IsString()
  id: string;

  @IsString()
  symbol: string;

  @IsString()
  name: string;

  @IsNumberString()
  decimals: string;
}

export class PoolDataDto {
  @IsString()
  id: string;

  @IsString()
  feeTier: string;

  @ValidateNested()
  @Type(() => TokenInfoDto)
  token0: TokenInfoDto;

  @ValidateNested()
  @Type(() => TokenInfoDto)
  token1: TokenInfoDto;
}

export class MintPositionDto {
  @ValidateNested()
  @Type(() => PoolDataDto)
  poolData: PoolDataDto;

  @IsNumberString()
  amount0: string;

  @IsNumberString()
  amount1: string;

  @IsInt()
  @Min(1)
  tickLowerOffset: number;

  @IsInt()
  @Min(1)
  tickUpperOffset: number;

  @IsString()
  network: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  slippageTolerance: number;
}
