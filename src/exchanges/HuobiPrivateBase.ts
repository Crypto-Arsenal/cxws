/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { BasicPrivateClient, PrivateChannelSubscription } from "../BasicPrivateClient";
import { base64Encode, hmacSign } from "../Jwt";
import moment from "moment";

export class HuobiPrivateBase extends BasicPrivateClient {
    constructor({ apiKey, apiSecret, name, wssPath, watcherMs }) {
        super(wssPath, name, undefined, watcherMs);
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.hasPrivateOrders = true;
    }

    protected _sendPong(ts: number) {
        if (this._wss) {
            this._wss.send(JSON.stringify({ pong: ts }));
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
        console.log(raw);

        let msgs = JSON.parse(raw);
        // handle pongs
        if (msgs.ping) {
            this._sendPong(msgs.ping);
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
            this.emit("orders", data);
            // {"action":"sub","code":200,"ch":"orders#*","data":{}} send empty snapshot on restart
        }
    }
}
