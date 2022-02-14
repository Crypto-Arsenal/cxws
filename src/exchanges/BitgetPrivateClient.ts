/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { BasicPrivateClient, PrivateChannelSubscription } from "../BasicPrivateClient";
import { stringify } from "querystring";
import { createHmac } from "crypto";
import { CancelableFn } from "../flowcontrol/Fn";

export class BitgetPrivateClient extends BasicPrivateClient {
    protected _pingInterval: NodeJS.Timeout;

    constructor({
        apiKey,
        apiSecret,
        apiPassword,
        name = "Bitget",
        // international
        wssPath = "wss://ws.bitget.com/spot/v1/stream",
    }) {
        super(wssPath, name, undefined);
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.apiPassword = apiPassword;
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

    protected _beforeConnect() {
        this._wss.on("connected", this._startPing.bind(this));
        this._wss.on("disconnected", this._stopPing.bind(this));
        this._wss.on("closed", this._stopPing.bind(this));
    }

    /**
     * @documentation https://bitgetlimited.github.io/apidoc/en/spot/#connect
     * @note should ping less than 30 seconds
     */
    protected _startPing() {
        clearInterval(this._pingInterval);
        this._pingInterval = setInterval(this._sendPing.bind(this), 20000);
    }

    protected _stopPing() {
        clearInterval(this._pingInterval);
    }

    protected _sendPing() {
        if (this._wss) {
            this._wss.send("ping");
        }
    }

    protected _toJsonString(obj: object): string | null {
        if (obj == null) {
            return null;
        }

        let json = JSON.stringify(obj);
        Object.keys(obj)
            .filter(key => key[0] === "_")
            .forEach(key => {
                json = json.replace(key, key.substring(1));
            });
        const reg = new RegExp('"_', "g");
        return json.replace(reg, '"');
    }

    protected _encrypt(
        httpMethod: string,
        url: string,
        qsOrBody: NodeJS.Dict<string | number> | null,
        timestamp: number,
        secretKey: string,
    ) {
        httpMethod = httpMethod.toUpperCase();
        const qsOrBodyStr = qsOrBody
            ? httpMethod === "GET"
                ? "?" + stringify(qsOrBody)
                : this._toJsonString(qsOrBody)
            : "";

        const preHash = String(timestamp) + httpMethod + url + qsOrBodyStr;

        const mac = createHmac("sha256", secretKey);
        const preHashToMacBuffer = mac.update(preHash).digest();
        return preHashToMacBuffer.toString("base64");
    }

    protected _sendAuthentication() {
        const timestamp = Math.floor(Date.now() / 1000);
        const sign = this._encrypt("GET", "/user/verify", null, timestamp, this.apiSecret);

        this._wss.send(
            JSON.stringify({
                op: "login",
                args: [
                    {
                        apiKey: this.apiKey,
                        passphrase: this.apiPassword,
                        timestamp: timestamp.toString(),
                        sign: sign,
                    },
                ],
            }),
        );
    }

    /**
     * @documentation https://bitgetlimited.github.io/apidoc/en/spot/#order-channel
     * @param subscriptionId
     * @param channel
     * @note should specify what currency to track
     */
    protected _sendSubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription) {
        // Trading symbol (wildcard * is allowed)
        this._wss.send(
            JSON.stringify({
                op: "subscribe",
                args: [
                    {
                        channel: "orders",
                        instType: "spbl",
                        instId: "ETCUSDT_SPBL",
                    },
                ],
            }),
        );
    }

    protected _sendUnsubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription) {
        throw new Error("Method not implemented.");
    }

    protected _onMessage(raw: string) {
        console.log(raw);

        /**
         * if no pong in 30 seconds then reconnect
         */
        if (raw == "pong") {
            return;
        }

        let msgs = JSON.parse(raw);

        const { event, action, arg, data } = msgs;

        /**
         * @example {"event":"error","code":30012,"msg":"Invalid ACCESS_PASSPHRASE"}
         */
        if (event == "error") {
            this.emit("error", msgs.msg);
        }

        if (event == "login") {
            /**
             * @example {"event":"login","code":0}
             */
            super._onConnected();
        }

        /**
         * @example {"action":"snapshot","arg":{"instType":"spbl","channel":"orders","instId":"ETCUSDT_SPBL"},"data":[{"instId":"ETCUSDT_SPBL","ordId":"877049591807512576","clOrdId":"68f2ae11-b4e8-4a73-a30a-7ef73734ca2f","px":"5.3221","sz":"1.0000","notional":"5.322100","ordType":"limit","force":"normal","side":"buy","accFillSz":"0.0000","avgPx":"0.0000","status":"new","cTime":1644830838157,"uTime":1644830838157,"orderFee":[]}]}
         */
        if (arg && arg.channel == "orders" && data) {
            this.emit("order", data);
        }

        // {"action":"push","ch":"orders#*","data":{"orderSource":"spot-web","orderCreateTime":1644823806980,"accountId":46333987,"orderPrice":"0.53181","orderSize":"9.964","symbol":"adausdt","type":"buy-limit","orderId":472952725417169,"eventType":"creation","clientOrderId":"","orderStatus":"submitted"}}
        // if (ch == "orders#*" && data) {
        //     this.emit("orders", data);
        //     // {"action":"sub","code":200,"ch":"orders#*","data":{}} send empty snapshot on restart
        // }
    }
}
