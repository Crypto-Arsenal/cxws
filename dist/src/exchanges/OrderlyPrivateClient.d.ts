/// <reference types="node" />
import { BasicPrivateClient } from "../BasicPrivateClient";
import { CandlePeriod } from "../CandlePeriod";
import { CancelableFn } from "../flowcontrol/Fn";
import { Market } from "../Market";
import { PrivateClientOptions } from "../PrivateClientOptions";
import { ec as EC } from "elliptic";
import { KeyPair } from "near-api-js";
export declare function getTradingKeyPair(tradingKeyPrivateKey: string): {
    privateKey: any;
    publicKey: any;
    keyPair: any;
};
export declare function getOrderlyKeyPair(orderlyKeyPrivateKey: string): KeyPair;
export declare function signMessageByTradingKey(keyPair: EC.KeyPair, params: any): string;
export declare function signPostRequestByOrderlyKey(keyPair: KeyPair, messageString: Uint8Array): string;
export declare const generateGetHeaders: (method: string, urlParam: string, params: Record<string, any>, orderlyKeyPrivate: string, accountId: string, orderlyKey: string, includeQuery?: boolean) => Promise<any>;
export declare type OrderlyClientOptions = PrivateClientOptions & {
    sendThrottleMs?: number;
    testNet?: boolean;
};
/**
 * Implements Orderly Network WebSocket API as defined in
 * https://docs-api.orderly.network/#introduction
 * https://docs-api.orderly.network/#websocket-api
 */
export declare class OrderlyPrivateClient extends BasicPrivateClient {
    candlePeriod: CandlePeriod;
    protected _sendMessage: CancelableFn;
    protected _pingInterval: NodeJS.Timeout;
    credentials: any;
    constructor({ credentials, sendThrottleMs, testNet }?: any);
    /**
     * @see https://docs-api.orderly.network/#websocket-api-private-execution-report
     */
    protected _sendSubPrivateOrders(): void;
    protected _sendUnsubPrivateOrders(): void;
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
    protected _sendPong(): void;
    protected _processsMessage(msg: any): void;
}
