import { z } from 'zod';
import { tool } from 'ai';

/**
 * Tools related to wallet functionality
 */
export const walletTools = {
  connectWallet: tool({
    description:
      '[NEVER USE FOR POOL INVESTMENTS] This tool is ONLY for non-investment wallet tasks. NEVER use this for any investment requests including "invest X in Y pool" requests. For those, use prepareInvestmentTransaction directly instead.',
    parameters: z.object({}),
    execute: async () => {
      // Using async to return a Promise as required by the tool
      return { message: 'Please connect your wallet to continue.' };
    },
  }),
};
