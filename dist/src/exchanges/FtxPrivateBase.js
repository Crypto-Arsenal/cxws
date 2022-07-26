"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FtxPrivateBaseClient = void 0;
/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const decimal_js_1 = __importDefault(require("decimal.js"));
const BasicPrivateClient_1 = require("../BasicPrivateClient");
const Jwt_1 = require("../Jwt");
const Level2Point_1 = require("../Level2Point");
const Level2Snapshots_1 = require("../Level2Snapshots");
const Level2Update_1 = require("../Level2Update");
const NotImplementedFn_1 = require("../NotImplementedFn");
const OrderStatus_1 = require("../OrderStatus");
class FtxPrivateBaseClient extends BasicPrivateClient_1.BasicPrivateClient {
    constructor({ name, wssPath, watcherMs, apiKey, apiSecret }) {
        super(wssPath, name, apiKey, apiSecret, "", undefined, watcherMs);
        this._sendSubCandles = NotImplementedFn_1.NotImplementedFn;
        this._sendUnsubCandles = NotImplementedFn_1.NotImplementedFn;
        this._sendSubLevel2Snapshots = NotImplementedFn_1.NotImplementedFn;
        this._sendUnsubLevel2Snapshots = NotImplementedFn_1.NotImplementedFn;
        this._sendSubLevel3Snapshots = NotImplementedFn_1.NotImplementedFn;
        this._sendUnsubLevel3Snapshots = NotImplementedFn_1.NotImplementedFn;
        this._sendSubLevel3Updates = NotImplementedFn_1.NotImplementedFn;
        this._sendUnsubLevel3Updates = NotImplementedFn_1.NotImplementedFn;
        this._pingIntervalTime = 15000;
        this.hasPrivateOrders = true;
    }
    _onConnected() {
        this._sendAuthentication();
        super._onConnected();
    }
    _beforeConnect() {
        this._wss.on("connected", this._startPing.bind(this));
        this._wss.on("disconnected", this._stopPing.bind(this));
        this._wss.on("closed", this._stopPing.bind(this));
    }
    _startPing() {
        clearInterval(this._pingInterval);
        this._pingInterval = setInterval(this._sendPing.bind(this), this._pingIntervalTime);
    }
    _stopPing() {
        clearInterval(this._pingInterval);
    }
    _sendSubPrivateOrders(subscriptionId, channel) {
        console.log("_sendSubPrivateOrders");
        this._wss.send(JSON.stringify({ op: "subscribe", channel: "orders" }));
        this._wss.send(JSON.stringify({ op: "subscribe", channel: "fills" }));
    }
    _sendUnsubPrivateOrders(subscriptionId, channel) {
        throw new Error("Method not implemented.");
    }
    _sendPing() {
        if (this._wss) {
            this._wss.send(JSON.stringify({
                op: "ping",
            }));
        }
    }
    _sendAuthentication() {
        const timestamp = new Date().getTime();
        console.log("sha256", this.apiSecret, `${timestamp}websocket_login`);
        const signature = (0, Jwt_1.hmacSign)("sha256", this.apiSecret, `${timestamp}websocket_login`).toString("hex");
        this._wss.send(JSON.stringify({
            op: "login",
            args: {
                key: this.apiKey,
                sign: signature,
                time: timestamp,
            },
        }));
    }
    _sendSubTicker(market) {
        this._wss.send(JSON.stringify({
            op: "subscribe",
            channel: "ticker",
            market,
        }));
    }
    _sendUnsubTicker(market) {
        this._wss.send(JSON.stringify({
            op: "unsubscribe",
            channel: "ticker",
            market,
        }));
    }
    _sendSubTrades(market) {
        this._wss.send(JSON.stringify({
            op: "subscribe",
            channel: "trades",
            market,
        }));
    }
    _sendUnsubTrades(market) {
        this._wss.send(JSON.stringify({
            op: "unsubscribe",
            channel: "trades",
            market,
        }));
    }
    _sendSubLevel2Updates(market) {
        this._wss.send(JSON.stringify({
            op: "subscribe",
            channel: "orderbook",
            market,
        }));
    }
    _sendUnsubLevel2Updates(market) {
        this._wss.send(JSON.stringify({
            op: "subscribe",
            channel: "orderbook",
            market,
        }));
    }
    _onMessage(raw) {
        console.log('_onMessage', raw);
        const { type, channel, data, msg } = JSON.parse(raw);
        if (!type) {
            return;
        }
        if (type == "error") {
            this.emit("error", msg);
            this._wss.close();
            return;
            // force restart
        }
        // { type: 'subscribed', channel: 'orders' }
        if (type == "subscribed") {
            console.log("subscribed to channel", channel);
            // subscribed to ... channel
            return;
        }
        /**
         * https://docs.ftx.com/#orders-2
         * {
  channel: 'orders',
  type: 'update',
  data: {
    id: 139027053866,
    clientId: null,
    market: 'SHIB/USD',
    type: 'market',
    side: 'buy',
    price: null,
    size: 500000,
    status: 'closed',
    filledSize: 500000,
    remainingSize: 0,
    reduceOnly: false,
    liquidation: false,
    avgFillPrice: 0.00002447,
    postOnly: false,
    ioc: true,
    createdAt: '2022-04-22T08:16:35.951318+00:00'
  }
}
         */
        if (type != "update") {
            console.log("not update");
            return;
        }
        let orderStatus = "";
        let change = undefined;
        const isSell = data.side.toLowerCase() == "sell";
        const amount = Math.abs(Number(data.size || 0));
        const amountFilled = Math.abs(Number(data.filledSize || 0));
        const price = Number(data.price || 0);
        switch (channel) {
            case "orders":
                if (data.status === "new") {
                    orderStatus = OrderStatus_1.OrderStatus.NEW;
                }
                else if (data.status === "closed") {
                    if (data.filledSize !== data.size) {
                        orderStatus = OrderStatus_1.OrderStatus.CANCELED;
                    }
                    else {
                        // order is filled
                        // already handle by 'fill' update
                        return;
                    }
                }
                this.emit("orders", {
                    exchange: "Ftx",
                    pair: data.market,
                    exchangeOrderId: data.id,
                    status: orderStatus,
                    msg: orderStatus,
                    price: price,
                    amount: isSell ? -amount : amount,
                    amountFilled: isSell ? -amountFilled : amountFilled,
                    commissionAmount: 0,
                    commissionCurrency: "",
                });
                break;
            case "fills":
                orderStatus = OrderStatus_1.OrderStatus.PARTIALLY_FILLED;
                this.emit("orders", {
                    exchange: this.name,
                    pair: data.market,
                    exchangeOrderId: data.orderId,
                    status: orderStatus,
                    msg: orderStatus,
                    price: price,
                    amount: null,
                    amountFilled: isSell ? -amount : amount,
                    commissionAmount: data.fee,
                    commissionCurrency: data.feeCurrency,
                });
                break;
        }
    }
    _orderbookUpdateEvent(data, market) {
        const content = this._orderbookEventContent(data, market);
        const eventData = new Level2Update_1.Level2Update(content);
        this.emit("l2update", eventData, market);
    }
    _orderbookSnapshotEvent(data, market) {
        const content = this._orderbookEventContent(data, market);
        const eventData = new Level2Snapshots_1.Level2Snapshot(content);
        this.emit("l2snapshot", eventData, market);
    }
    _orderbookEventContent(data, market) {
        const { time, asks, bids, checksum } = data;
        const level2PointAsks = asks.map(p => new Level2Point_1.Level2Point(p[0].toFixed(8), p[1].toFixed(8)));
        const level2PointBids = bids.map(p => new Level2Point_1.Level2Point(p[0].toFixed(8), p[1].toFixed(8)));
        const timestampMs = this._timeToTimestampMs(time);
        return {
            exchange: this.name,
            base: market.base,
            quote: market.quote,
            timestampMs,
            asks: level2PointAsks,
            bids: level2PointBids,
            checksum,
        };
    }
    _timeToTimestampMs(time) {
        return new decimal_js_1.default(time).mul(1000).toDecimalPlaces(0).toNumber();
    }
}
exports.FtxPrivateBaseClient = FtxPrivateBaseClient;
//# sourceMappingURL=FtxPrivateBase.js.map