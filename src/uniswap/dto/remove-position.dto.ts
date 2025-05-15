import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class RemovePositionDto {
  @ApiProperty({
    description: 'Token ID of the position to remove liquidity from',
    example: '21850',
  })
  @IsString()
  tokenId: string;

  @ApiPropertyOptional({
    description: 'Network to use (default: base-sepolia)',
    example: 'base-sepolia',
    enum: ['base-mainnet', 'base-sepolia'],
  })
  @IsString()
  @IsOptional()
  network?: string;

  @ApiPropertyOptional({
    description: 'Slippage tolerance in percentage (default: 0.5%)',
    example: 0.5,
    minimum: 0.01,
    maximum: 100,
  })
  @IsNumber()
  @IsOptional()
  slippageTolerance?: number;

  @ApiPropertyOptional({
    description: 'Whether to burn the NFT position after removing liquidity',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  burnNFT?: boolean;

  @ApiPropertyOptional({
    description: 'Recipient address for tokens (defaults to wallet address)',
    example: '0x0000000000000000000000000000000000000000',
  })
  @IsString()
  @IsOptional()
  recipient?: string;
}

export class RemovePositionResponseDto {
  @ApiProperty({
    description: 'Transaction hash of the liquidity removal',
    example: '0x123abc...',
  })
  transactionHash: string;

  @ApiProperty({
    description: 'Amount of token0 removed',
    example: '1000000000000000000',
  })
  amount0Removed: string;

  @ApiProperty({
    description: 'Amount of token1 removed',
    example: '500000000',
  })
  amount1Removed: string;

  @ApiProperty({
    description: 'Whether the position NFT was burned',
    example: false,
  })
  positionBurned: boolean;
}
