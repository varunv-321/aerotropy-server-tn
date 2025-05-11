"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniswapModule = void 0;
const common_1 = require("@nestjs/common");
const uniswap_controller_1 = require("./uniswap.controller");
const uniswap_service_1 = require("./uniswap.service");
const graph_module_1 = require("../graph/graph.module");
let UniswapModule = class UniswapModule {
};
exports.UniswapModule = UniswapModule;
exports.UniswapModule = UniswapModule = __decorate([
    (0, common_1.Module)({
        imports: [graph_module_1.GraphModule],
        controllers: [uniswap_controller_1.UniswapController],
        providers: [uniswap_service_1.UniswapService],
        exports: [uniswap_service_1.UniswapService],
    })
], UniswapModule);
//# sourceMappingURL=uniswap.module.js.map