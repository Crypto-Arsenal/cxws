import { BasicPrivateClient, PrivateChannelSubscription } from "../BasicPrivateClient";
import * as ccxt from "ccxt";
export declare class CryptoComPrivateClient extends BasicPrivateClient {
    constructor({ apiKey, apiSecret, name, wssPath, }: {
        apiKey: any;
        apiSecret: any;
        name?: ccxt.ExchangeId;
        wssPath?: string;
    });
    /**
     * @source https://exchange-docs.crypto.com/spot/index.html?javascript#digital-signature
     */
    protected _signRequest: (request_body: any) => any;
    protected _sendPong(ts: number): void;
    protected _onConnected(): void;
    protected _sendAuthentication(): void;
    /**
     *  @document https://exchange-docs.crypto.com/spot/index.html?javascript#user-order-instrument_name
     */
    protected _sendSubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription): void;
    protected _sendUnsubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription): void;
    protected _onMessage(raw: string): void;
}
