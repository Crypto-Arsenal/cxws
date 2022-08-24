/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { BasicPrivateClient, PrivateChannelSubscription } from "../BasicPrivateClient";
import { stringify } from "querystring";
import { createHmac } from "crypto";
import { CancelableFn } from "../flowcontrol/Fn";
import * as ccxt from "ccxt";
import { OrderStatus } from "../OrderStatus";
import { Order } from "../Order";
import { InvestmentType } from "../types";

// TODO: send instIds from broker
const SpotIds = [
    'BTCUSDT_SPBL',   'BTCUSDC_SPBL',   'ETHUSDT_SPBL',
    'ETHUSDC_SPBL',   'BNBUSDT_SPBL',   'BNBUSDC_SPBL',
    'XRPUSDT_SPBL',   'XRPUSDC_SPBL',   'ADAUSDT_SPBL',
    'ADAUSDC_SPBL',   'SOLUSDT_SPBL',   'SOLUSDC_SPBL',
    'DOGEUSDT_SPBL',  'DOGEUSDC_SPBL',  'DOTUSDT_SPBL',
    'DOTUSDC_SPBL',   'AVAXUSDT_SPBL',  'AVAXUSDC_SPBL',
    'WBTCUSDT_SPBL',  'TRXUSDT_SPBL',   'TRXUSDC_SPBL',
    'SHIBUSDT_SPBL',  'DAIUSDT_SPBL',   'DAIUSDC_SPBL',
    'MATICUSDT_SPBL', 'MATICUSDC_SPBL', 'CROUSDT_SPBL',
    'ATOMUSDT_SPBL',  'ATOMUSDC_SPBL',  'LTCUSDT_SPBL',
    'LTCUSDC_SPBL',   'NEARUSDT_SPBL',  'NEARUSDC_SPBL',
    'LINKUSDT_SPBL',  'LINKUSDC_SPBL',  'UNIUSDT_SPBL',
    'UNIUSDC_SPBL',   'FTTUSDT_SPBL',   'BCHUSDT_SPBL',
    'BCHUSDC_SPBL',   'ETCUSDT_SPBL',   'MANAUSDT_SPBL',
    'MANAUSDC_SPBL',  'ICPUSDT_SPBL',   'SANDUSDT_SPBL',
    'EGLDUSDT_SPBL',  'FTMUSDT_SPBL',   'FILUSDT_SPBL',
    'FILUSDC_SPBL',   'APEUSDT_SPBL',   'APEUSDC_SPBL',
    'AXSUSDT_SPBL',   'KLAYUSDT_SPBL',  'RUNEUSDT_SPBL',
    'HNTUSDT_SPBL',   'EOSUSDT_SPBL',   'EOSUSDC_SPBL',
    'MKRUSDT_SPBL',   'CAKEUSDT_SPBL',  'GRTUSDT_SPBL',
    'LUNAUSDT_SPBL',  'LUNAUSDC_SPBL',
]
export class BitgetPrivateClient extends BasicPrivateClient {
    protected _pingInterval: NodeJS.Timeout;

    constructor({
        apiKey,
        apiSecret,
        apiPassword,
        name = "bitget" as ccxt.ExchangeId,
        // international
        wssPath = "wss://ws.bitget.com/spot/v1/stream",
    }) {
        super(wssPath, name, apiKey, apiSecret, apiPassword, undefined);
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
        let ids = channel.options?.ids;
        const investmentType = channel.options?.investmentType;
        if (investmentType == undefined || investmentType == InvestmentType.SPOT) {
            if (!ids || !ids.length) {
                ids = SpotIds;
            }
            // Trading symbol (wildcard * is allowed)
            this._wss.send(
                JSON.stringify({
                    op: "subscribe",
                    args: ids.map((instId) => {
                        return {
                            channel: "orders",
                            instType: "spbl",
                            instId: instId,
                        }
                    }),
                    // args: [
                    //     {
                    //         channel: "orders",
                    //         instType: "spbl",
                    //         instId: "ETHUSDT_SPBL",
                    //     },
                    // ],
                }),
            );
        } else if (investmentType == undefined || investmentType == InvestmentType.USD_M_FUTURES) {
            this._wss.send(
                JSON.stringify({
                    op: "subscribe",
                    args: [
                        {
                            channel: "orders",
                            instType: "UMCBL",
                            instId: 'default',
                        },
                        {
                            channel: "ordersAlgo",
                            instType: "UMCBL",
                            instId: 'default',
                        },
                    ],
                }),
            );
        }
    }

    protected _sendUnsubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription) {
        throw new Error("Method not implemented.");
    }

    protected _onMessage(raw: string) {
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

        if (arg && (arg.channel == "orders" || arg.channel == "ordersAlgo") && data) {
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
                let state = d.state;

                // map to our status
                if (status === "new" || state === "not_trigger") {
                    status = OrderStatus.NEW;
                } else if (status === "partial-fill") {
                    status = OrderStatus.PARTIALLY_FILLED;
                } else if (status === "full-fill") {
                    status = OrderStatus.FILLED;
                } else if (status === "cancelled" || state === "cancel" || state === "fail_trigger") {
                    status = OrderStatus.CANCELED;
                } else if (arg.channel == "ordersAlgo" && state === "triggered") {
                    const data = {
                        oldId: d.id,
                        newId: d.ordId,
                    };
                    console.log('onOrderIdChanged', data);
                    this.emit("onOrderIdChanged", data);
                    continue;
                } else {
                    console.log(`not going to update with status ${status || state}`);
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
                    exchangeOrderId: d.ordId || d.id,
                    status: status,
                    msg: status,
                    price: price,
                    amount: isSell ? -amount : amount,
                    amountFilled: isSell ? -amountFilled : amountFilled,
                    commissionAmount: commissionAmount,
                    commissionCurrency: commissionCurrency,
                } as Order;

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
