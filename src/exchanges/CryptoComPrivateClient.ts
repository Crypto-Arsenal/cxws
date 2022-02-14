/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { BasicPrivateClient, PrivateChannelSubscription } from "../BasicPrivateClient";
import { base64Encode, hmacSign } from "../Jwt";
import moment from "moment";
import crypto from "crypto-js";

export class CryptoComPrivateClient extends BasicPrivateClient {
    constructor({
        apiKey,
        apiSecret,
        name = "CryptoCom",
        wssPath = "wss://stream.crypto.com/v2/user",
    }) {
        super(wssPath, name, undefined);
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
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
        console.log(raw);

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

        /**
         *  @example {"id":-1,"method":"subscribe","code":0,"result":{"instrument_name":"ADA_USDT","subscription":"user.order.ADA_USDT","channel":"user.order","data":[{"status":"CANCELED","side":"BUY","price":0.5,"quantity":6.0,"order_id":"2247776793164618561","client_oid":"","create_time":1644825768645,"update_time":1644825807344,"type":"LIMIT","instrument_name":"ADA_USDT","avg_price":0.0,"cumulative_quantity":0.0,"cumulative_value":0.0,"fee_currency":"ADA","exec_inst":"","time_in_force":"GOOD_TILL_CANCEL"}]}}
         */
        if (method == "subscribe" && result && result.channel == "user.order") {
            this.emit("orders", result.data);
        }
    }
}
