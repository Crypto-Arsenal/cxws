import { BinancePrivateBase, BinancePrivateClientOptions } from "./BinancePrivateBase";

export class BinanceFuturesUsdtmPrivateClient extends BinancePrivateBase {
    constructor({
        useAggTrades = true,
        requestSnapshot = true,
        socketBatchSize = 200,
        socketThrottleMs = 1000,
        restThrottleMs = 1000,
        testNet = false,
        wssPath = "wss://fstream.binance.com/stream",
        restL2SnapshotPath = "https://fapi.binance.com/fapi/v1/depth",
        watcherMs,
        l2updateSpeed,
        l2snapshotSpeed,
        batchTickers,
        apiKey = "",
        apiSecret = "",
    }: BinancePrivateClientOptions = {}) {
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
    protected _connect(): void {
        this.ccxt
            .fapiPrivatePostListenKey()
            .then(d => {
                if (d.listenKey) {
                    this.apiToken = d.listenKey;
                    this.dynamicWssPath = `${this.wssPath}?streams=${this.apiToken}`;
                    setTimeout(function userDataKeepAlive() {
                        // keepalive
                        try {
                            this.ccxt
                                .fapiPrivatePutListenKey({ listenKey: this.apiToken })
                                .then(d => setTimeout(userDataKeepAlive, 60 * 30 * 1000))
                                .catch(err => setTimeout(userDataKeepAlive, 60000));
                        } catch (error) {
                            setTimeout(userDataKeepAlive, 60000); // retry in 1 minute
                        }
                    }, 60 * 30 * 1000); // 30 minute keepalive
                }
                super._connect();
            })
            .catch(err => {
                this.emit("error", err);
            });
    }
}
