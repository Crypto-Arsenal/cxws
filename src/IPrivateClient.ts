import { EventEmitter } from "events";
import { PrivateChannelSubscription } from "./BasicPrivateClient";
import { Market } from "./Market";

export interface IPrivateClient extends EventEmitter {
    hasPrivateOrders: boolean;

    reconnect(): void;
    close(): void;

    subscribePrivateOrders(private_channel_sub: PrivateChannelSubscription): void;
}
