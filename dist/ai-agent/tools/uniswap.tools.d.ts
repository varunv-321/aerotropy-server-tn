import { z } from 'zod';
export declare const uniswapTools: {
    name: string;
    description: string;
    parameters: z.ZodObject<{
        network: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        network: string;
    }, {
        network: string;
    }>;
    execute({ network }: {
        network: any;
    }): Promise<any>;
}[];
