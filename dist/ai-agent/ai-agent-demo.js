"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const ai_agent_service_1 = require("./ai-agent.service");
async function main() {
    const aiAgent = new ai_agent_service_1.AiAgentService();
    const prompt = process.argv[2] || 'Print wallet details';
    try {
        console.log('Sending prompt to AI agent:', prompt);
        const response = await aiAgent.chat({ prompt });
        console.log('\nAI Agent Response:\n', response);
    }
    catch (err) {
        console.error('Error from AI Agent:', err);
    }
}
main();
//# sourceMappingURL=ai-agent-demo.js.map