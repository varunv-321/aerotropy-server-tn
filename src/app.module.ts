import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { VaultModule } from './vault/vault.module';
import { UniswapModule } from './uniswap/uniswap.module';
import { GraphModule } from './graph/graph.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BlockchainModule } from './config/blockchain/blockchain.module';
import { CommonModule } from './common/common.module';
import { User } from './vault/entities/user/user';
import { Deposit } from './vault/entities/deposit/deposit';
import { AiAgentModule } from './ai-agent/ai-agent.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    // Configuration module for environment variables
    ConfigModule.forRoot({
      isGlobal: true, // Make ConfigService available globally
      envFilePath: '.env', // Load .env file
    }),

    // Pino logger for structured logging
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty', // Pretty print logs in development
          options: {
            singleLine: true,
            colorize: true,
          },
        },
        level: 'info', // Set log level
      },
    }),

    // TypeORM with PostgreSQL
    // TypeOrmModule.forRootAsync({
    //   imports: [ConfigModule],
    //   useFactory: (configService: ConfigService) => ({
    //     type: 'postgres',
    //     url: configService.get<string>('DATABASE_URL'),
    //     entities: [User, Deposit],
    //     synchronize: true, // Set to false in production, use migrations
    //     logging: ['error', 'warn'], // Log only errors and warnings
    //   }),
    //   inject: [ConfigService],
    // }),

    // Feature modules
    VaultModule,
    UniswapModule,
    GraphModule,
    AnalyticsModule,
    BlockchainModule,
    CommonModule,
    AiAgentModule,
    DashboardModule,
  ],
})
export class AppModule {}
