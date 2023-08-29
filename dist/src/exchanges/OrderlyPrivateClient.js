"use strict";
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
    const orderMessage = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join("&");
    console.log(orderMessage);
    const tradingKey = getTradingKeyPair(tradingSecret);
    const sign = signMessageByTradingKey(tradingKey.keyPair, orderMessage);
    const requestData = Object.assign(Object.assign({}, params), { signature: sign });
    const timestamp = new Date().getTime().toString();
    const messageStr = [timestamp].join("");
    console.log(messageStr);
    const messageBytes = new TextEncoder().encode(messageStr);
    const keyPairSign = getOrderlyKeyPair(orderlyKeyPrivate);
    const orderlySign = signPostRequestByOrderlyKey(keyPairSign, messageBytes);
    return {
        orderly_key: orderlyKey,
        sign: orderlySign,
        timestamp: Number(timestamp),
    };
    // }
};
/**
 * Implements Orderly Network WebSocket API as defined in
 * https://docs-api.orderly.network/#introduction
 * https://docs-api.orderly.network/#websocket-api
 */
class OrderlyPrivateClient extends BasicPrivateClient_1.BasicPrivateClient {
    constructor({ credentials, sendThrottleMs = 20, testNet = false } = {}) {
        let wssPath = `wss://ws-private.orderly.org/v2/ws/private/stream/${credentials.accountId}`;
        if (testNet) {
            wssPath = `wss://testnet-ws-private.orderly.org/v2/ws/private/stream/${credentials.accountId}`;
        }
        super(wssPath, "orderly", "", "", "", undefined, 20);
        this.credentials = credentials;
        this.hasPrivateOrders = true;
        this._sendMessage = (0, Throttle_1.throttle)(this.__sendMessage.bind(this), sendThrottleMs);
    }
    /**
     * @see https://docs-api.orderly.network/#websocket-api-private-execution-report
     */
    _sendSubPrivateOrders() {
        this._wss.send(JSON.stringify({
            id: "clientID3",
            topic: "executionreport",
            event: "subscribe",
        }));
    }
    _sendUnsubPrivateOrders() {
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
    _sendAuthentication() {
        console.log("_sendAuthetication");
        const params = generatePostHeadersAndRequestData({}, this.credentials.orderlyKeyPrivate, this.credentials.accountId, this.credentials.publicKey, this.credentials.tradingSecret, this.credentials.tradingPublic);
        this._wss.send(JSON.stringify({
            id: "123r333",
            event: "auth",
            params: params,
        }));
    }
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
        if (!msg) {
            return;
        }
        if (msg?.event) {
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
        }
        // order update
        if (msg?.topic?.includes("executionreport")) {
            if (msg.data) {
                // https://docs-api.orderly.network/#restful-api-private-get-order
                const d = msg.data;
                let status = d.status;
                // map to our status
                if (status === "NEW") {
                    status = OrderStatus_1.OrderStatus.NEW;
                }
                else if (status === "PARTIAL_FILLED") {
                    status = OrderStatus_1.OrderStatus.PARTIALLY_FILLED;
                }
                else if (status === "FILLED") {
                    status = OrderStatus_1.OrderStatus.FILLED;
                }
                else if (status === "CANCELLED") {
                    status = OrderStatus_1.OrderStatus.CANCELED;
                }
                else if (status === "REJECTED") {
                    status = OrderStatus_1.OrderStatus.REJECTED;
                }
                else if (status === "EXPIRED") {
                    status = OrderStatus_1.OrderStatus.EXPIRED;
                }
                else {
                    console.log(`not going to update with status ${status}`);
                    return;
                }
                const event = null;
                const isSell = d.side.substring(0, 4).toLowerCase() == "sell";
                const amount = Math.abs(Number(d.quantity || 0));
                const amountFilled = Math.abs(Number(d.executedQuantity || 0));
                const price = Number(d.avgPrice || 0) || Number(d.price || 0);
                const change = {
                    exchange: this.name,
                    pair: d.symbol,
                    exchangeOrderId: d.orderId,
                    status: status,
                    event: event,
                    msg: status,
                    price: price,
                    amount: isSell ? -amount : amount,
                    amountFilled: isSell ? -amountFilled : amountFilled,
                    // Negative number represents the user transaction fee charged by the platform.
                    // Positive number represents rebate.
                    commissionAmount: -Number(d.fee || 0),
                    commissionCurrency: d.feeAsset, // feeAsset
                };
                this.emit("orders", change);
                return;
            }
        }
    }
}
exports.OrderlyPrivateClient = OrderlyPrivateClient;
//# sourceMappingURL=OrderlyPrivateClient.js.map