import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { POOLS, Pool } from '../common/utils/pool.constants';
import { TOKENS, StandardToken } from '../common/utils/token.constants';

// Import the ABI from the specified location
import { POOL_ABI } from '../contracts/abi/POOL_ABI';

// Define types for balance data
export type UserTokenBalance = {
  token: StandardToken;
  balance: string; // Human-readable balance with proper decimals
  rawBalance: string; // Raw balance in wei/smallest unit
  formattedBalance: string; // Balance with symbol, e.g., '10.5 USDC'
  valueUSD?: string; // Estimated value in USD (if available)
};

export type UserPoolBalance = {
  pool: Pool;
  tokenBalances: UserTokenBalance[];
  totalValueUSD?: string; // Sum of all token values in USD
};

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private provider: ethers.JsonRpcProvider;

  constructor() {
    // Initialize provider with the RPC URL (from environment variable)
    const rpcUrl = process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.logger.log(`Dashboard service initialized with RPC URL: ${rpcUrl}`);
  }

  /**
   * Get user balances for all pools and all tokens
   * @param walletAddress The wallet address to check balances for
   * @returns Array of pool balances with token balances for each pool
   */
  /**
   * Helper method to convert BigInt values to strings in objects for JSON serialization
   * This recursively processes objects and arrays to convert any BigInt to string
   */
  private convertBigIntToString(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle BigInt values
    if (typeof obj === 'bigint') {
      return obj.toString();
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => this.convertBigIntToString(item));
    }

    // Handle objects
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          result[key] = this.convertBigIntToString(obj[key]);
        }
      }
      return result;
    }

    // Return primitive values as is
    return obj;
  }

  async getUserBalances(walletAddress: string): Promise<UserPoolBalance[]> {
    try {
      // Format the wallet address to ensure it has the 0x prefix
      const formattedAddress = walletAddress.startsWith('0x')
        ? walletAddress
        : `0x${walletAddress}`;

      this.logger.log(`Getting balances for wallet: ${formattedAddress}`);

      // Get balances for each pool
      const poolBalances = await Promise.all(
        POOLS.map((pool) => this.getUserPoolBalance(formattedAddress, pool)),
      );

      // Convert BigInt values to strings for JSON serialization
      return this.convertBigIntToString(poolBalances);
    } catch (error) {
      this.logger.error(
        `Error getting user balances: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get user balances for a specific pool for all tokens
   * @param walletAddress The wallet address to check balances for
   * @param pool The pool to check balances in
   * @returns Pool balance with token balances
   */
  async getUserPoolBalance(
    walletAddress: string,
    pool: Pool,
  ): Promise<UserPoolBalance> {
    try {
      this.logger.log(
        `Getting balances for wallet: ${walletAddress} in pool: ${pool.name}`,
      );

      // Create contract instance
      const poolContract = new ethers.Contract(
        pool.address,
        POOL_ABI,
        this.provider,
      );

      // Get token balances in this pool
      const tokenBalances = await Promise.all(
        TOKENS.map((token) =>
          this.getTokenBalance(walletAddress, pool, token, poolContract),
        ),
      );

      // Calculate total value in USD (if possible)
      let totalValueUSD: string | undefined;
      const validUsdValues = tokenBalances
        .filter((balance) => balance.valueUSD !== undefined)
        .map((balance) => parseFloat(balance.valueUSD || '0'));

      if (validUsdValues.length > 0) {
        const total = validUsdValues.reduce((sum, value) => sum + value, 0);
        totalValueUSD = total.toFixed(2);
      }

      // Convert BigInt values to strings for JSON serialization
      return this.convertBigIntToString({
        pool,
        tokenBalances,
        totalValueUSD,
      });
    } catch (error) {
      this.logger.error(
        `Error getting pool balance for ${pool.name}: ${error.message}`,
        error.stack,
      );
      // Return empty balance rather than failing completely
      return {
        pool,
        tokenBalances: [],
      };
    }
  }

  /**
   * Get balance for a specific token in a specific pool
   * @param walletAddress The wallet address to check balance for
   * @param pool The pool to check balance in
   * @param token The token to check balance for
   * @param poolContract The ethers contract instance (optional, will create if not provided)
   * @returns Token balance information
   */
  async getTokenBalance(
    walletAddress: string,
    pool: Pool,
    token: StandardToken,
    poolContract?: ethers.Contract,
  ): Promise<UserTokenBalance> {
    try {
      // Create contract instance if not provided
      const contract =
        poolContract ||
        new ethers.Contract(pool.address, POOL_ABI, this.provider);

      let rawBalance = '0';
      try {
        // Check if user has any balance of this token in this pool
        // This assumes the contract has a balanceOf method that takes a token ID and address
        rawBalance = await contract.balanceOf(walletAddress, token.tokenId);
      } catch (error) {
        this.logger.warn(
          `Could not get balance for token ${token.symbol} in pool ${pool.name}: ${error.message}`,
        );
        // Fall back to 0 balance
        rawBalance = '0';
      }

      const balance = ethers.formatUnits(rawBalance, token.decimals);

      // Format with symbol
      const formattedBalance = `${balance} ${token.symbol}`;

      // For USD value we would need price data - in a real app this would come from an oracle or API
      // This is a placeholder
      const valueUSD = this.calculateUSDValue(balance, token.symbol);

      // Convert BigInt values to strings for JSON serialization
      return this.convertBigIntToString({
        token,
        balance,
        rawBalance: rawBalance.toString(),
        formattedBalance,
        valueUSD,
      });
    } catch (error) {
      this.logger.error(
        `Error getting token balance for ${token.symbol}: ${error.message}`,
        error.stack,
      );
      // Return zero balance rather than failing
      return {
        token,
        balance: '0',
        rawBalance: '0',
        formattedBalance: `0 ${token.symbol}`,
      };
    }
  }

  /**
   * Calculate USD value for a token amount (placeholder implementation)
   * In a real application, this would use an oracle or price API
   * @param amount The token amount
   * @param symbol The token symbol
   * @returns Estimated USD value or undefined if not available
   */
  private calculateUSDValue(
    amount: string,
    symbol: string,
  ): string | undefined {
    // This is a placeholder implementation with hardcoded prices
    // In a real application, these values would come from an oracle or price API
    const mockPrices: Record<string, number> = {
      WETH: 3000, // $3000 per ETH
      USDC: 1, // $1 per USDC
      DAI: 1, // $1 per DAI
      USDT: 1, // $1 per USDT
    };

    const price = mockPrices[symbol];
    if (price === undefined) {
      return undefined;
    }

    const value = parseFloat(amount) * price;
    return value.toFixed(2);
  }
}
