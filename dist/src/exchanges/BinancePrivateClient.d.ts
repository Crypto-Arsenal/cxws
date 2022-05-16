import { BinancePrivateBase, BinancePrivateClientOptions } from "./BinancePrivateBase";
export declare class BinancePrivateClient extends BinancePrivateBase {
    constructor({ useAggTrades, requestSnapshot, socketBatchSize, socketThrottleMs, restThrottleMs, testNet, wssPath, restL2SnapshotPath, watcherMs, l2updateSpeed, l2snapshotSpeed, batchTickers, apiKey, apiSecret, }?: BinancePrivateClientOptions);
}
