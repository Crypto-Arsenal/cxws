/// <reference types="node" />
import { BasicPrivateClient, PrivateChannelSubscription } from "../BasicPrivateClient";
import { CandlePeriod } from "../CandlePeriod";
import { CancelableFn } from "../flowcontrol/Fn";
import { Market } from "../Market";
import { PrivateClientOptions } from "../PrivateClientOptions";
export declare type OrderlyClientOptions = PrivateClientOptions & {
    sendThrottleMs?: number;
    testNet?: boolean;
};
export declare class OrderlyPrivateClient extends BasicPrivateClient {
    candlePeriod: CandlePeriod;
    protected _sendMessage: CancelableFn;
    protected _pingInterval: NodeJS.Timeout;
    constructor({ wssPath, watcherMs, apiKey, apiSecret, apiPassword, sendThrottleMs, testNet, }?: OrderlyClientOptions);
    /**
     *
     * @param subscriptionId
     * @param channel
     * @see https://www.okx.com/docs-v5/en/#websocket-api-private-channel-order-channel
     */
    protected _sendSubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription): void;
    protected _sendUnsubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription): void;
    protected _beforeClose(): void;
    protected _beforeConnect(): void;
    protected _onConnected(): void;
    protected _sendAuthentication(): void;
    protected _startPing(): void;
    protected _stopPing(): void;
    protected _sendPing(): void;
    /**
     * Constructs a market argument in a backwards compatible manner where
     * the default is a spot market.
     */
    protected _marketArg(method: string, market: Market): string;
    protected __sendMessage(msg: any): void;
    protected _onMessage(raw: any): void;
    protected _processsMessage(msg: any): void;
}
