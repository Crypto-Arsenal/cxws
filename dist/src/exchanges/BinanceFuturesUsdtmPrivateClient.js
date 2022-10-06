"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinanceFuturesUsdtmPrivateClient = void 0;
const BinancePrivateBase_1 = require("./BinancePrivateBase");
class BinanceFuturesUsdtmPrivateClient extends BinancePrivateBase_1.BinancePrivateBase {
    constructor({ useAggTrades = true, requestSnapshot = true, socketBatchSize = 200, socketThrottleMs = 1000, restThrottleMs = 1000, testNet = false, wssPath = "wss://fstream.binance.com/stream", restL2SnapshotPath = "https://fapi.binance.com/fapi/v1/depth", watcherMs, l2updateSpeed, l2snapshotSpeed, batchTickers, apiKey = "", apiSecret = "", } = {}) {
        if (testNet) {
            wssPath = "wss://stream.binancefuture.com/stream";
            restL2SnapshotPath = "https://testnet.binancefuture.com/api/v1/depth";
        }
        super({
            name: "binance",
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
    /**
     * Set webscoket token from REST api before subscribing to private feeds
     * https://binance-docs.github.io/apidocs/spot/en/#user-data-streams
     * TODO: SEE HOW KUOCOIN DOES IT!!!
     */
    _connect() {
        // A User Data Stream listenKey is valid for 60 minutes after creation.
        this.ccxt
            .fapiPrivatePostListenKey()
            .then(d => {
            if (d.listenKey) {
                this.apiToken = d.listenKey;
                this.dynamicWssPath = `${this.wssPath}?streams=${this.apiToken}`;
                const that = this;
                setTimeout(function userDataKeepAlive() {
                    // Doing a PUT on a listenKey will extend its validity for 60 minutes.
                    try {
                        that.ccxt
                            .fapiPrivatePutListenKey({ listenKey: that.apiToken })
                            .then(d => setTimeout(userDataKeepAlive, 1800000)) // extend in 30 mins
                            .catch(err => setTimeout(userDataKeepAlive, 60000)); // retry in 1 minute
                    }
                    catch (error) {
                        setTimeout(userDataKeepAlive, 60000); // retry in 1 min
                    }
                }, 1800000); // extend in 30 mins
            }
            super._connect();
        })
            .catch(err => {
            this.emit("error", err);
        });
    }
}
exports.BinanceFuturesUsdtmPrivateClient = BinanceFuturesUsdtmPrivateClient;
//# sourceMappingURL=BinanceFuturesUsdtmPrivateClient.js.map