import { BasicPrivateClient, PrivateChannelSubscription } from "../BasicPrivateClient";
export declare class HuobiPrivateBase extends BasicPrivateClient {
    constructor({ apiKey, apiSecret, name, wssPath, watcherMs }: {
        apiKey: any;
        apiSecret: any;
        name: any;
        wssPath: any;
        watcherMs: any;
    });
    protected _sendPong(ts: number): void;
    protected _onConnected(): void;
    protected _sendAuthentication(): void;
    protected _sendSubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription): void;
    protected _sendUnsubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription): void;
    protected _onMessage(raw: string): void;
}
