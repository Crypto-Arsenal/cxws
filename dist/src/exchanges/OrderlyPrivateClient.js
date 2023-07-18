"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderlyPrivateClient = void 0;
/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-implied-eval */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const BasicPrivateClient_1 = require("../BasicPrivateClient");
const Throttle_1 = require("../flowcontrol/Throttle");
const OrderStatus_1 = require("../OrderStatus");
const OrderEvent_1 = require("../OrderEvent");
const pongBuffer = Buffer.from("pong");
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
const KEYS = {
    publicKey: "ed25519:Es2JQ7s9xmXRqTddasFFtCbtssjHAo6eg1kGfnYHZfzR",
    accountId: "19ebb9b345e1ba2eb9b3734e8633eaf46f7a4020627bae33de1f7f00f6090a37",
    tradingPublic: "1569edec043cc88171be4714afbd0b03a66e8b278d3801c2282827de2a8fba6c5ab800bb237ddc847fe7d6822bb470d11fcd13206c294c2f265399d4b577bfd3",
    tradingSecret: "1ca8ceae272c6bb4e94d08e5d6681fe80fc1db7658f75c75e8d81ab23c3c18a3",
    orderlyKeyPrivate: "ed25519:4kPFs2WH4ETFvFfc45JM1SDJeQQsJXnTdUr6PbXcdm7Yd1CZQaEA2y3KFfA77oeZhkP6uwCM3VV2ugdnEdQTgokm",
};
class OrderlyPrivateClient extends BasicPrivateClient_1.BasicPrivateClient {
    constructor({ wssPath = `wss://ws-private.orderly.org/v2/ws/private/stream/${KEYS.accountId}`, watcherMs, apiKey, apiSecret, apiPassword, sendThrottleMs = 20, testNet = false, } = {}) {
        if (testNet) {
            wssPath = `wss://testnet-ws-private.orderly.org/v2/ws/private/stream/${KEYS.accountId}`;
        }
        super(wssPath, "okex", apiKey, apiSecret, apiPassword, undefined, watcherMs);
        this.hasPrivateOrders = true;
        this._sendMessage = (0, Throttle_1.throttle)(this.__sendMessage.bind(this), sendThrottleMs);
    }
    /**
     *
     * @param subscriptionId
     * @param channel
     * @see https://www.okx.com/docs-v5/en/#websocket-api-private-channel-order-channel
     */
    // TODO: https://docs-api.orderly.network/#websocket-api-private-execution-report
    _sendSubPrivateOrders(subscriptionId, channel) {
        this._wss.send(JSON.stringify({
            id: "clientID3",
            topic: "executionreport",
            event: "subscribe",
        }));
    }
    _sendUnsubPrivateOrders(subscriptionId, channel) {
        throw new Error("Method not implemented.");
    }
    _beforeClose() {
        this._sendMessage.cancel();
    }
    _beforeConnect() {
        this._wss.on("connected", this._startPing.bind(this));
        this._wss.on("disconnected", this._stopPing.bind(this));
        this._wss.on("closed", this._stopPing.bind(this));
    }
    _onConnected() {
        this._sendAuthentication();
    }
    // TODO: SAM
    // https://docs-api.orderly.network/#authentication
    // https://docs-api.orderly.network/#websocket-api-auth
    _sendAuthentication() {
        console.log("_sendAuthentication");
        // const timestamp = "" + Date.now() / 1000;
        // const sign = base64Encode(
        //     hmacSign("sha256", this.apiSecret, timestamp + "GET" + "/users/self/verify"),
        // );
        // this._wss.send(
        //     JSON.stringify({
        //         op: "login",
        //         args: [
        //             {
        //                 apiKey: this.apiKey,
        //                 passphrase: this.apiPassword,
        //                 timestamp,
        //                 sign,
        //             },
        //         ],
        //     }),
        // );
    }
    _startPing() {
        clearInterval(this._pingInterval);
        this._pingInterval = setInterval(this._sendPing.bind(this), 8 * 1000);
    }
    _stopPing() {
        clearInterval(this._pingInterval);
    }
    _sendPing() {
        if (this._wss) {
            this._wss.send(JSON.stringify({
                event: "ping",
            }));
        }
    }
    /**
     * Constructs a market argument in a backwards compatible manner where
     * the default is a spot market.
     */
    _marketArg(method, market) {
        const type = (market.type || "spot").toLowerCase();
        return `${type.toLowerCase()}/${method}:${market.id}`;
    }
    __sendMessage(msg) {
        this._wss.send(msg);
    }
    _onMessage(raw) {
        console.log("_onMessage", raw);
        // process JSON message
        try {
            if (raw == "pong") {
                return;
            }
            const msg = JSON.parse(raw);
            this._processsMessage(msg);
        }
        catch (ex) {
            this.emit("error", ex);
        }
    }
    _processsMessage(msg) {
        console.log("msg", msg);
        if (msg.event === "error") {
            this.emit("error", msg);
            return;
        }
        if (msg.event === "login") {
            this.emit("login", msg);
            super._onConnected();
            return;
        }
        // clear semaphore on subscription event reply
        if (msg.event === "subscribe") {
            return;
        }
        // ignore unsubscribe
        if (msg.event === "unsubscribe") {
            return;
        }
        // prevent failed messages from
        if (!msg.data) {
            // eslint-disable-next-line no-console
            console.warn("warn: failure response", JSON.stringify(msg));
            return;
        }
        if (msg.arg.channel === "orders" || msg.arg.channel === "orders-algo") {
            /**
             * https://www.okx.com/docs-v5/en/#websocket-api-private-channel-order-channel
             * @example
    {
        arg: { channel: 'orders', instType: 'SPOT', uid: '277380621964292096' },
        data: [
            {
                accFillSz: '0',
                amendResult: '',
                avgPx: '0',
                cTime: '1644399065370',
                category: 'normal',
                ccy: '',
                clOrdId: '',
                code: '0',
                execType: '',
                fee: '0',
                feeCcy: 'SOL',
                fillFee: '0',
                fillFeeCcy: '',
                fillNotionalUsd: '',
                fillPx: '',
                fillSz: '0',
                fillTime: '',
                instId: 'SOL-USDT',
                instType: 'SPOT',
                lever: '0',
                msg: '',
                notionalUsd: '0.20019800000000001',
                ordId: '411574742792163328',
                ordType: 'limit',
                pnl: '0',
                posSide: '',
                px: '20',
                rebate: '0',
                rebateCcy: 'USDT',
                reduceOnly: 'false',
                reqId: '',
                side: 'buy',
                slOrdPx: '',
                slTriggerPx: '',
                slTriggerPxType: 'last',
                source: '',
                state: 'live', | canceled
                sz: '0.01',
                tag: '',
                tdMode: 'cash',
                tgtCcy: '',
                tpOrdPx: '',
                tpTriggerPx: '',
                tpTriggerPxType: 'last',
                tradeId: '',
                uTime: '1644399065370'
            }
        ]
    }
            */
            for (const d of msg.data) {
                let status = d.state;
                // map to our status
                if (status === "open" || status === "live") {
                    status = OrderStatus_1.OrderStatus.NEW;
                }
                else if (status === "partially_filled") {
                    status = OrderStatus_1.OrderStatus.PARTIALLY_FILLED;
                }
                else if (status === "filled" || status === "closed") {
                    status = OrderStatus_1.OrderStatus.FILLED;
                }
                else if (status === "canceled" ||
                    status === "cancelled" ||
                    status === "expired" ||
                    status === "order_failed") {
                    status = OrderStatus_1.OrderStatus.CANCELED;
                }
                else if (msg.arg.channel === "orders-algo" && status === "effective") {
                    const data = {
                        oldId: d.algoId,
                        newId: d.ordId,
                    };
                    console.log("onOrderIdChanged", data);
                    this.emit("onOrderIdChanged", data);
                    continue;
                }
                else {
                    console.log(`not going to update with status ${status}`);
                    continue;
                }
                let event = null;
                if (d.category === "full_liquidation" || d.category == "partial_liquidation") {
                    event = OrderEvent_1.OrderEvent.LIQUIDATION;
                }
                const isSell = d.side.substring(0, 4).toLowerCase() == "sell";
                const amount = Math.abs(Number(d.sz || 0));
                const amountFilled = Math.abs(Number(d.accFillSz || 0));
                const price = Number(d.avgPx || 0) || Number(d.px || 0);
                const change = {
                    exchange: this.name,
                    pair: d.instId,
                    exchangeOrderId: d.ordId || d.algoId || d.clOrdId,
                    status: status,
                    event: event,
                    msg: status,
                    price: price,
                    amount: isSell ? -amount : amount,
                    amountFilled: isSell ? -amountFilled : amountFilled,
                    // Negative number represents the user transaction fee charged by the platform.
                    // Positive number represents rebate.
                    commissionAmount: -Number(d.fee || 0),
                    commissionCurrency: d.feeCcy,
                };
                this.emit("orders", change);
            }
        }
    }
}
exports.OrderlyPrivateClient = OrderlyPrivateClient;
//# sourceMappingURL=OrderlyPrivateClient.js.map