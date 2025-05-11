import { Module } from '@nestjs/common';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';

import { GraphqlClientService } from './graphql-client.service';

@Module({
  controllers: [GraphController],
  providers: [GraphService, GraphqlClientService],
  exports: [GraphqlClientService],
})
export class GraphModule {}
