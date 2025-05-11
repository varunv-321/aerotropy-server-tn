"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AiAgentController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiAgentController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const ai_agent_service_1 = require("./ai-agent.service");
let AiAgentController = AiAgentController_1 = class AiAgentController {
    aiAgentService;
    logger = new common_1.Logger(AiAgentController_1.name);
    constructor(aiAgentService) {
        this.aiAgentService = aiAgentService;
    }
    async chat(body) {
        this.logger.log(`Received chat request: ${JSON.stringify(body)}`);
        try {
            const text = await this.aiAgentService.chat(body);
            return { text };
        }
        catch (err) {
            this.logger.error('AI agent error', err);
            throw err;
        }
    }
};
exports.AiAgentController = AiAgentController;
__decorate([
    (0, common_1.Post)('chat'),
    (0, swagger_1.ApiOperation)({
        summary: 'Chat with the onchain AI agent',
        description: 'Send a prompt to the AI agent and get a response.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'AI agent response',
        schema: { example: { text: '...' } },
    }),
    (0, swagger_1.ApiBody)({
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
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiAgentController.prototype, "chat", null);
exports.AiAgentController = AiAgentController = AiAgentController_1 = __decorate([
    (0, swagger_1.ApiTags)('AI Agent'),
    (0, common_1.Controller)('ai-agent'),
    __metadata("design:paramtypes", [ai_agent_service_1.AiAgentService])
], AiAgentController);
//# sourceMappingURL=ai-agent.controller.js.map