import { Injectable, Logger } from '@nestjs/common';
import {
  RemovePositionDto,
  RemovePositionResponseDto,
} from './dto/remove-position.dto';
import { removeLiquidity } from './remove-position';

@Injectable()
export class UniswapRemoveService {
  private readonly logger = new Logger(UniswapRemoveService.name);

  /**
   * Removes liquidity from a Uniswap V3 position
   * @param dto The parameters for removing liquidity
   * @returns Result of the removal operation
   */
  async removePosition(
    dto: RemovePositionDto,
  ): Promise<RemovePositionResponseDto> {
    this.logger.log(`Removing liquidity from position #${dto.tokenId}`);

    try {
      const result = await removeLiquidity({
        tokenId: dto.tokenId,
        network: dto.network,
        slippageTolerance: dto.slippageTolerance,
        recipient: dto.recipient,
        burnNFT: dto.burnNFT,
      });

      this.logger.log(
        `Successfully removed liquidity from position #${dto.tokenId}. ` +
          `Amounts removed: ${result.amount0Removed} token0, ${result.amount1Removed} token1. ` +
          `Position burned: ${result.positionBurned}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error removing liquidity from position #${dto.tokenId}:`,
        error,
      );
      throw error;
    }
  }
}
