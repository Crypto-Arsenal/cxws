"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderlyPrivateClient = exports.generateGetHeaders = exports.signPostRequestByOrderlyKey = exports.signMessageByTradingKey = exports.getOrderlyKeyPair = exports.getTradingKeyPair = void 0;
/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-implied-eval */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const BasicPrivateClient_1 = require("../BasicPrivateClient");
const Throttle_1 = require("../flowcontrol/Throttle");
const OrderStatus_1 = require("../OrderStatus");
const OrderEvent_1 = require("../OrderEvent");
const ethUtil = __importStar(require("ethereumjs-util"));
const elliptic_1 = require("elliptic");
const keccak256_1 = __importDefault(require("keccak256"));
const near_api_js_1 = require("near-api-js");
function getTradingKeyPair(tradingKeyPrivateKey) {
    const ec = new elliptic_1.ec("secp256k1");
    const keyPair = ec.keyFromPrivate(tradingKeyPrivateKey);
    return {
        privateKey: keyPair.getPrivate().toString("hex"),
        publicKey: keyPair.getPublic().encode("hex"),
        keyPair,
    };
}
exports.getTradingKeyPair = getTradingKeyPair;
function getOrderlyKeyPair(orderlyKeyPrivateKey) {
    console.log("private key", orderlyKeyPrivateKey);
    return near_api_js_1.KeyPair.fromString(orderlyKeyPrivateKey);
}
exports.getOrderlyKeyPair = getOrderlyKeyPair;
function handleZero(str) {
    if (str.length < 64) {
        const zeroArr = new Array(64 - str.length).fill(0);
        return zeroArr.join("") + str;
    }
    return str;
}
function signMessageByTradingKey(keyPair, params) {
    const ec = new elliptic_1.ec("secp256k1");
    const msgHash = (0, keccak256_1.default)(params);
    const privateKey = keyPair.getPrivate("hex");
    const signature = ec.sign(msgHash, privateKey, "hex", { canonical: true });
    const r = signature.r.toJSON();
    const s = signature.s.toJSON();
    const hexSignature = `${handleZero(r)}${handleZero(s)}0${signature.recoveryParam}`;
    return hexSignature;
}
exports.signMessageByTradingKey = signMessageByTradingKey;
function signPostRequestByOrderlyKey(keyPair, messageString) {
    const u8 = Buffer.from(messageString);
    const signStr = keyPair.sign(u8);
    return Buffer.from(signStr.signature).toString("base64");
}
exports.signPostRequestByOrderlyKey = signPostRequestByOrderlyKey;
const generateGetHeaders = (method, urlParam, params, orderlyKeyPrivate, accountId, orderlyKey, includeQuery = false) => {
    const timestamp = new Date().getTime().toString();
    const messageStr = [
        timestamp,
        method.toUpperCase(),
        includeQuery ? urlParam + "?" + new URLSearchParams(params).toString() : urlParam,
        includeQuery ? "" : params && Object.keys(params).length ? JSON.stringify(params) : "",
    ].join("");
    const messageBytes = new TextEncoder().encode(messageStr);
    const keyPair = getOrderlyKeyPair(orderlyKeyPrivate);
    const orderlySign = signPostRequestByOrderlyKey(keyPair, messageBytes);
    return Promise.resolve({
        "Content-Type": " application/x-www-form-urlencoded",
        "orderly-account-id": accountId,
        "orderly-key": orderlyKey,
        "orderly-signature": orderlySign,
        "orderly-timestamp": timestamp,
    });
};
exports.generateGetHeaders = generateGetHeaders;
const generatePostHeadersAndRequestData = (params, orderlyKeyPrivate, accountId, orderlyKey, tradingSecret, tradingPublic, includeQuery = false) => {
    const objectKeys = Object.keys(params);
    // if (objectKeys.length == 1 && Array.isArray(params[objectKeys[0]])) {
    //     const requestDataArray = [];
    //     for (let i = 0; i < params[objectKeys[0]].length; i++) {
    //         const dataArray = params[objectKeys[0]];
    //         const orderMessage = Object.keys(dataArray[i])
    //             .sort()
    //             .map(key => `${key}=${dataArray[i][key]}`)
    //             .join("&");
    //         const tradingKey = getTradingKeyPair(tradingSecret);
    //         const sign = signMessageByTradingKey(tradingKey.keyPair, orderMessage);
    //         const requestData = Object.assign(Object.assign({}, dataArray[i]), { signature: sign });
    //         requestDataArray.push(requestData);
    //     }
    //     const timestamp = new Date().getTime().toString();
    //     const messageStr = [
    //         timestamp,
    //         method.toUpperCase(),
    //         urlParam,
    //         JSON.stringify({ [objectKeys[0]]: requestDataArray }),
    //     ].join("");
    //     console.log(messageStr);
    //     const messageBytes = new TextEncoder().encode(messageStr);
    //     const keyPairSign =  getOrderlyKeyPair(orderlyKeyPrivate);
    //     const orderlySign = signPostRequestByOrderlyKey(keyPairSign, messageBytes);
    //     const headers = {
    //         "content-type": method.toUpperCase() === "POST" || method.toUpperCase() === "PUT"
    //             ? "application/json"
    //             : "application/x-www-form-urlencoded",
    //         "orderly-timestamp": timestamp,
    //         "orderly-account-id": accountId,
    //         "orderly-key": orderlyKey,
    //         "orderly-trading-key": tradingPublic,
    //         "orderly-signature": orderlySign,
    //     };
    //     return { headers, requestData: requestDataArray };
    // }
    // else {
    const orderMessage = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join("&");
    console.log(orderMessage);
    const tradingKey = getTradingKeyPair(tradingSecret);
    const sign = signMessageByTradingKey(tradingKey.keyPair, orderMessage);
    const requestData = Object.assign(Object.assign({}, params), { signature: sign });
    const timestamp = new Date().getTime().toString();
    const messageStr = [
        timestamp,
        // method.toUpperCase(),
        // includeQuery ? urlParam + "?" + new URLSearchParams(requestData).toString() : urlParam,
        // includeQuery ? "" : requestData && Object.keys(requestData).length ? JSON.stringify(requestData) : "",
    ].join("");
    console.log(messageStr);
    const messageBytes = new TextEncoder().encode(messageStr);
    const keyPairSign = getOrderlyKeyPair(orderlyKeyPrivate);
    const orderlySign = signPostRequestByOrderlyKey(keyPairSign, messageBytes);
    return {
        "orderly_key": orderlyKey,
        "sign": orderlySign,
        "timestamp": Number(timestamp)
    };
    // }
};
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

class OrderlyPrivateClient extends BasicPrivateClient_1.BasicPrivateClient {
    constructor({ wssPath = `wss://ws-private.orderly.org/v2/ws/private/stream/${KEYS.accountId}`, watcherMs, apiKey, apiSecret, apiPassword, sendThrottleMs = 20, testNet = false, } = {}) {
        if (testNet) {
            wssPath = `wss://testnet-ws-private.orderly.org/v2/ws/private/stream/${KEYS.accountId}`;
        }
        super(wssPath, "orderly", apiKey, apiSecret, apiPassword, undefined, watcherMs);
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
    _normalizeContent(requestBody) {
        // Normalize the order content
        const orderParams = Object.keys(requestBody)
            .filter((key) => requestBody[key] !== null) // Remove null fields
            .map((key) => {
            let value = requestBody[key];
            if (typeof value === "number") {
                // Remove trailing zeros for numeric values
                value = value.toString().replace(/(\.[0-9]*?)0+$/, "$1").replace(/\.$/, "");
            }
            return `${key}=${value}`;
        })
            .sort()
            .join("&");
        return orderParams;
    }
    _generateSignature(privateKey, message) {
        // Convert the privateKey and message to Buffer
        const privateKeyBuffer = Buffer.from(privateKey, "hex");
        const messageBuffer = Buffer.from(message);
        // Hash the message using keccak256
        const messageHash = ethUtil.keccak256(messageBuffer);
        console.log(privateKeyBuffer);
        console.log(privateKeyBuffer.length);
        // Generate the signature using the secp256k1 algorithm
        const signature = ethUtil.ecsign(messageHash, privateKeyBuffer);
        // Convert v, r, s to hex strings
        const rHex = ethUtil.bufferToHex(signature.r).slice(2); // Remove '0x'
        const sHex = ethUtil.bufferToHex(signature.s).slice(2); // Remove '0x'
        const v = signature.v < 27 ? signature.v + 27 : signature.v;
        const vHex = v.toString(16);
        // Pad R and S to 64 characters if needed
        const rPadded = rHex.padStart(64, "0");
        const sPadded = sHex.padStart(64, "0");
        // Concatenate r, s, and v
        const signatureHex = rPadded + sPadded + vHex;
        // Check the length
        if (signatureHex.length !== 130) {
            throw new Error("Invalid signature length");
        }
        return signatureHex;
        // // Hash the normalized content using SHA-256
        // const hash = crypto.createHash("sha256").update(normalizedContent).digest();
        // // Generate the signature using the elliptic library
        // const signature = ec.sign(hash, privateKey);
        // console.log(signature);
        // // Get the (R, S) values of the signature and the recovery id (V)
        // const { r, s, recoveryParam } = signature;
        // const rHex = r.toString("hex").padStart(64, "0");
        // const sHex = s.toString("hex").padStart(64, "0");
        // const vHex = recoveryParam.toString(16).padStart(2,"0");    
        // // Concatenate R, S, and V
        // const signatureHex = rHex + sHex +vHex;
        // return signatureHex;
    }
    _sendAuthentication() {
        console.log("_sendAuthetication");
        const params = generatePostHeadersAndRequestData({}, KEYS.orderlyKeyPrivate, KEYS.accountId, KEYS.publicKey, KEYS.tradingSecret, KEYS.tradingPublic);
        // const timestamp = 1649920583000;
        // // const requestBody = {
        // //     "symbol": "SPOT_NEAR_USDC",
        // //     "order_type": "LIMIT",
        // //     "order_price": 15.23,
        // //     "order_quantity": 23.11,
        // //     "side": "BUY",
        // //     "signature": ""
        // // };
        // const requestBody = {
        //     "symbol":"SPOT_NEAR_USDC",
        //     "order_type":"LIMIT",
        //     "order_price":15.23,
        //     "order_quantity":23.11,
        //     "side":"BUY",
        //     "signature":"fc3c41d988dd03a65a99354a7b1d311a43de6b7a7867bdbdaf228bb74a121f8e47bb15ff7f69eb19c96da222f651da53b5ab30fb7caf69a76f01ad9af06c154400"
        //   };
        // // const normalizedContent = this._normalizeContent(requestBody);
        // const normalizedContent = `${timestamp}POST/v1/order${JSON.stringify(requestBody)}`;
        // const signature = this._generateSignature(KEYS.orderlyKeyPrivate, normalizedContent);
        // console.log("normalized content " + normalizedContent);
        // console.log("signature " + signature);
        this._wss.send(JSON.stringify({
            id: "123r333",
            event: "auth",
            params: params
        }));
    }
    // protected _sendAuthentication() {
    //     console.log("_sendAuthentication");
    //     const timestamp = Date.now();
    //     // const requestMethod = "POST";
    //     // const requestPath = "/v1/order";
    //     const requestBody = {
    //         "symbol": "SPOT_NEAR_USDC",
    //         "order_type": "LIMIT",
    //         "order_price": 15.23,
    //         "order_quantity": 23.11,
    //         "side": "BUY",
    //         "signature": "fc3c41d988dd03a65a99354a7b1d311a43de6b7a7867bdbdaf228bb74a121f8e47bb15ff7f69eb19c96da222f651da53b5ab30fb7caf69a76f01ad9af06c154400"
    //     };
    //     const normalizedContent = `${timestamp}POST/v1/order${JSON.stringify(requestBody)}`;
    //     // Hash the normalized content using SHA-256
    //     const hash = crypto.createHash("sha256").update(normalizedContent).digest();
    //     const privateKey = Buffer.from(KEYS.tradingSecret, "hex");
    //     const signature = ec.sign(hash, privateKey);
    //     this._wss.send(
    //         JSON.stringify({
    //             id:"123r",
    //             event:"auth",           
    //             params:{
    //                 "orderly_key":KEYS.orderlyKeyPrivate,
    //                 "sign": signature,
    //                 "timestamp":timestamp
    //             },
    //     }));
    //       // const timestamp = "" + Date.now() / 1000;
    //     // const sign = base64Encode(
    //     //     hmacSign("sha256", this.apiSecret, timestamp + "GET" + "/users/self/verify"),
    //     // );
    //     // this._wss.send(
    //     //     JSON.stringify({
    //     //         op: "login",
    //     //         args: [
    //     //             {
    //     //                 apiKey: this.apiKey,
    //     //                 passphrase: this.apiPassword,
    //     //                 timestamp,
    //     //                 sign,
    //     //             },
    //     //         ],
    //     //     }),
    //     // );
    // }
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
    _sendPong() {
        if (this._wss) {
            this._wss.send(JSON.stringify({
                event: "pong",
            }));
        }
    }
    _processsMessage(msg) {
        console.log("_processsMessage", msg);
        // clear semaphore on subscription event reply
        if (!msg.event) {
            return;
        }
        switch (msg.event) {
            case "ping":
                this._sendPong();
                return;
            case "pong":
                return;
            // { id: '123r333', event: 'auth', success: true, ts: 1691126241419 }
            case "auth":
                this.emit("login", msg);
                super._onConnected();
                return;
            default:
                return;
        }
        // candles
        if (msg?.topic?.includes("@kline_")) {
            if (msg.data) {
                return;
            }
        }
        return;
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