import { ApolloClient, NormalizedCacheObject } from '@apollo/client/core';
import { ConfigService } from '@nestjs/config';
export declare class GraphqlClientService {
    private readonly configService;
    private readonly logger;
    private apolloClient;
    constructor(configService: ConfigService);
    getClient(): ApolloClient<NormalizedCacheObject>;
}
