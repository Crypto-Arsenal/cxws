/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { BasicPrivateClient, PrivateChannelSubscription } from "../BasicPrivateClient";
import { base64Encode, hmacSign } from "../Jwt";
import moment from "moment";
import crypto from "crypto-js";
import * as ccxt from "ccxt";
import { OrderStatus } from "../OrderStatus";
import { Order } from "../Order";
export class CryptoComPrivateClient extends BasicPrivateClient {
    constructor({
        apiKey,
        apiSecret,
        name = "cryptocom" as ccxt.ExchangeId,
        wssPath = "wss://stream.crypto.com/v2/user",
    }) {
        super(wssPath, name, apiKey, apiSecret, "", undefined);
        this.hasPrivateOrders = true;
    }

    /**
     * @source https://exchange-docs.crypto.com/spot/index.html?javascript#digital-signature
     */
    protected _signRequest = request_body => {
        const { id, method, params, nonce } = request_body;

        function isObject(obj) {
            return obj !== undefined && obj !== null && obj.constructor == Object;
        }
        function isArray(obj) {
            return obj !== undefined && obj !== null && obj.constructor == Array;
        }
        function arrayToString(obj) {
            return obj.reduce((a, b) => {
                return a + (isObject(b) ? objectToString(b) : isArray(b) ? arrayToString(b) : b);
            }, "");
        }
        function objectToString(obj) {
            return obj == null
                ? ""
                : Object.keys(obj)
                      .sort()
                      .reduce((a, b) => {
                          return (
                              a +
                              b +
                              (isArray(obj[b])
                                  ? arrayToString(obj[b])
                                  : isObject(obj[b])
                                  ? objectToString(obj[b])
                                  : obj[b])
                          );
                      }, "");
        }

        const paramsString = objectToString(params);

        console.log(paramsString);

        const sigPayload = method + id + this.apiKey + paramsString + nonce;
        request_body.sig = crypto.HmacSHA256(sigPayload, this.apiSecret).toString(crypto.enc.Hex);
        return request_body;
    };

    protected _sendPong(ts: number) {
        if (this._wss) {
            this._wss.send(
                JSON.stringify({
                    id: ts,
                    method: "public/respond-heartbeat",
                }),
            );
        }
    }

    protected _onConnected() {
        this._sendAuthentication();
    }

    protected _sendAuthentication() {
        const timestamp = Date.now();

        const signedRequest = this._signRequest({
            id: timestamp,
            method: "public/auth",
            api_key: this.apiKey,
            nonce: timestamp,
        });

        this._wss.send(JSON.stringify(signedRequest));
    }

    /**
     *  @document https://exchange-docs.crypto.com/spot/index.html?javascript#user-order-instrument_name
     */
    protected _sendSubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription) {
        const timestamp = Date.now();

        this._wss.send(
            JSON.stringify({
                id: timestamp,
                method: "subscribe",
                params: {
                    channels: ["user.order"],
                },
                nonce: timestamp,
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

        if (!msgs.method) return;

        const { method, id, result } = msgs;

        if (method == "public/heartbeat") {
            this._sendPong(id);
            return;
        }

        if (method == "public/auth") {
            // {"action":"req","code":2002,"ch":"auth","message":"auth.fail"}
            if (msgs.message) {
                this.emit("error", msgs.message);
                return;
            }

            // {"action":"req","code":200,"ch":"auth","data":{}}
            super._onConnected();
        }

        if (method == "subscribe" && result && result.channel == "user.order") {
            /**
             * https://exchange-docs.crypto.com/spot/index.html#user-margin-order-instrument_name
             *  @example
{
    "id":-1,
    "method":"subscribe",
    "code":0,
    "result":{
        "instrument_name":"ADA_USDT",
        "subscription":"user.order.ADA_USDT",
        "channel":"user.order",
        "data":[
            {
                "status":"CANCELED",
                "side":"BUY",
                "price":0.5,
                "quantity":6,
                "order_id":"2247776793164618561",
                "client_oid":"",
                "create_time":1644825768645,
                "update_time":1644825807344,
                "type":"LIMIT",
                "instrument_name":"ADA_USDT",
                "avg_price":0,
                "cumulative_quantity":0,
                "cumulative_value":0,
                "fee_currency":"ADA",
                "exec_inst":"",
                "time_in_force":"GOOD_TILL_CANCEL"
            }
        ]
    }
}
             */
            for (const d of result.data) {
                let status = d.status;
                // map to our status
                if (status === "ACTIVE") {
                    // Note: To detect a 'partial filled' status, look for status as ACTIVE and cumulative_quantity > 0.
                    if (d.cumulative_quantity != 0) {
                        status = OrderStatus.PARTIALLY_FILLED;
                    } else {
                        status = OrderStatus.NEW;
                    }
                } else if (status === "FILLED") {
                    status = OrderStatus.FILLED;
                } else if (status === "CANCELED") {
                    status = OrderStatus.CANCELED;
                } else {
                    // REJECTED or EXPIRED
                    console.log(`not going to update with status ${status}`);
                    return;
                }

                const feeRate = 0.004;// https://crypto.com/exchange/document/fees-limits
                const isSell = d.side.toUpperCase() == "SELL";
                let amount = Math.abs(Number(d.quantity || 0));
                let amountFilled = Math.abs(Number(d.cumulative_quantity || 0));
                const price = Number(d.avg_price || 0) || Number(d.price || 0);
                let commissionAmount = 0;
                if (status === OrderStatus.FILLED) {
                    if (d.fee_currency.search("USDT") >= 0) {
                        // status: 'FILLED',
                        // side: 'SELL',
                        // quantity: 0.005,
                        // instrument_name: 'ETH_USDT',
                        // cumulative_quantity: 0.005,
                        // fee_currency: 'USDT',
                        commissionAmount = d.cumulative_value * feeRate;
                    } else if (d.instrument_name.search(d.fee_currency) >= 0) {
                        // status: 'FILLED',
                        // side: 'BUY',
                        // quantity: 0.005,
                        // instrument_name: 'ETH_USDT',
                        // cumulative_quantity: 0.00499,
                        // fee_currency: 'ETH',
                        commissionAmount = amountFilled * feeRate;
                        amount = amountFilled;
                    } else {
                        // fee_currency: 'CRO',
                        commissionAmount = null;
                        amount = amountFilled;
                    }
                }
                const change = {
                    exchange: this.name,
                    pair: d.instrument_name,
                    externalOrderId: d.order_id,
                    status: status,
                    msg: status,
                    price: price,
                    amount: isSell ? -amount : amount,
                    amountFilled: isSell ? -amountFilled : amountFilled,
                    commissionAmount: commissionAmount,
                    commissionCurrency: d.fee_currency,
                } as Order;

                this.emit("orders", change);
            }
            this.emit("orders", result.data);
        }
    }
}
