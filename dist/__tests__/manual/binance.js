"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ccxt_1 = __importDefault(require("ccxt"));
/**
 * Interact with exchanges via API
 */
(async () => {
    const bi = new ccxt_1.default.binanceusdm({
        verbose: false,
        apiKey: "key",
        secret: "secret",
    });
    // await bi.loadMarkets();
    // const ord = await bi.createOrder("ETH/USDT", "LIMIT", "sell", 1100, 2);
    // console.log(ord);
    // await bi.fapiPrivateDeleteListenKey();
    // await bi.dapiPrivateDeleteListenKey();
})();
//# sourceMappingURL=binance.js.map