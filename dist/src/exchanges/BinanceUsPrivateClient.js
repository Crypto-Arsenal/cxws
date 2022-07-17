"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinanceUsPrivateClient = void 0;
const BinancePrivateBase_1 = require("./BinancePrivateBase");
class BinanceUsPrivateClient extends BinancePrivateBase_1.BinancePrivateBase {
    constructor({ useAggTrades = true, requestSnapshot = true, socketBatchSize = 200, socketThrottleMs = 1000, restThrottleMs = 1000, testNet = false, wssPath = "wss://stream.binance.us:9443/stream", restL2SnapshotPath = "https://api.binance.us/api/v1/depth", watcherMs, l2updateSpeed, l2snapshotSpeed, batchTickers, apiKey = "", apiSecret = "", } = {}) {
        if (testNet) {
            wssPath = "wss://testnet.binance.vision/stream";
            restL2SnapshotPath = "https://testnet.binance.vision/api/v1/depth";
        }
        super({
            name: "binanceus",
            restL2SnapshotPath,
            wssPath,
            useAggTrades,
            requestSnapshot,
            socketBatchSize,
            socketThrottleMs,
            restThrottleMs,
            watcherMs,
            l2updateSpeed,
            l2snapshotSpeed,
            batchTickers,
            apiKey,
            apiSecret,
        });
    }
}
exports.BinanceUsPrivateClient = BinanceUsPrivateClient;
//# sourceMappingURL=BinanceUsPrivateClient.js.map