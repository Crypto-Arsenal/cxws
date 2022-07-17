"use strict";
/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitgetPrivateClient = void 0;
const BasicPrivateClient_1 = require("../BasicPrivateClient");
const querystring_1 = require("querystring");
const crypto_1 = require("crypto");
const OrderStatus_1 = require("../OrderStatus");
// TODO: send instIds from broker
const instIds = [
    "BTCUSDT_SPBL",
    "ETHUSDT_SPBL",
    "BNBUSDT_SPBL",
    "XRPUSDT_SPBL",
    "ADAUSDT_SPBL",
    "SOLUSDT_SPBL",
    "AVAXUSDT_SPBL",
    "DOTUSDT_SPBL",
    "DOGEUSDT_SPBL",
    "SHIBUSDT_SPBL",
    "MATICUSDT_SPBL",
    "WBTCUSDT_SPBL",
    "CROUSDT_SPBL",
    "DAIUSDT_SPBL",
    "ATOMUSDT_SPBL",
    "LTCUSDT_SPBL",
    "NEARUSDT_SPBL",
    "LINKUSDT_SPBL",
    "UNIUSDT_SPBL",
    "TRXUSDT_SPBL",
    "FTTUSDT_SPBL",
    "BCHUSDT_SPBL",
    "ETCUSDT_SPBL",
    "MANAUSDT_SPBL",
    "ICPUSDT_SPBL",
    "SANDUSDT_SPBL",
    "EGLDUSDT_SPBL",
    "FTMUSDT_SPBL",
    "FILUSDT_SPBL",
    "APEUSDT_SPBL",
    "AXSUSDT_SPBL",
    "KLAYUSDT_SPBL",
    "RUNEUSDT_SPBL",
    "HNTUSDT_SPBL",
    "EOSUSDT_SPBL",
    "CAKEUSDT_SPBL",
    "BTTUSDT_SPBL",
    "AAVEUSDT_SPBL",
    "MKRUSDT_SPBL",
    "GRTUSDT_SPBL",
    "LUNAUSDT_SPBL",
    "CVXUSDT_SPBL",
    "NEXOUSDT_SPBL",
];
class BitgetPrivateClient extends BasicPrivateClient_1.BasicPrivateClient {
    constructor({ apiKey, apiSecret, apiPassword, name = "bitget", 
    // international
    wssPath = "wss://ws.bitget.com/spot/v1/stream", }) {
        super(wssPath, name, apiKey, apiSecret, apiPassword, undefined);
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
    _beforeConnect() {
        this._wss.on("connected", this._startPing.bind(this));
        this._wss.on("disconnected", this._stopPing.bind(this));
        this._wss.on("closed", this._stopPing.bind(this));
    }
    /**
     * @documentation https://bitgetlimited.github.io/apidoc/en/spot/#connect
     * @note should ping less than 30 seconds
     */
    _startPing() {
        clearInterval(this._pingInterval);
        this._pingInterval = setInterval(this._sendPing.bind(this), 20000);
    }
    _stopPing() {
        clearInterval(this._pingInterval);
    }
    _sendPing() {
        if (this._wss) {
            this._wss.send("ping");
        }
    }
    _toJsonString(obj) {
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
    _encrypt(httpMethod, url, qsOrBody, timestamp, secretKey) {
        httpMethod = httpMethod.toUpperCase();
        const qsOrBodyStr = qsOrBody
            ? httpMethod === "GET"
                ? "?" + (0, querystring_1.stringify)(qsOrBody)
                : this._toJsonString(qsOrBody)
            : "";
        const preHash = String(timestamp) + httpMethod + url + qsOrBodyStr;
        const mac = (0, crypto_1.createHmac)("sha256", secretKey);
        const preHashToMacBuffer = mac.update(preHash).digest();
        return preHashToMacBuffer.toString("base64");
    }
    _sendAuthentication() {
        const timestamp = Math.floor(Date.now() / 1000);
        const sign = this._encrypt("GET", "/user/verify", null, timestamp, this.apiSecret);
        this._wss.send(JSON.stringify({
            op: "login",
            args: [
                {
                    apiKey: this.apiKey,
                    passphrase: this.apiPassword,
                    timestamp: timestamp.toString(),
                    sign: sign,
                },
            ],
        }));
    }
    /**
     * @documentation https://bitgetlimited.github.io/apidoc/en/spot/#order-channel
     * @param subscriptionId
     * @param channel
     * @note should specify what currency to track
     */
    _sendSubPrivateOrders(subscriptionId, channel) {
        // Trading symbol (wildcard * is allowed)
        this._wss.send(JSON.stringify({
            op: "subscribe",
            args: instIds.map((instId) => {
                return {
                    channel: "orders",
                    instType: "spbl",
                    instId: instId,
                };
            }),
            // args: [
            //     {
            //         channel: "orders",
            //         instType: "spbl",
            //         instId: "ETHUSDT_SPBL",
            //     },
            // ],
        }));
    }
    _sendUnsubPrivateOrders(subscriptionId, channel) {
        throw new Error("Method not implemented.");
    }
    _onMessage(raw) {
        console.log('_onMessage', raw);
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
        if (arg && arg.channel == "orders" && data) {
            /**
             * https://bitgetlimited.github.io/apidoc/en/spot/#order-channel
             * @example
{
    "action":"snapshot",
    "arg":{
        "instType":"spbl",
        "channel":"orders",
        "instId":"ETCUSDT_SPBL"
    },
    "data":[
        {
            "instId":"ETCUSDT_SPBL",
            "ordId":"877049591807512576",
            "clOrdId":"68f2ae11-b4e8-4a73-a30a-7ef73734ca2f",
            "px":"5.3221",
            "sz":"1.0000",
            "notional":"5.322100",
            "ordType":"limit",
            "force":"normal",
            "side":"buy",
            "accFillSz":"0.0000",
            "avgPx":"0.0000",
            "status":"new",
            "cTime":1644830838157,
            "uTime":1644830838157,
            "orderFee":[{"feeCcy":"USDT","fee":"-0.01006285"}]
        }
    ]
}
            */
            for (const d of data) {
                let status = d.status;
                // map to our status
                if (status === "new") {
                    status = OrderStatus_1.OrderStatus.NEW;
                }
                else if (status === "partial-fill") {
                    status = OrderStatus_1.OrderStatus.PARTIALLY_FILLED;
                }
                else if (status === "full-fill") {
                    status = OrderStatus_1.OrderStatus.FILLED;
                }
                else if (status === "cancelled") {
                    status = OrderStatus_1.OrderStatus.CANCELED;
                }
                else {
                    console.log(`not going to update with status ${status}`);
                    continue;
                }
                const isSell = d.side.toLowerCase() == "sell";
                const amount = Math.abs(Number(d.sz || 0));
                const amountFilled = Math.abs(Number(d.accFillSz || 0));
                const price = Number(d.avgPx || 0) || Number(d.px || 0);
                let commissionCurrency = null;
                let commissionAmount = 0;
                if (Array.isArray(d.orderFee) && d.orderFee.length) {
                    commissionCurrency = d.orderFee[0].feeCcy;
                    for (const orderFee of d.orderFee) {
                        if (orderFee.feeCcy === commissionCurrency) {
                            commissionAmount += Number(orderFee.fee || 0);
                        }
                    }
                }
                // FeeNegative number represents the user transaction fee charged by the platform.Positive number represents rebate.
                commissionAmount = -commissionAmount;
                const change = {
                    exchange: this.name,
                    pair: d.instId,
                    exchangeOrderId: d.ordId,
                    status: status,
                    msg: status,
                    price: price,
                    amount: isSell ? -amount : amount,
                    amountFilled: isSell ? -amountFilled : amountFilled,
                    commissionAmount: commissionAmount,
                    commissionCurrency: commissionCurrency,
                };
                this.emit("orders", change);
            }
        }
        // {"action":"push","ch":"orders#*","data":{"orderSource":"spot-web","orderCreateTime":1644823806980,"accountId":46333987,"orderPrice":"0.53181","orderSize":"9.964","symbol":"adausdt","type":"buy-limit","orderId":472952725417169,"eventType":"creation","clientOrderId":"","orderStatus":"submitted"}}
        // if (ch == "orders#*" && data) {
        //     this.emit("orders", data);
        //     // {"action":"sub","code":200,"ch":"orders#*","data":{}} send empty snapshot on restart
        // }
    }
}
exports.BitgetPrivateClient = BitgetPrivateClient;
//# sourceMappingURL=BitgetPrivateClient.js.map