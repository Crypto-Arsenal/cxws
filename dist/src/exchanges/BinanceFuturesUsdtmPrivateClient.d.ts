import { BinancePrivateBase, BinancePrivateClientOptions } from "./BinancePrivateBase";
/**
 * Base Url is wss://fstream-auth.binance.com
Streams can be access either in a single raw stream or a combined stream
Raw streams are accessed at /ws/<streamName>?listenKey=<validateListenKey>
Combined streams are accessed at /stream?streams=<streamName1>/<streamName2>/<streamName3>&listenKey=<validateListenKey>
<validateListenKey> must be a valid listenKey when you establish a connection.
 */
export declare class BinanceFuturesUsdtmPrivateClient extends BinancePrivateBase {
    constructor({ useAggTrades, requestSnapshot, socketBatchSize, socketThrottleMs, restThrottleMs, testNet, wssPath, restL2SnapshotPath, watcherMs, l2updateSpeed, l2snapshotSpeed, batchTickers, apiKey, apiSecret, }?: BinancePrivateClientOptions);
    /**
     * Set webscoket token from REST api before subscribing to private feeds
     * https://binance-docs.github.io/apidocs/spot/en/#user-data-streams
     * TODO: SEE HOW KUOCOIN DOES IT!!!
     */
    protected _connect(): void;
}
