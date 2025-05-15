import { Controller, Post, Body, Logger, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AiAgentService } from './ai-agent.service';
import { Response } from 'express';

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
    @Body()
    body: {
      prompt: string;
      system?: string;
      maxSteps?: number;
      strategy?: 'low' | 'medium' | 'high';
    },
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

  @Post('chat/stream')
  @ApiOperation({
    summary: 'Chat with the onchain AI agent (streaming response)',
    description: 'Send a prompt to the AI agent and get a streaming response.',
  })
  @ApiResponse({
    status: 200,
    description: 'AI agent streaming response',
    content: {
      'text/plain': {
        schema: { type: 'string' },
      },
    },
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'User prompt for the AI agent.',
          example: 'Show me high APR pools on Base.',
        },
        system: {
          type: 'string',
          description: 'Optional system prompt for the LLM.',
        },
        maxSteps: {
          type: 'number',
          description: 'Maximum number of tool steps to run.',
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
  async chatStream(
    @Body()
    body: {
      prompt: string;
      system?: string;
      maxSteps?: number;
      strategy?: 'low' | 'medium' | 'high';
    },
    @Res() res: Response,
  ) {
    this.logger.log(`Received streaming chat request: ${JSON.stringify(body)}`);
    try {
      const stream = await this.aiAgentService.chatStream(body);
      // Send appropriate headers for streaming
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      // Pipe the stream directly to the response
      stream.pipeTextStreamToResponse(res);
    } catch (err) {
      this.logger.error('AI agent streaming error', err);
      // If streaming hasn't started yet, we can send an error response
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Streaming chat failed' });
      } else {
        // If headers are already sent, we need to close the connection
        res.end(`\nError: ${err.message || 'Streaming chat failed'}`);
      }
    }
  }
}
