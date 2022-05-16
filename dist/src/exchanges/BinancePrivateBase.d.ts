import { Candle } from "../Candle";
import { CandlePeriod } from "../CandlePeriod";
import { CancelableFn } from "../flowcontrol/Fn";
import { Level2Snapshot } from "../Level2Snapshots";
import { Ticker } from "../Ticker";
import { Trade } from "../Trade";
import { Market } from "../Market";
import { Level2Update } from "../Level2Update";
import ccxt from "ccxt";
import { PrivateClientOptions } from "../PrivateClientOptions";
import { BasicPrivateClient, PrivateChannelSubscription } from "../BasicPrivateClient";
export declare type BinancePrivateClientOptions = PrivateClientOptions & {
    name?: ccxt.ExchangeId;
    wssPath?: string;
    restL2SnapshotPath?: string;
    watcherMs?: number;
    useAggTrades?: boolean;
    requestSnapshot?: boolean;
    socketBatchSize?: number;
    socketThrottleMs?: number;
    restThrottleMs?: number;
    l2updateSpeed?: string;
    l2snapshotSpeed?: string;
    testNet?: boolean;
    batchTickers?: boolean;
};
export declare class BinancePrivateBase extends BasicPrivateClient {
    dynamicWssPath: string;
    useAggTrades: boolean;
    l2updateSpeed: string;
    l2snapshotSpeed: string;
    requestSnapshot: boolean;
    candlePeriod: CandlePeriod;
    batchTickers: boolean;
    protected _messageId: number;
    protected _restL2SnapshotPath: string;
    protected _tickersActive: boolean;
    protected _batchSub: CancelableFn;
    protected _batchUnsub: CancelableFn;
    protected _sendMessage: CancelableFn;
    protected _requestLevel2Snapshot: CancelableFn;
    constructor({ name, wssPath, restL2SnapshotPath, watcherMs, useAggTrades, requestSnapshot, socketBatchSize, socketThrottleMs, restThrottleMs, l2updateSpeed, l2snapshotSpeed, batchTickers, apiKey, apiSecret, }?: BinancePrivateClientOptions);
    protected _sendUnsubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription): void;
    protected getWssPath(): string;
    /**
     * Set webscoket token from REST api before subscribing to private feeds
     * https://binance-docs.github.io/apidocs/spot/en/#user-data-streams
     * TODO: SEE HOW KUOCOIN DOES IT!!!
     */
    protected _connect(): void;
    protected _sendSubPrivateOrders(): void;
    protected _onClosing(): void;
    protected _sendSubTicker(remote_id: string): void;
    protected __batchSub(args: any[]): void;
    protected __batchUnsub(args: any): void;
    protected __sendMessage(msg: any): void;
    protected _sendSubTrades(remote_id: string): void;
    protected _sendUnsubTrades(remote_id: string): void;
    protected _sendSubCandles(remote_id: string): void;
    protected _sendUnsubCandles(remote_id: string): void;
    protected _sendSubLevel2Snapshots(remote_id: string): void;
    protected _sendUnsubLevel2Snapshots(remote_id: string): void;
    protected _sendUnsubLevel2Updates(remote_id: string): void;
    protected _sendSubLevel3Snapshots(): void;
    protected _sendUnsubLevel3Snapshots(): void;
    protected _sendSubLevel3Updates(): void;
    protected _sendUnsubLevel3Updates(): void;
    protected _onMessage(raw: string): void;
    protected _constructTicker(msg: any, market: Market): Ticker;
    protected _constructAggTrade({ data }: {
        data: any;
    }, market: Market): Trade;
    protected _constructRawTrade({ data }: {
        data: any;
    }, market: Market): Trade;
    /**
   * Kline data looks like:
   { stream: 'btcusdt@kline_1m',
    data:
    { e: 'kline',
      E: 1571068845689,
      s:  'BTCUSDT',
      k:
        { t: 1571068800000,
          T: 1571068859999,
          s: 'BTCUSDT',
          i: '1m',
          f: 189927800,
          L: 189928107,
          o: '8254.05000000',
          c: '8253.61000000',
          h: '8256.58000000',
          l: '8250.93000000',
          v: '19.10571600',
          n: 308,
          x: false,
          q: '157694.32610840',
          V: '8.19456200',
          Q: '67640.56793106',
          B: '0' } } }
   */
    protected _constructCandle({ data }: {
        data: any;
    }): Candle;
    protected _constructLevel2Snapshot(msg: any, market: Market): Level2Snapshot;
    /**
   {
      "e": "depthUpdate", // Event type
      "E": 123456789,     // Event time
      "s": "BNBBTC",      // Symbol
      "U": 157,           // First update ID in event
      "u": 160,           // Final update ID in event
      "b": [              // Bids to be updated
        [
          "0.0024",       // Price level to be updated
          "10"            // Quantity
        ]
      ],
      "a": [              // Asks to be updated
        [
          "0.0026",       // Price level to be updated
          "100"           // Quantity
        ]
      ]
    }
   */
    protected _constructLevel2Update(msg: any, market: any): Level2Update;
    protected __requestLevel2Snapshot(market: any): Promise<void>;
}
export declare function candlePeriod(p: any): "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "2h" | "4h" | "6h" | "8h" | "12h" | "1d" | "3d" | "1w" | "1M";
