/// <reference types="node" />
import { BasicPrivateClient, PrivateChannelSubscription } from "../BasicPrivateClient";
export declare class BitgetPrivateClient extends BasicPrivateClient {
    protected _pingInterval: NodeJS.Timeout;
    constructor({ apiKey, apiSecret, apiPassword, name, wssPath, }: {
        apiKey: any;
        apiSecret: any;
        apiPassword: any;
        name?: keyof string[];
        wssPath?: string;
    });
    protected _sendPong(ts: number): void;
    protected _onConnected(): void;
    protected _beforeConnect(): void;
    /**
     * @documentation https://bitgetlimited.github.io/apidoc/en/spot/#connect
     * @note should ping less than 30 seconds
     */
    protected _startPing(): void;
    protected _stopPing(): void;
    protected _sendPing(): void;
    protected _toJsonString(obj: object): string | null;
    protected _encrypt(httpMethod: string, url: string, qsOrBody: NodeJS.Dict<string | number> | null, timestamp: number, secretKey: string): string;
    protected _sendAuthentication(): void;
    /**
     * @documentation https://bitgetlimited.github.io/apidoc/en/spot/#order-channel
     * @param subscriptionId
     * @param channel
     * @note should specify what currency to track
     */
    protected _sendSubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription): void;
    protected _sendUnsubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription): void;
    protected _onMessage(raw: string): void;
}
