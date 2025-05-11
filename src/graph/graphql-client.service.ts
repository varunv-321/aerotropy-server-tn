import { Injectable, Logger } from '@nestjs/common';
import { ApolloClient, InMemoryCache, gql, NormalizedCacheObject } from '@apollo/client/core';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GraphqlClientService {
  private readonly logger = new Logger(GraphqlClientService.name);
  private apolloClient: ApolloClient<NormalizedCacheObject>;

  constructor(private readonly configService: ConfigService) {
    const subgraphUrl = this.configService.get<string>('UNISWAP_V3_BASE_SUBGRAPH_URL');
    const apiKey = this.configService.get<string>('GRAPH_API_KEY');

    if (!subgraphUrl) {
      this.logger.error('UNISWAP_V3_BASE_SUBGRAPH_URL is not defined in environment variables.');
      throw new Error('Subgraph URL not defined');
    }
    if (!apiKey) {
      this.logger.error('GRAPH_API_KEY is not defined in environment variables.');
      throw new Error('Graph API Key not defined');
    }

    this.apolloClient = new ApolloClient({
      uri: subgraphUrl,
      cache: new InMemoryCache(),
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      defaultOptions: {
        watchQuery: {
          fetchPolicy: 'cache-and-network',
        },
        query: {
          fetchPolicy: 'cache-first',
        },
      },
    });
  }

  getClient(): ApolloClient<NormalizedCacheObject> {
    return this.apolloClient;
  }
}
