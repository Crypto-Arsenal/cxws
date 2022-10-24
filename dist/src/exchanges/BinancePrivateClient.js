"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinancePrivateClient = void 0;
const BinancePrivateBase_1 = require("./BinancePrivateBase");
class BinancePrivateClient extends BinancePrivateBase_1.BinancePrivateBase {
    constructor({ useAggTrades = true, requestSnapshot = true, socketBatchSize = 200, socketThrottleMs = 1000, restThrottleMs = 1000, testNet = false, wssPath = "wss://stream.binance.com:9443/stream", restL2SnapshotPath = "https://api.binance.com/api/v1/depth", watcherMs, l2updateSpeed, l2snapshotSpeed, batchTickers, apiKey = "", apiSecret = "", } = {}) {
        if (testNet) {
            wssPath = "wss://testnet.binance.vision/stream";
            restL2SnapshotPath = "https://testnet.binance.vision/api/v1/depth";
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
        clearTimeout(this._listenKeyAliveNesstimeout);
        // A User Data Stream listenKey is valid for 60 minutes after creation.
        this.ccxt
            .publicPostUserDataStream()
            .then(d => {
            console.log("publicPostUserDataStream result", d);
            if (d.listenKey) {
                this.apiToken = d.listenKey;
                this.dynamicWssPath = `${this.wssPath}?streams=${this.apiToken}`;
                const that = this;
                that._listenKeyAliveNesstimeout = setTimeout(function userDataKeepAlive() {
                    // Doing a POST/PUT on a listenKey will extend its validity for 60 minutes.
                    try {
                        that.ccxt
                            .publicPostUserDataStream()
                            .then(d => {
                            if (d.listenKey != that.apiToken) {
                                console.log("publicPostUserDataStream listenKey renewal expired key- reconnecting", d.listenKey, that.apiToken);
                                clearTimeout(that._listenKeyAliveNesstimeout);
                                that.reconnect();
                                return;
                            }
                            console.log("publicPostUserDataStream listenKey extended", d.listenKey, that.apiToken);
                            that._listenKeyAliveNesstimeout = setTimeout(userDataKeepAlive, BinancePrivateBase_1.LISTEN_KEY_RENEW_INTERVAL);
                        }) // extend in 30 mins
                            .catch(err => {
                            console.error("publicPostUserDataStream listenKey renewal error", err);
                            that._listenKeyAliveNesstimeout = setTimeout(userDataKeepAlive, BinancePrivateBase_1.LISTEN_KEY_RENEW_RETRY_INTERVAL);
                        }); // retry in 1 minute
                    }
                    catch (err) {
                        console.error("publicPostUserDataStream listenKey renewal error", err);
                        that._listenKeyAliveNesstimeout = setTimeout(userDataKeepAlive, BinancePrivateBase_1.LISTEN_KEY_RENEW_RETRY_INTERVAL); // retry in 1 min
                    }
                }, BinancePrivateBase_1.LISTEN_KEY_RENEW_INTERVAL); // extend in 30 mins
            }
            super._connect();
        })
            .catch(err => {
            console.error("publicPostUserDataStream listenKey creation error", err);
            this.emit("error", err);
        });
    }
}
exports.BinancePrivateClient = BinancePrivateClient;
//# sourceMappingURL=BinancePrivateClient.js.map