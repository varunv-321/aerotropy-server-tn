import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AiAgentService } from './ai-agent.service';

@ApiTags('AI Agent')
@Controller('ai-agent')
export class AiAgentController {
  private readonly logger = new Logger(AiAgentController.name);

  constructor(private readonly aiAgentService: AiAgentService) {}

  @Post('chat')
  @ApiOperation({
    summary: 'Chat with the onchain AI agent',
    description: 'Send a prompt to the AI agent and get a response.',
  })
  @ApiResponse({
    status: 200,
    description: 'AI agent response',
    schema: { example: { text: '...' } },
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Prompt for the AI agent',
          example: 'Print wallet details',
        },
        system: {
          type: 'string',
          description: 'Optional system prompt for LLM',
          example: 'You are an onchain AI assistant.',
        },
        maxSteps: {
          type: 'integer',
          description: 'Optional max tool steps',
          example: 10,
        },
      strategy: {
        type: 'string',
        description: 'Investment strategy preset (low, medium, high)',
        enum: ['low', 'medium', 'high'],
        example: 'low',
      },
      },
      required: ['prompt'],
    },
  })
  async chat(
    @Body() body: { prompt: string; system?: string; maxSteps?: number; strategy?: 'low' | 'medium' | 'high' },
  ) {
    this.logger.log(`Received chat request: ${JSON.stringify(body)}`);
    try {
      const text = await this.aiAgentService.chat(body);
      return { text };
    } catch (err) {
      this.logger.error('AI agent error', err);
      throw err;
    }
  }
}
