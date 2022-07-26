import { BinancePrivateBase, BinancePrivateClientOptions } from "./BinancePrivateBase";
export declare class BinanceFuturesCoinmPrivateClient extends BinancePrivateBase {
    constructor({ useAggTrades, requestSnapshot, socketBatchSize, socketThrottleMs, restThrottleMs, testNet, wssPath, restL2SnapshotPath, watcherMs, l2updateSpeed, l2snapshotSpeed, batchTickers, apiKey, apiSecret, }?: BinancePrivateClientOptions);
    /**
     * Set webscoket token from REST api before subscribing to private feeds
     * https://binance-docs.github.io/apidocs/spot/en/#user-data-streams
     * TODO: SEE HOW KUOCOIN DOES IT!!!
     */
    protected _connect(): void;
}
