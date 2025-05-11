// Simple script to test AiAgentService (run with ts-node or node --loader ts-node/esm)
import 'dotenv/config';
import { AiAgentService } from './ai-agent.service';

async function main() {
  const aiAgent = new AiAgentService();
  const prompt = process.argv[2] || 'Print wallet details';

  try {
    console.log('Sending prompt to AI agent:', prompt);
    const response = await aiAgent.chat({ prompt });
    console.log('\nAI Agent Response:\n', response);
  } catch (err) {
    console.error('Error from AI Agent:', err);
  }
}

main();
