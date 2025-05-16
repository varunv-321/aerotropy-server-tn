import { z } from 'zod';
import { tool } from 'ai';

/**
 * Tools related to wallet functionality
 */
export const walletTools = {
  connectWallet: tool({
    description:
      '[DO NOT USE FOR POOL INVESTMENTS] If user is not connected to a wallet, and if he is asking for any task which requires wallet address or wallet connection (EXCEPT pool investments) then ask the user to connect their wallet',
    parameters: z.object({}),
    execute: async () => {
      return { message: 'Please connect your wallet to continue.' };
    },
  }),
};
