"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AiAgentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiAgentService = void 0;
const common_1 = require("@nestjs/common");
const agentkit_vercel_ai_sdk_1 = require("@coinbase/agentkit-vercel-ai-sdk");
const agentkit_1 = require("@coinbase/agentkit");
const ai_1 = require("ai");
const openai_1 = require("@ai-sdk/openai");
const strategy_presets_1 = require("../uniswap/strategy-presets");
let AiAgentService = AiAgentService_1 = class AiAgentService {
    agentKit = null;
    tools = null;
    logger = new common_1.Logger(AiAgentService_1.name);
    async ensureInitialized() {
        if (!this.agentKit) {
            this.agentKit = await agentkit_1.AgentKit.from({
                cdpApiKeyName: process.env.CDP_API_KEY_NAME,
                cdpApiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY,
            });
            this.logger.log('AgentKit initialized');
        }
        if (!this.tools) {
            const vercelTools = await (0, agentkit_vercel_ai_sdk_1.getVercelAITools)(this.agentKit);
            const { uniswapTools } = await Promise.resolve().then(() => require('./tools/uniswap.tools'));
            const uniswapToolsObject = Object.fromEntries(uniswapTools.map((tool) => [tool.name, tool]));
            this.tools = { ...vercelTools, ...uniswapToolsObject };
            this.logger.log('Vercel AI tools + Uniswap tools initialized. Tool count: ' +
                Object.keys(this.tools).length);
        }
    }
    async chat({ prompt, system, maxSteps = 10, strategy, }) {
        await this.ensureInitialized();
        let systemPrompt = system;
        if (!systemPrompt && strategy && strategy_presets_1.STRATEGY_PRESETS[strategy]) {
            systemPrompt = strategy_presets_1.STRATEGY_PRESETS[strategy].systemPrompt;
        }
        if (!systemPrompt) {
            systemPrompt = 'You are an onchain AI assistant with access to a wallet.';
        }
        const { text } = await (0, ai_1.generateText)({
            model: (0, openai_1.openai)('gpt-4o-mini'),
            system: systemPrompt,
            prompt,
            tools: this.tools,
            maxSteps,
        });
        return text;
    }
};
exports.AiAgentService = AiAgentService;
exports.AiAgentService = AiAgentService = AiAgentService_1 = __decorate([
    (0, common_1.Injectable)()
], AiAgentService);
//# sourceMappingURL=ai-agent.service.js.map