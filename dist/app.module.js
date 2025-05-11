"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nestjs_pino_1 = require("nestjs-pino");
const vault_module_1 = require("./vault/vault.module");
const uniswap_module_1 = require("./uniswap/uniswap.module");
const graph_module_1 = require("./graph/graph.module");
const analytics_module_1 = require("./analytics/analytics.module");
const blockchain_module_1 = require("./config/blockchain/blockchain.module");
const common_module_1 = require("./common/common.module");
const ai_agent_module_1 = require("./ai-agent/ai-agent.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            nestjs_pino_1.LoggerModule.forRoot({
                pinoHttp: {
                    transport: {
                        target: 'pino-pretty',
                        options: {
                            singleLine: true,
                            colorize: true,
                        },
                    },
                    level: 'info',
                },
            }),
            vault_module_1.VaultModule,
            uniswap_module_1.UniswapModule,
            graph_module_1.GraphModule,
            analytics_module_1.AnalyticsModule,
            blockchain_module_1.BlockchainModule,
            common_module_1.CommonModule,
            ai_agent_module_1.AiAgentModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map