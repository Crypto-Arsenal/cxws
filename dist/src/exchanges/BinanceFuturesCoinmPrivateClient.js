"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinanceFuturesCoinmPrivateClient = void 0;
const BinancePrivateBase_1 = require("./BinancePrivateBase");
class BinanceFuturesCoinmPrivateClient extends BinancePrivateBase_1.BinancePrivateBase {
    constructor({ useAggTrades = true, requestSnapshot = true, socketBatchSize = 200, socketThrottleMs = 1000, restThrottleMs = 1000, testNet = false, wssPath = "wss://dstream.binance.com/stream", restL2SnapshotPath = "https://dapi.binance.com/dapi/v1/depth", watcherMs, l2updateSpeed, l2snapshotSpeed, batchTickers, apiKey = "", apiSecret = "", } = {}) {
        if (testNet) {
            wssPath = "wss://dstream.binancefuture.com/stream";
            restL2SnapshotPath = "https://testnet.binancefuture.com/api/v1/depth";
        }
        super({
            name: "binancecoinm",
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
        clearTimeout(this._listenKeyAliveNesstimeout);
        // A User Data Stream listenKey is valid for 60 minutes after creation.
        this.ccxt
            .dapiPrivatePostListenKey()
            .then(d => {
            if (d.listenKey) {
                this.apiToken = d.listenKey;
                this.dynamicWssPath = `${this.wssPath}?streams=${this.apiToken}`;
                const that = this;
                this._listenKeyAliveNesstimeout = setTimeout(function userDataKeepAlive() {
                    // Doing a PUT on a listenKey will extend its validity for 60 minutes.
                    try {
                        that.ccxt
                            .dapiPrivatePostListenKey({ listenKey: that.apiToken })
                            .then(d => {
                            if (d.listenKey != that.apiToken) {
                                console.log("dapiPrivatePostListenKey listenKey renewal expired key- reconnecting", d.listenKey, that.apiToken, new Date());
                                clearTimeout(that._listenKeyAliveNesstimeout);
                                that.reconnect();
                                return;
                            }
                            console.log("dapiPrivatePostListenKey listenKey extended", d.listenKey, that.apiToken, new Date());
                            that._listenKeyAliveNesstimeout = setTimeout(userDataKeepAlive, BinancePrivateBase_1.LISTEN_KEY_RENEW_INTERVAL);
                        }) // extend in 30 mins
                            .catch(err => {
                            console.log("dapiPrivatePostListenKey error", err);
                            that._listenKeyAliveNesstimeout = setTimeout(userDataKeepAlive, BinancePrivateBase_1.LISTEN_KEY_RENEW_RETRY_INTERVAL);
                        }); // retry in 1 min
                    }
                    catch (err) {
                        console.error("dapiPrivatePostListenKey listenKey creation error", err);
                        that._listenKeyAliveNesstimeout = setTimeout(userDataKeepAlive, BinancePrivateBase_1.LISTEN_KEY_RENEW_RETRY_INTERVAL); // retry in 1 min
                    }
                }, BinancePrivateBase_1.LISTEN_KEY_RENEW_INTERVAL); // extend in 30 mins
            }
            super._connect();
        })
            .catch(err => {
            console.error("dapiPrivatePostListenKey listenKey creation error", err);
            this.emit("error", err);
        });
    }
}
exports.BinanceFuturesCoinmPrivateClient = BinanceFuturesCoinmPrivateClient;
//# sourceMappingURL=BinanceFuturesCoinmPrivateClient.js.map