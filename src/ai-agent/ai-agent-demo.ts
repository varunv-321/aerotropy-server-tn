// Simple script to test AiAgentService (run with ts-node or node --loader ts-node/esm)
import 'dotenv/config';
import { AiAgentService } from './ai-agent.service';
import { Message } from 'ai';

async function main() {
  const aiAgent = new AiAgentService();
  const userInput = process.argv[2] || 'Print wallet details';

  // Create a messages array with a single user message
  const messages: Message[] = [
    {
      id: '1',
      role: 'user',
      content: userInput,
    },
  ];

  try {
    console.log('Sending message to AI agent:', userInput);
    const response = await aiAgent.chat({ messages });
    console.log('\nAI Agent Response:\n', response);
  } catch (err) {
    console.error('Error from AI Agent:', err);
  }
}

main();
