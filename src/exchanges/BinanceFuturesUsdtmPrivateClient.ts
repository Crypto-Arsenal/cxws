import {
    BinancePrivateBase,
    BinancePrivateClientOptions,
    LISTEN_KEY_RENEW_INTERVAL,
    LISTEN_KEY_RENEW_RETRY_INTERVAL,
} from "./BinancePrivateBase";

/**
 * Base Url is wss://fstream-auth.binance.com
Streams can be access either in a single raw stream or a combined stream
Raw streams are accessed at /ws/<streamName>?listenKey=<validateListenKey>
Combined streams are accessed at /stream?streams=<streamName1>/<streamName2>/<streamName3>&listenKey=<validateListenKey>
<validateListenKey> must be a valid listenKey when you establish a connection.
 */
export class BinanceFuturesUsdtmPrivateClient extends BinancePrivateBase {
    constructor({
        useAggTrades = true,
        requestSnapshot = true,
        socketBatchSize = 200,
        socketThrottleMs = 1000,
        restThrottleMs = 1000,
        testNet = false,
        // wss://fstream-auth.binance.com/ws/b5bqOkV7JuEYOoSwAxIwMpG4huIdvrVEQYJRbj395TlWvJE6wkFfF6ttUdYDTJCr?listenKey=b5bqOkV7JuEYOoSwAxIwMpG4huIdvrVEQYJRbj395TlWvJE6wkFfF6ttUdYDTJCr
        wssPath = "wss://fstream-auth.binance.com/streams",
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
        clearTimeout(this._listenKeyAliveNesstimeout);

        // A User Data Stream listenKey is valid for 60 minutes after creation.
        this.ccxt
            .fapiPrivatePostListenKey()
            .then(d => {
                if (d.listenKey) {
                    this.apiToken = d.listenKey;
                    this.dynamicWssPath = `${this.wssPath}/?listenKey=${this.apiToken}&streams=${this.apiToken}`;
                    const that = this;
                    this._listenKeyAliveNesstimeout = setTimeout(function userDataKeepAlive() {
                        // Doing a POST/PUT on a listenKey will extend its validity for 60 minutes.
                        try {
                            that.ccxt
                                .fapiPrivatePostListenKey({ listenKey: that.apiToken })
                                .then(d => {
                                    console.log("fapiPrivatePostListenKey", d, that.apiToken);
                                    if (d.listenKey != that.apiToken) {
                                        console.log(
                                            "fapiPrivatePostListenKey listenKey renewal - reconnecting",
                                            d.listenKey,
                                            that.apiToken,
                                            new Date(),
                                        );
                                        clearTimeout(that._listenKeyAliveNesstimeout);
                                        that.reconnect();
                                        return;
                                    }
                                    console.log(
                                        "fapiPrivatePostListenKey listenKey extended",
                                        d.listenKey,
                                        that.apiToken,
                                        new Date(),
                                    );
                                    that._listenKeyAliveNesstimeout = setTimeout(
                                        userDataKeepAlive,
                                        LISTEN_KEY_RENEW_INTERVAL,
                                    );
                                    return;
                                }) // extend in 30 mins
                                .catch(err => {
                                    console.log("fapiPrivatePostListenKey error", err);
                                    that._listenKeyAliveNesstimeout = setTimeout(
                                        userDataKeepAlive,
                                        LISTEN_KEY_RENEW_RETRY_INTERVAL,
                                    );
                                }); // retry in 1 minute
                        } catch (err) {
                            console.error("fapiPrivatePostListenKey listenKey creation error", err);
                            that._listenKeyAliveNesstimeout = setTimeout(
                                userDataKeepAlive,
                                LISTEN_KEY_RENEW_RETRY_INTERVAL,
                            ); // retry in 1 min
                        }
                    }, LISTEN_KEY_RENEW_INTERVAL); // extend in 30 mins
                }
                super._connect();
            })
            .catch(err => {
                console.error("fapiPrivatePostListenKey listenKey creation error", err);
                this.emit("error", err);
            });
    }
}
