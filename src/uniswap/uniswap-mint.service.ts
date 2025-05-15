import { Injectable, Logger } from '@nestjs/common';
import { MintPositionDto } from './dto/mint-position.dto';
import { mintNewPosition } from './mint-position';

@Injectable()
export class UniswapMintService {
  private readonly logger = new Logger(UniswapMintService.name);

  async mintPosition(dto: MintPositionDto): Promise<string> {
    this.logger.log(
      `Minting position for pool ${dto.poolData.id} on network ${dto.network}`,
    );
    try {
      // Call the core minting logic (from mint-position.ts)
      const tokenId = await mintNewPosition(dto);
      this.logger.log(`Successfully minted position with tokenId: ${tokenId}`);
      return tokenId;
    } catch (error) {
      this.logger.error('Error minting position', error);
      throw error;
    }
  }
}
