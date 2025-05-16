import { Injectable, Logger } from '@nestjs/common';
import { getVercelAITools } from '@coinbase/agentkit-vercel-ai-sdk';
import { AgentKit } from '@coinbase/agentkit';
import { streamText, Message } from 'ai';
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
  }: {
    messages: Message[];
    walletAddress: string;
  }) {
    try {
      await this.ensureInitialized();

      // Determine strategy from user messages
      const strategy = this.determineStrategyFromMessages(messages);
      this.logger.log(`Determined strategy from messages: ${strategy}`);

      // Set system prompt based on determined strategy
      let systemPrompt = '';
      if (strategy && STRATEGY_PRESETS[strategy]) {
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

      // Configure the AI stream with options for proper streaming
      // Use type assertion to bypass TypeScript errors for experimental features
      // @ts-ignore - experimental parameters not in types yet
      return streamText({
        model: openai('gpt-4o-mini'), // Requires OPENAI_API_KEY in env
        system: systemPrompt,
        messages,
        tools: this.tools,
        maxSteps: 10,
        temperature: 0.7, // Add some variability to responses
      });
    } catch (err) {
      this.logger.error('AI agent streaming error', err);
      throw err;
    }
  }

  /**
   * Determine investment strategy based on user messages
   * @param messages - Array of conversation messages
   * @returns Determined strategy (low, medium, high) or undefined if no strategy can be determined
   */
  private determineStrategyFromMessages(
    messages: Message[],
  ): StrategyKey | undefined {
    // Get the last user message to analyze
    const lastUserMessage = [...messages]
      .reverse()
      .find((msg) => msg.role === 'user');

    if (!lastUserMessage) {
      return undefined;
    }

    const content = lastUserMessage.content.toLowerCase();

    // Check for explicit mentions of risk levels
    if (
      content.includes('low risk') ||
      content.includes('safe investment') ||
      content.includes('conservative') ||
      content.includes('stable')
    ) {
      return 'low';
    }

    if (
      content.includes('high risk') ||
      content.includes('aggressive') ||
      content.includes('high return') ||
      content.includes('high yield') ||
      content.includes('high apr')
    ) {
      return 'high';
    }

    if (
      content.includes('medium risk') ||
      content.includes('moderate risk') ||
      content.includes('balanced')
    ) {
      return 'medium';
    }

    // Check for numeric indicators
    if (content.includes('best 3') || content.includes('top 3')) {
      if (content.includes('medium risk')) {
        return 'medium';
      }
    }

    // Default to medium risk if no clear preference is detected
    return 'medium';
  }
}
