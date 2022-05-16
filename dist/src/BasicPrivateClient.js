"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasicPrivateClient = void 0;
/* eslint-disable @typescript-eslint/no-unused-vars */
const events_1 = require("events");
const SmartWss_1 = require("./SmartWss");
const Watcher_1 = require("./Watcher");
/**
 * Single websocket connection client with
 * subscribe and unsubscribe methods. It is also an EventEmitter
 * and broadcasts 'trade' events.
 *
 * Anytime the WSS client connects (such as a reconnect)
 * it run the _onConnected method and will resubscribe.
 */
class BasicPrivateClient extends events_1.EventEmitter {
    constructor(wssPath, name, apiKey, apiSecret, apiPassword = "", wssFactory, watcherMs) {
        super();
        this.wssPath = wssPath;
        this.name = name;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.apiPassword = apiPassword;
        this._privateOrderSubs = new Map();
        this._wss = undefined;
        // this.wssPath = wssPath;
        this._watcher = new Watcher_1.Watcher(this, watcherMs);
        this.hasPrivateOrders = false;
        this._wssFactory = wssFactory || (path => new SmartWss_1.SmartWss(path));
    }
    getWssPath() {
        return this.wssPath;
    }
    //////////////////////////////////////////////
    close() {
        if (this._beforeClose) {
            this._beforeClose();
        }
        this._watcher.stop();
        if (this._wss) {
            this._wss.close();
            this._wss = undefined;
        }
    }
    reconnect() {
        this.emit("reconnecting");
        if (this._wss) {
            this._wss.once("closed", () => this._connect());
            this.close();
        }
        else {
            this._connect();
        }
    }
    subscribePrivateOrders(channel_sub) {
        console.log("base subscribePrivateOrders");
        if (!this.hasPrivateOrders)
            return;
        return this._subscribe({
            ...channel_sub,
            name: "openOrders",
        }, this._privateOrderSubs, this._sendSubPrivateOrders.bind(this));
    }
    unsubscribePrivateOrders(channel_sub) {
        if (!this.hasPrivateOrders)
            return;
        this._unsubscribe({
            ...channel_sub,
            name: "openOrders",
        }, this._privateOrderSubs, this._sendUnsubPrivateOrders.bind(this));
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
    _subscribe(channelSub, map, sendFn) {
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
    _unsubscribe(channel_sub, map, sendFn) {
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
    _connect() {
        console.log("base _connect", this._wss, this.getWssPath(), this.wssPath);
        if (!this._wss) {
            // register wss hanlder here
            // wss could be overwritten on the fly
            console.log("_wssFactory", this.getWssPath());
            this._wss = this._wssFactory(this.getWssPath());
            this._wss.on("error", this._onError.bind(this));
            this._wss.on("connecting", this._onConnecting.bind(this));
            this._wss.on("connected", this._onConnected.bind(this));
            this._wss.on("disconnected", this._onDisconnected.bind(this));
            this._wss.on("closing", this._onClosing.bind(this));
            this._wss.on("closed", this._onClosed.bind(this));
            this._wss.on("message", (msg) => {
                try {
                    this._onMessage(msg);
                }
                catch (ex) {
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
    _onError(err) {
        this.emit("error", err);
    }
    /**
     * Handles the connecting event. This is fired any time the
     * underlying websocket begins a connection.
     */
    _onConnecting() {
        console.log("base", "_onConnecting");
        this.emit("connecting");
    }
    /**
     * This method is fired anytime the socket is opened, whether
     * the first time, or any subsequent reconnects. This allows
     * the socket to immediate trigger resubscription to relevent
     * feeds
     */
    _onConnected() {
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
    _onDisconnected() {
        this._watcher.stop();
        this.emit("disconnected");
    }
    /**
     * Handles the closing event
     */
    _onClosing() {
        this._watcher.stop();
        this.emit("closing");
    }
    /**
     * Fires before connect
     */
    _beforeConnect() {
        console.log("base", "beforeconnect");
        //
    }
    /**
     * Fires before close
     */
    _beforeClose() {
        //
    }
    /**
     * Handles the closed event
     */
    _onClosed() {
        this.emit("closed");
    }
}
exports.BasicPrivateClient = BasicPrivateClient;
//# sourceMappingURL=BasicPrivateClient.js.map