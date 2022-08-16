/// <reference types="node" />
import { EventEmitter } from "events";
import { IPrivateClient } from "./IPrivateClient";
import { SmartWss } from "./SmartWss";
import { Watcher } from "./Watcher";
import ccxt from "ccxt";
import { InvestmentType } from "./types";
export declare type PrivateChannelSubscription = {
    id: string;
    name: string;
    options?: any;
};
export declare type PrivateChannelSubscriptionMap = Map<string, PrivateChannelSubscription>;
export declare type WssFactoryFn = (path: string) => SmartWss;
export declare type SendFn = (remoteId: string, channle_sub: PrivateChannelSubscription) => void;
/**
 * Single websocket connection client with
 * subscribe and unsubscribe methods. It is also an EventEmitter
 * and broadcasts 'trade' events.
 *
 * Anytime the WSS client connects (such as a reconnect)
 * it run the _onConnected method and will resubscribe.
 */
export declare abstract class BasicPrivateClient extends EventEmitter implements IPrivateClient {
    readonly wssPath: string;
    readonly name: ccxt.ExchangeId;
    readonly apiKey: string;
    readonly apiSecret: string;
    readonly apiPassword: string;
    hasPrivateOrders: boolean;
    apiToken: string;
    ccxt: ccxt.binance;
    protected _wssFactory: WssFactoryFn;
    protected _privateOrderSubs: PrivateChannelSubscriptionMap;
    protected _wss: SmartWss;
    protected _watcher: Watcher;
    constructor(wssPath: string, name: ccxt.ExchangeId, apiKey: string, apiSecret: string, apiPassword?: string, wssFactory?: WssFactoryFn, watcherMs?: number);
    protected getWssPath(): string;
    close(): void;
    reconnect(): void;
    subscribePrivateOrders(channel_sub: {
        id: string;
        options?: {
            investmentType: InvestmentType;
        };
    }): boolean;
    unsubscribePrivateOrders(channel_sub: {
        id: string;
        options?: {
            investmentType: InvestmentType;
        };
    }): Promise<void>;
    /**
     * Helper function for performing a subscription operation
     * where a subscription map is maintained and the message
     * send operation is performed
     * @param {PrivateChannelSubscription} channelSub
     * @param {PrivateChannelSubscriptionMap}} map
     * @param {String} msg
     * @param {Function} sendFn
     * @returns {Boolean} returns true when a new subscription event occurs
     */
    protected _subscribe(channelSub: PrivateChannelSubscription, map: PrivateChannelSubscriptionMap, sendFn: SendFn): boolean;
    /**
     * Helper function for performing an unsubscription operation
     * where a subscription map is maintained and the message
     * send operation is performed
     */
    protected _unsubscribe(channel_sub: PrivateChannelSubscription, map: PrivateChannelSubscriptionMap, sendFn: SendFn): void;
    /**
     * Idempotent method for creating and initializing
     * a long standing web socket client. This method
     * is only called in the subscribe method. Multiple calls
     * have no effect.
     */
    protected _connect(): void;
    /**
     * Handles the error event
     * @param {Error} err
     */
    protected _onError(err: any): void;
    /**
     * Handles the connecting event. This is fired any time the
     * underlying websocket begins a connection.
     */
    protected _onConnecting(): void;
    /**
     * This method is fired anytime the socket is opened, whether
     * the first time, or any subsequent reconnects. This allows
     * the socket to immediate trigger resubscription to relevent
     * feeds
     */
    protected _onConnected(): void;
    /**
     * Handles a disconnection event
     */
    protected _onDisconnected(): void;
    /**
     * Handles the closing event
     */
    protected _onClosing(): void;
    /**
     * Fires before connect
     */
    protected _beforeConnect(): void;
    /**
     * Fires before close
     */
    protected _beforeClose(): void;
    /**
     * Handles the closed event
     */
    protected _onClosed(): void;
    protected abstract _onMessage(msg: any): any;
    protected abstract _sendSubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription): any;
    protected abstract _sendUnsubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription): any;
}
