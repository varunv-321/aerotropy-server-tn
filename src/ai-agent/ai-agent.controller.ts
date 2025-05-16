import { Controller, Post, Body, Logger, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AiAgentService } from './ai-agent.service';
import { Response } from 'express';
import { Message } from 'ai';

@ApiTags('AI Agent')
@Controller('ai-agent')
export class AiAgentController {
  private readonly logger = new Logger(AiAgentController.name);

  constructor(private readonly aiAgentService: AiAgentService) {}

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
        messages: {
          type: 'array',
          description:
            'Array of previous messages in the conversation for context',
          items: {
            type: 'object',
            properties: {
              role: {
                type: 'string',
                enum: ['user', 'assistant', 'system'],
                description: 'Role of the message sender',
              },
              content: {
                type: 'string',
                description: 'Content of the message',
              },
            },
          },
        },
        walletAddress: {
          type: 'string',
          description: 'Wallet address of the user.',
        },
      },
      required: ['messages'],
    },
  })
  async chatStream(
    @Body()
    body: {
      messages: Message[];
      walletAddress: string;
    },
    @Res() res: Response,
  ) {
    this.logger.log(`Received streaming chat request: ${JSON.stringify(body)}`);
    try {
      const stream = await this.aiAgentService.chatStream(body);

      // Set headers for streaming plain text
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');

      // Pipe the stream directly to the response
      stream.pipeDataStreamToResponse(res);
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
