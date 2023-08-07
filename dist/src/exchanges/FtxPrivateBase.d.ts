/// <reference types="node" />
import { BasicPrivateClient, PrivateChannelSubscription } from "../BasicPrivateClient";
export declare class FtxPrivateBaseClient extends BasicPrivateClient {
    protected _pingInterval: NodeJS.Timeout;
    protected _pingIntervalTime: number;
    constructor({ name, wssPath, watcherMs, apiKey, apiSecret }: {
        name: any;
        wssPath: any;
        watcherMs: any;
        apiKey: any;
        apiSecret: any;
    });
    protected _onConnected(): void;
    protected _beforeConnect(): void;
    protected _startPing(): void;
    protected _stopPing(): void;
    protected _sendSubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription): void;
    protected _sendUnsubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription): void;
    protected _sendPing(): void;
    protected _sendAuthentication(): void;
    protected _sendSubTicker(market: any): void;
    protected _sendUnsubTicker(market: any): void;
    protected _sendSubTrades(market: any): void;
    protected _sendUnsubTrades(market: any): void;
    protected _sendSubLevel2Updates(market: any): void;
    protected _sendUnsubLevel2Updates(market: any): void;
    protected _sendSubCandles: (...args: any[]) => any;
    protected _sendUnsubCandles: (...args: any[]) => any;
    protected _sendSubLevel2Snapshots: (...args: any[]) => any;
    protected _sendUnsubLevel2Snapshots: (...args: any[]) => any;
    protected _sendSubLevel3Snapshots: (...args: any[]) => any;
    protected _sendUnsubLevel3Snapshots: (...args: any[]) => any;
    protected _sendSubLevel3Updates: (...args: any[]) => any;
    protected _sendUnsubLevel3Updates: (...args: any[]) => any;
    protected _onMessage(raw: any): void;
    protected _orderbookUpdateEvent(data: any, market: any): void;
    protected _orderbookSnapshotEvent(data: any, market: any): void;
    protected _orderbookEventContent(data: any, market: any): {
        exchange: number | symbol | "length" | "toString" | "toLocaleString" | "pop" | "push" | "concat" | "join" | "reverse" | "shift" | "slice" | "sort" | "splice" | "unshift" | "indexOf" | "lastIndexOf" | "every" | "some" | "forEach" | "map" | "filter" | "reduce" | "reduceRight" | "find" | "findIndex" | "fill" | "copyWithin" | "entries" | "keys" | "values" | "includes" | "flatMap" | "flat";
        base: any;
        quote: any;
        timestampMs: number;
        asks: any;
        bids: any;
        checksum: any;
    };
    protected _timeToTimestampMs(time: any): number;
}
