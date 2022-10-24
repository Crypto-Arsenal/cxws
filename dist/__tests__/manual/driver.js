"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("../../src");
/**
 * Driver code to test WS
 */
let binance = new src_1.BinanceFuturesCoinmPrivateClient({
    apiKey: "key",
    apiSecret: "secret",
});
binance.subscribePrivateOrders({ id: "id" });
binance.on("orders", data => console.log("orders hook", data));
binance.on("error", err => console.error(err));
//# sourceMappingURL=driver.js.map