import { Injectable, Logger } from '@nestjs/common';
import {
  ApolloClient,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client/core';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GraphqlClientService {
  private readonly logger = new Logger(GraphqlClientService.name);
  private v3Client: ApolloClient<NormalizedCacheObject>;
  private v4Client: ApolloClient<NormalizedCacheObject>;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GRAPH_API_KEY');
    if (!apiKey) {
      this.logger.error(
        'GRAPH_API_KEY is not defined in environment variables.',
      );
      throw new Error('Graph API Key not defined');
    }

    // Initialize V3 Client
    const v3SubgraphUrl = this.configService.get<string>(
      'UNISWAP_V3_BASE_SUBGRAPH_URL',
    );
    if (!v3SubgraphUrl) {
      this.logger.error(
        'UNISWAP_V3_BASE_SUBGRAPH_URL is not defined in environment variables.',
      );
      throw new Error('V3 Subgraph URL not defined');
    }
    this.v3Client = this.createClient(v3SubgraphUrl, apiKey);

    // Initialize V4 Client
    const v4SubgraphUrl = this.configService.get<string>(
      'UNISWAP_V4_BASE_SUBGRAPH_URL',
    );
    if (!v4SubgraphUrl) {
      this.logger.error(
        'UNISWAP_V4_BASE_SUBGRAPH_URL is not defined in environment variables.',
      );
      throw new Error('V4 Subgraph URL not defined');
    }
    this.v4Client = this.createClient(v4SubgraphUrl, apiKey);
  }

  /**
   * Creates an Apollo client with the specified URL and API key
   */
  private createClient(
    uri: string,
    apiKey: string,
  ): ApolloClient<NormalizedCacheObject> {
    return new ApolloClient({
      uri,
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

  /**
   * Returns the Uniswap V3 GraphQL client
   */
  getClient(): ApolloClient<NormalizedCacheObject> {
    return this.v3Client;
  }

  /**
   * Returns the Uniswap V4 GraphQL client
   */
  getClientV4(): ApolloClient<NormalizedCacheObject> {
    return this.v4Client;
  }
}
