import { ApiProperty } from '@nestjs/swagger';
import { StandardToken } from '../../common/utils/token.constants';
import { Pool } from '../../common/utils/pool.constants';

/**
 * DTO for token balance information
 */
export class TokenBalanceDto {
  @ApiProperty({
    description: 'Token information',
    example: {
      name: 'Ethereum',
      symbol: 'ETH',
      address: '0x...',
      decimals: 18,
      tokenId: 1,
    },
  })
  token: StandardToken;

  @ApiProperty({
    description: 'Human-readable balance with proper decimals',
    example: '10.5',
  })
  balance: string;

  @ApiProperty({
    description: 'Raw balance in wei/smallest unit',
    example: '10500000000000000000',
  })
  rawBalance: string;

  @ApiProperty({
    description: 'Balance with symbol',
    example: '10.5 ETH',
  })
  formattedBalance: string;

  @ApiProperty({
    description: 'Estimated value in USD',
    example: '31500.00',
    required: false,
  })
  valueUSD?: string;
}

/**
 * DTO for pool balance information
 */
export class PoolBalanceDto {
  @ApiProperty({
    description: 'Pool information',
    example: {
      name: 'High Growth Pool',
      address: '0x...',
    },
  })
  pool: Pool;

  @ApiProperty({
    description: 'Token balances in this pool',
    type: [TokenBalanceDto],
  })
  tokenBalances: TokenBalanceDto[];

  @ApiProperty({
    description: 'Total value of all tokens in USD',
    example: '45000.00',
    required: false,
  })
  totalValueUSD?: string;
}
