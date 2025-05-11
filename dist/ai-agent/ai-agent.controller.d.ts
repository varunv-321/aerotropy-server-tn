import { AiAgentService } from './ai-agent.service';
export declare class AiAgentController {
    private readonly aiAgentService;
    private readonly logger;
    constructor(aiAgentService: AiAgentService);
    chat(body: {
        prompt: string;
        system?: string;
        maxSteps?: number;
        strategy?: 'low' | 'medium' | 'high';
    }): Promise<{
        text: string;
    }>;
}
