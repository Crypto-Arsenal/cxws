/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { BasicPrivateClient, PrivateChannelSubscription } from "../BasicPrivateClient";
import { base64Encode, hmacSign } from "../Jwt";
import moment from "moment";
import { OrderStatus } from "../OrderStatus";
import { Order } from "../Order";

export class HuobiPrivateBase extends BasicPrivateClient {
    constructor({ apiKey, apiSecret, name, wssPath, watcherMs }) {
        super(wssPath, name, apiKey, apiSecret, undefined, watcherMs);
        this.hasPrivateOrders = true;
    }

    protected _sendPong(ts: number) {
        if (this._wss) {
            const msg = {
                "action": "pong",
                "data": {
                    "ts": ts,
                }
            };
            this._wss.send(JSON.stringify(msg));
        }
    }

    protected _onConnected() {
        this._sendAuthentication();
    }

    protected _sendAuthentication() {
        const timestamp = moment.utc().format("YYYY-MM-DDTHH:mm:ss");

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
        const signature = base64Encode(hmacSign("sha256", this.apiSecret, meta));

        this._wss.send(
            JSON.stringify({
                action: "req",
                ch: "auth",
                params: {
                    authType: "api",
                    ...signPayload,
                    signature,
                },
            }),
        );
    }

    protected _sendSubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription) {
        // Trading symbol (wildcard * is allowed)
        this._wss.send(
            JSON.stringify({
                action: "sub",
                ch: "orders#*",
            }),
        );
    }

    protected _sendUnsubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription) {
        throw new Error("Method not implemented.");
    }

    protected _onMessage(raw: string) {
        console.log('_onMessage', raw);

        let msgs = JSON.parse(raw);
        // handle pongs
        if (msgs.action == 'ping') {
            this._sendPong(msgs.data.ts);
            return;
        }

        if (!msgs.ch) return;

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
                status = OrderStatus.NEW;
            } else if (status === "partial-filled") {
                status = OrderStatus.PARTIALLY_FILLED;
            } else if (status === "filled") {
                status = OrderStatus.FILLED;
            } else if (status === "canceled" || status === "partial-canceled") {
                status = OrderStatus.CANCELED;
            } else {
                // SKIP rejected
                console.log(`not going to update with status ${status}`);
                return;
            }
            const isSell = data.type.substring(0, 4).toLowerCase() == "sell";
            let amount = Math.abs(Number(data.orderSize || 0));
            const amountFilled = Math.abs(Number(data.tradeVolume || 0));
            const price = Number(data.tradePrice || 0) || Number(data.orderPrice || 0);
            if (status === OrderStatus.FILLED) {
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
            } as Order;

            this.emit("orders", change);
            // {"action":"sub","code":200,"ch":"orders#*","data":{}} send empty snapshot on restart
        }
    }
}
