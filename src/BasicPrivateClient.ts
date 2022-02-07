/* eslint-disable @typescript-eslint/no-unused-vars */
import { EventEmitter } from "events";
import { IPrivateClient } from "./IPrivateClient";
import { SmartWss } from "./SmartWss";
import { Watcher } from "./Watcher";

export type PrivateChannelSubscription = {
    id: string;
    name: string;
};

export type PrivateChannelSubscriptionMap = Map<string, PrivateChannelSubscription>;
export type WssFactoryFn = (path: string) => SmartWss;
export type SendFn = (remoteId: string, channle_sub: PrivateChannelSubscription) => void;

/**
 * Single websocket connection client with
 * subscribe and unsubscribe methods. It is also an EventEmitter
 * and broadcasts 'trade' events.
 *
 * Anytime the WSS client connects (such as a reconnect)
 * it run the _onConnected method and will resubscribe.
 */
export abstract class BasicPrivateClient extends EventEmitter implements IPrivateClient {
    public hasPrivateOrders: boolean;

    protected _wssFactory: WssFactoryFn;
    protected _privateOrderSubs: PrivateChannelSubscriptionMap;

    protected _wss: SmartWss;
    protected _watcher: Watcher;

    constructor(
        readonly wssPath: string,
        readonly name: string,
        wssFactory?: WssFactoryFn,
        watcherMs?: number,
    ) {
        super();
        this._privateOrderSubs = new Map();

        this._wss = undefined;
        this._watcher = new Watcher(this, watcherMs);

        this.hasPrivateOrders = false;

        this._wssFactory = wssFactory || (path => new SmartWss(path));
    }

    //////////////////////////////////////////////

    public close() {
        if (this._beforeClose) {
            this._beforeClose();
        }
        this._watcher.stop();
        if (this._wss) {
            this._wss.close();
            this._wss = undefined;
        }
    }

    public reconnect() {
        this.emit("reconnecting");
        if (this._wss) {
            this._wss.once("closed", () => this._connect());
            this.close();
        } else {
            this._connect();
        }
    }

    public subscribePrivateOrders(channel_sub: { id: string }) {
        console.log("base subscribePrivateOrders");
        if (!this.hasPrivateOrders) return;
        return this._subscribe(
            {
                ...channel_sub,
                name: "openOrders",
            },
            this._privateOrderSubs,
            this._sendSubPrivateOrders.bind(this),
        );
    }

    public unsubscribePrivateOrders(channel_sub: { id: string }): Promise<void> {
        if (!this.hasPrivateOrders) return;
        this._unsubscribe(
            {
                ...channel_sub,
                name: "openOrders",
            },
            this._privateOrderSubs,
            this._sendUnsubPrivateOrders.bind(this),
        );
    }

    ////////////////////////////////////////////
    // PROTECTED

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
    protected _subscribe(
        channelSub: PrivateChannelSubscription,
        map: PrivateChannelSubscriptionMap,
        sendFn: SendFn,
    ) {
        console.log("base _subscribe");
        this._connect();
        const sub_id = channelSub.id;
        if (!map.has(sub_id)) {
            map.set(sub_id, channelSub);

            // perform the subscription if we're connected
            // and if not, then we'll reply on the _onConnected event
            // to send the signal to our server!
            if (this._wss && this._wss.isConnected) {
                console.log("base _subscribe > sendFn");
                sendFn(sub_id, channelSub);
            }
            return true;
        }
        return false;
    }

    /**
     * Helper function for performing an unsubscription operation
     * where a subscription map is maintained and the message
     * send operation is performed
     */
    protected _unsubscribe(
        channel_sub: PrivateChannelSubscription,
        map: PrivateChannelSubscriptionMap,
        sendFn: SendFn,
    ) {
        const sub_id = channel_sub.id;
        if (map.has(sub_id)) {
            map.delete(sub_id);

            if (this._wss.isConnected) {
                sendFn(sub_id, channel_sub);
            }
        }
    }

    /**
     * Idempotent method for creating and initializing
     * a long standing web socket client. This method
     * is only called in the subscribe method. Multiple calls
     * have no effect.
     */
    protected _connect() {
        console.log("base _connect");
        if (!this._wss) {
            // register wss hanlder here
            this._wss = this._wssFactory(this.wssPath);
            this._wss.on("error", this._onError.bind(this));
            this._wss.on("connecting", this._onConnecting.bind(this));
            this._wss.on("connected", this._onConnected.bind(this));
            this._wss.on("disconnected", this._onDisconnected.bind(this));
            this._wss.on("closing", this._onClosing.bind(this));
            this._wss.on("closed", this._onClosed.bind(this));
            this._wss.on("message", (msg: string) => {
                try {
                    this._onMessage(msg);
                } catch (ex) {
                    this._onError(ex);
                }
            });
            this._beforeConnect();

            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this._wss.connect();
        }
    }

    /**
     * Handles the error event
     * @param {Error} err
     */
    protected _onError(err) {
        this.emit("error", err);
    }

    /**
     * Handles the connecting event. This is fired any time the
     * underlying websocket begins a connection.
     */
    protected _onConnecting() {
        console.log("base", "_onConnecting");

        this.emit("connecting");
    }

    /**
     * This method is fired anytime the socket is opened, whether
     * the first time, or any subsequent reconnects. This allows
     * the socket to immediate trigger resubscription to relevent
     * feeds
     */
    protected _onConnected() {
        console.log("base", "_onConnected");

        this.emit("connected");
        for (const [subscriptionId, channel] of this._privateOrderSubs) {
            this._sendSubPrivateOrders(subscriptionId, channel);
        }
        // TODO: check for aliveness for each channel, reconnect if if noinformation has been transmitted in the checking interval
        // this._watcher.start();
    }

    /**
     * Handles a disconnection event
     */
    protected _onDisconnected() {
        this._watcher.stop();
        this.emit("disconnected");
    }

    /**
     * Handles the closing event
     */
    protected _onClosing() {
        this._watcher.stop();
        this.emit("closing");
    }

    /**
     * Fires before connect
     */
    protected _beforeConnect() {
        console.log("base", "beforeconnect");
        //
    }

    /**
     * Fires before close
     */
    protected _beforeClose() {
        //
    }

    /**
     * Handles the closed event
     */
    protected _onClosed() {
        this.emit("closed");
    }

    ////////////////////////////////////////////
    // ABSTRACT

    protected abstract _onMessage(msg: any);

    protected abstract _sendSubPrivateOrders(
        subscriptionId: string,
        channel: PrivateChannelSubscription,
    );

    protected abstract _sendUnsubPrivateOrders(
        subscriptionId: string,
        channel: PrivateChannelSubscription,
    );
}
