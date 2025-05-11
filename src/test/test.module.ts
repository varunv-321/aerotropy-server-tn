import { Module } from '@nestjs/common';
import { IntegrationService } from './integration/integration.service';

@Module({
  providers: [IntegrationService]
})
export class TestModule {}
