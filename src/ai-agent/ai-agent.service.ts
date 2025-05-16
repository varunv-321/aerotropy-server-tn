import { Injectable, Logger } from '@nestjs/common';
import { getVercelAITools } from '@coinbase/agentkit-vercel-ai-sdk';
import { AgentKit } from '@coinbase/agentkit';
import { generateText, streamText, Message } from 'ai';
import { openai } from '@ai-sdk/openai';
import { STRATEGY_PRESETS, StrategyKey } from '../uniswap/strategy-presets';

@Injectable()
export class AiAgentService {
  private agentKit: AgentKit | null = null;
  private tools: any = null;
  private readonly logger = new Logger(AiAgentService.name);

  /**
   * Ensure AgentKit and tools are initialized (cached after first use)
   */
  private async ensureInitialized() {
    if (!this.agentKit) {
      this.agentKit = await AgentKit.from({
        cdpApiKeyName: process.env.CDP_API_KEY_NAME!,
        cdpApiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY!,
      });
      this.logger.log('AgentKit initialized');
    }
    if (!this.tools) {
      const vercelTools = await getVercelAITools(this.agentKit);
      const { uniswapTools } = await import('./tools/uniswap.tools');
      const { poolInvestmentTools } = await import(
        './tools/pool-investment.tools'
      );

      // Merge tools as an object (ToolSet), per Vercel AI SDK docs
      const uniswapToolsObject = Object.fromEntries(
        uniswapTools.map((tool) => [tool.name, tool]),
      );

      const poolInvestmentToolsObject = Object.fromEntries(
        poolInvestmentTools.map((tool) => [tool.name, tool]),
      );

      this.tools = {
        ...vercelTools,
        ...uniswapToolsObject,
        ...poolInvestmentToolsObject,
      };
      this.logger.log(
        'Vercel AI tools + Uniswap tools + Pool Investment tools initialized. Tool count: ' +
          Object.keys(this.tools).length,
      );
    }
  }

  /**
   * Generate a streaming response using OpenAI + AgentKit tools
   * @param messages - Array of user and assistant messages for conversation context
   * @param system - (Optional) System prompt for LLM
   * @param maxSteps - (Optional) Max tool steps
   * @returns Streamable response that can be piped to HTTP response
   */
  async chatStream({
    messages,
    walletAddress,
    strategy,
  }: {
    messages: Message[];
    walletAddress: string;
    strategy?: StrategyKey;
  }) {
    try {
      await this.ensureInitialized();

      // If a strategy is provided, override system prompt
      let systemPrompt = '';
      if (!systemPrompt && strategy && STRATEGY_PRESETS[strategy]) {
        systemPrompt = STRATEGY_PRESETS[strategy].systemPrompt;
      }
      if (!systemPrompt) {
        systemPrompt =
          'You are an onchain AI assistant with access to a wallet: ' +
          walletAddress +
          '. You can help users invest in different risk pools (low, medium, high) using various tokens (USDT, USDC, DAI, ETH). When a user asks to invest a specific amount in a pool, prepare a transaction for them.';
      }

      this.logger.log('System prompt: ' + systemPrompt);
      this.logger.log('Messages: ' + JSON.stringify(messages));

      // Return a streamable result that can be piped to the response
      return streamText({
        model: openai('gpt-4o-mini'), // Requires OPENAI_API_KEY in env
        system: systemPrompt,
        messages,
        tools: this.tools,
        maxSteps: 10,
      });
    } catch (err) {
      this.logger.error('AI agent streaming error', err);
      throw err;
    }
  }
}
