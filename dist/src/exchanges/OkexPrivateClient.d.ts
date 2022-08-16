/// <reference types="node" />
import { BasicPrivateClient, PrivateChannelSubscription } from "../BasicPrivateClient";
import { CandlePeriod } from "../CandlePeriod";
import { CancelableFn } from "../flowcontrol/Fn";
import { Market } from "../Market";
import { PrivateClientOptions } from "../PrivateClientOptions";
export declare type OkexClientOptions = PrivateClientOptions & {
    sendThrottleMs?: number;
};
/**
 * Implements OKEx V3 WebSocket API as defined in
 * https://www.okex.com/docs/en/#spot_ws-general
 * https://www.okx.com/docs-v5/en/#websocket-api-private-channel-order-channel
 *
 * Limits:
 *    1 connection / second
 *    240 subscriptions / hour
 *
 * Connection will disconnect after 30 seconds of silence
 * it is recommended to send a ping message that contains the
 * message "ping".
 *
 * Order book depth includes maintenance of a checksum for the
 * first 25 values in the orderbook. Each update includes a crc32
 * checksum that can be run to validate that your order book
 * matches the server. If the order book does not match you should
 * issue a reconnect.
 *
 * Refer to: https://www.okex.com/docs/en/#spot_ws-checksum
 */
export declare class OkexPrivateClient extends BasicPrivateClient {
    candlePeriod: CandlePeriod;
    protected _sendMessage: CancelableFn;
    protected _pingInterval: NodeJS.Timeout;
    constructor({ wssPath, watcherMs, apiKey, apiSecret, apiPassword, sendThrottleMs, }?: OkexClientOptions);
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
