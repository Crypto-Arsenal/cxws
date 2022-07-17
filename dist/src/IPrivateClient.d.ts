/// <reference types="node" />
import { EventEmitter } from "events";
import { PrivateChannelSubscription } from "./BasicPrivateClient";
export interface IPrivateClient extends EventEmitter {
    hasPrivateOrders: boolean;
    reconnect(): void;
    close(): void;
    subscribePrivateOrders(private_channel_sub: PrivateChannelSubscription): void;
}
