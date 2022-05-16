"use strict";
/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HuobiPrivateBase = void 0;
const BasicPrivateClient_1 = require("../BasicPrivateClient");
const Jwt_1 = require("../Jwt");
const moment_1 = __importDefault(require("moment"));
const OrderStatus_1 = require("../OrderStatus");
class HuobiPrivateBase extends BasicPrivateClient_1.BasicPrivateClient {
    constructor({ apiKey, apiSecret, name, wssPath, watcherMs }) {
        super(wssPath, name, apiKey, apiSecret, undefined, watcherMs);
        this.hasPrivateOrders = true;
    }
    _sendPong(ts) {
        if (this._wss) {
            this._wss.send(JSON.stringify({ pong: ts }));
        }
    }
    _onConnected() {
        this._sendAuthentication();
    }
    _sendAuthentication() {
        const timestamp = moment_1.default.utc().format("YYYY-MM-DDTHH:mm:ss");
        const signPayload = {
            accessKey: this.apiKey,
            signatureMethod: "HmacSHA256",
            signatureVersion: "2.1",
            timestamp: timestamp,
        };
        var pars = [];
        //将参数值 encode
        for (const item in signPayload) {
            pars.push(item + "=" + encodeURIComponent("" + signPayload[item]));
        }
        //排序 并加入&连接
        var p = pars.sort().join("&");
        const parsedUrl = new URL(this.wssPath);
        if (!parsedUrl?.host || !parsedUrl?.pathname) {
            const error = new Error("api base url invalid");
            throw error;
        }
        // 在method, host, path 后加入\n
        var meta = ["GET", parsedUrl?.host, parsedUrl?.pathname, p].join("\n");
        const signature = (0, Jwt_1.base64Encode)((0, Jwt_1.hmacSign)("sha256", this.apiSecret, meta));
        this._wss.send(JSON.stringify({
            action: "req",
            ch: "auth",
            params: {
                authType: "api",
                ...signPayload,
                signature,
            },
        }));
    }
    _sendSubPrivateOrders(subscriptionId, channel) {
        // Trading symbol (wildcard * is allowed)
        this._wss.send(JSON.stringify({
            action: "sub",
            ch: "orders#*",
        }));
    }
    _sendUnsubPrivateOrders(subscriptionId, channel) {
        throw new Error("Method not implemented.");
    }
    _onMessage(raw) {
        console.log('_onMessage', raw);
        let msgs = JSON.parse(raw);
        // handle pongs
        if (msgs.ping) {
            this._sendPong(msgs.ping);
            return;
        }
        if (!msgs.ch)
            return;
        const { ch, data } = msgs;
        if (ch == "auth") {
            // {"action":"req","code":2002,"ch":"auth","message":"auth.fail"}
            if (ch.message) {
                this.emit("error", ch.message);
                return;
            }
            // {"action":"req","code":200,"ch":"auth","data":{}}
            super._onConnected();
        }
        // {"action":"push","ch":"orders#*","data":{"orderSource":"spot-web","orderCreateTime":1644823806980,"accountId":46333987,"orderPrice":"0.53181","orderSize":"9.964","symbol":"adausdt","type":"buy-limit","orderId":472952725417169,"eventType":"creation","clientOrderId":"","orderStatus":"submitted"}}
        if (ch == "orders#*" && data) {
            /**
             * https://huobiapi.github.io/docs/spot/v1/en/#subscribe-order-updates
             *  @example
{
    "action":"push",
    "ch":"orders#btcusdt",
    "data":
    {
        "tradePrice":"76.000000000000000000",
        "tradeVolume":"1.013157894736842100",
        "tradeId":301,
        "tradeTime":1583854188883,
        "aggressor":true,
        "remainAmt":"0.000000000000000400000000000000000000",
        "execAmt":"2",
        "orderId":27163536,
        "type":"sell-limit",
        "clientOrderId":"abc123",
        "orderSource":"spot-api",
        "orderPrice":"15000",
        "orderSize":"0.01",
        "orderStatus":"filled",
        "symbol":"btcusdt",
        "eventType":"trade"
    }
}
             */
            let status = data.orderStatus;
            // map to our status
            if (status === "submitted") {
                status = OrderStatus_1.OrderStatus.NEW;
            }
            else if (status === "partial-filled") {
                status = OrderStatus_1.OrderStatus.PARTIALLY_FILLED;
            }
            else if (status === "filled") {
                status = OrderStatus_1.OrderStatus.FILLED;
            }
            else if (status === "canceled" || status === "partial-canceled") {
                status = OrderStatus_1.OrderStatus.CANCELED;
            }
            else {
                // SKIP rejected
                console.log(`not going to update with status ${status}`);
                return;
            }
            const isSell = data.type.substring(0, 4).toLowerCase() == "sell";
            let amount = Math.abs(Number(data.orderSize || 0));
            const amountFilled = Math.abs(Number(data.tradeVolume || 0));
            const price = Number(data.tradePrice || 0) || Number(data.orderPrice || 0);
            if (status === OrderStatus_1.OrderStatus.FILLED) {
                amount = amountFilled;
            }
            const change = {
                exchange: this.name,
                pair: data.symbol,
                exchangeOrderId: data.orderId || data.clientOrderId,
                status: status,
                msg: status,
                price: price,
                amount: isSell ? -amount : amount,
                amountFilled: isSell ? -amountFilled : amountFilled,
                commissionAmount: null,
                commissionCurrency: null,
            };
            this.emit("orders", change);
            // {"action":"sub","code":200,"ch":"orders#*","data":{}} send empty snapshot on restart
        }
    }
}
exports.HuobiPrivateBase = HuobiPrivateBase;
//# sourceMappingURL=HuobiPrivateBase.js.map