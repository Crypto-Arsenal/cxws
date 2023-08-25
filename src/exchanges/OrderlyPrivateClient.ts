/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-implied-eval */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BasicPrivateClient } from "../BasicPrivateClient";
import { CandlePeriod } from "../CandlePeriod";
import { CancelableFn } from "../flowcontrol/Fn";
import { throttle } from "../flowcontrol/Throttle";
import { Market } from "../Market";
import { PrivateClientOptions } from "../PrivateClientOptions";
import { OrderStatus } from "../OrderStatus";
import { Order } from "../Order";
import { ExchangeId } from "../types";
import { ec as EC } from "elliptic";
import keccak256 from "keccak256";
import { KeyPair } from "near-api-js";

export function getTradingKeyPair(tradingKeyPrivateKey: string) {
    const ec = new EC("secp256k1");
    const keyPair = ec.keyFromPrivate(tradingKeyPrivateKey);
    return {
        privateKey: keyPair.getPrivate().toString("hex"),
        publicKey: keyPair.getPublic().encode("hex"),
        keyPair,
    };
}

export function getOrderlyKeyPair(orderlyKeyPrivateKey: string) {
    console.log("private key", orderlyKeyPrivateKey);
    return KeyPair.fromString(orderlyKeyPrivateKey);
}

function handleZero(str: string) {
    if (str.length < 64) {
        const zeroArr = new Array(64 - str.length).fill(0);
        return zeroArr.join("") + str;
    }
    return str;
}

export function signMessageByTradingKey(keyPair: EC.KeyPair, params: any) {
    const ec = new EC("secp256k1");
    const msgHash = keccak256(params);
    const privateKey = keyPair.getPrivate("hex");
    const signature = ec.sign(msgHash, privateKey, "hex", { canonical: true });
    const r = signature.r.toJSON();
    const s = signature.s.toJSON();
    const hexSignature = `${handleZero(r)}${handleZero(s)}0${signature.recoveryParam}`;
    return hexSignature;
}

export function signPostRequestByOrderlyKey(keyPair: KeyPair, messageString: Uint8Array) {
    const u8 = Buffer.from(messageString);
    const signStr = keyPair.sign(u8);
    return Buffer.from(signStr.signature).toString("base64");
}

export const generateGetHeaders = (
    method: string,
    urlParam: string,
    params: Record<string, any>,
    orderlyKeyPrivate: string,
    accountId: string,
    orderlyKey: string,
    includeQuery = false,
): Promise<any> => {
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

const generatePostHeadersAndRequestData = (
    params,
    orderlyKeyPrivate,
    accountId,
    orderlyKey,
    tradingSecret,
    tradingPublic,
    includeQuery = false,
) => {
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

export type OrderlyClientOptions = PrivateClientOptions & {
    sendThrottleMs?: number;
    testNet?: boolean;
};

/**
 * Implements Orderly Network WebSocket API as defined in
 * https://docs-api.orderly.network/#introduction
 * https://docs-api.orderly.network/#websocket-api
 */

export class OrderlyPrivateClient extends BasicPrivateClient {
    public candlePeriod: CandlePeriod;

    protected _sendMessage: CancelableFn;
    protected _pingInterval: NodeJS.Timeout;
    credentials: any;

    constructor({ credentials, sendThrottleMs = 20, testNet = false }: any = {}) {
        let wssPath = `wss://ws-private.orderly.org/v2/ws/private/stream/${credentials.accountId}`;
        if (testNet) {
            wssPath = `wss://testnet-ws-private.orderly.org/v2/ws/private/stream/${credentials.accountId}`;
        }
        super(wssPath, "orderly" as ExchangeId, "", "", "", undefined, 20);
        this.credentials = credentials;
        this.hasPrivateOrders = true;
        this._sendMessage = throttle(this.__sendMessage.bind(this), sendThrottleMs);
    }

    /**
     * @see https://docs-api.orderly.network/#websocket-api-private-execution-report
     */
    protected _sendSubPrivateOrders() {
        this._wss.send(
            JSON.stringify({
                id: "clientID3",
                topic: "executionreport",
                event: "subscribe",
            }),
        );
    }
    protected _sendUnsubPrivateOrders() {
        throw new Error("Method not implemented.");
    }

    protected _beforeClose() {
        this._sendMessage.cancel();
    }

    protected _beforeConnect() {
        this._wss.on("connected", this._startPing.bind(this));
        this._wss.on("disconnected", this._stopPing.bind(this));
        this._wss.on("closed", this._stopPing.bind(this));
    }

    protected _onConnected() {
        this._sendAuthentication();
    }

    protected _sendAuthentication() {
        console.log("_sendAuthetication");
        const params = generatePostHeadersAndRequestData(
            {},
            this.credentials.orderlyKeyPrivate,
            this.credentials.accountId,
            this.credentials.publicKey,
            this.credentials.tradingSecret,
            this.credentials.tradingPublic,
        );

        this._wss.send(
            JSON.stringify({
                id: "123r333",
                event: "auth",
                params: params,
            }),
        );
    }

    protected _startPing() {
        clearInterval(this._pingInterval);
        this._pingInterval = setInterval(this._sendPing.bind(this), 8 * 1000);
    }

    protected _stopPing() {
        clearInterval(this._pingInterval);
    }

    protected _sendPing() {
        if (this._wss) {
            this._wss.send(
                JSON.stringify({
                    event: "ping",
                }),
            );
        }
    }

    /**
     * Constructs a market argument in a backwards compatible manner where
     * the default is a spot market.
     */
    protected _marketArg(method: string, market: Market) {
        const type = (market.type || "spot").toLowerCase();
        return `${type.toLowerCase()}/${method}:${market.id}`;
    }

    protected __sendMessage(msg) {
        this._wss.send(msg);
    }

    protected _onMessage(raw) {
        console.log("_onMessage", raw);

        // process JSON message
        try {
            if (raw == "pong") {
                return;
            }

            const msg = JSON.parse(raw);
            this._processsMessage(msg);
        } catch (ex) {
            this.emit("error", ex);
        }
    }

    protected _sendPong() {
        if (this._wss) {
            this._wss.send(
                JSON.stringify({
                    event: "pong",
                }),
            );
        }
    }

    protected _processsMessage(msg: any) {
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

        // order update
        if (msg?.topic?.includes("executionreport")) {
            if (msg.data) {
                // https://docs-api.orderly.network/#restful-api-private-get-order
                const d = msg.data;
                let status = d.status;
                // map to our status
                if (status === "NEW") {
                    status = OrderStatus.NEW;
                } else if (status === "PARTIAL_FILLED") {
                    status = OrderStatus.PARTIALLY_FILLED;
                } else if (status === "FILLED") {
                    status = OrderStatus.FILLED;
                } else if (status === "CANCELLED") {
                    status = OrderStatus.CANCELED;
                } else if (status === "REJECTED") {
                    status = OrderStatus.REJECTED;
                } else if (status === "EXPIRED") {
                    status = OrderStatus.EXPIRED;
                } else {
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
                    exchangeOrderId: d.orderId, // orderId
                    status: status,
                    event: event,
                    msg: status,
                    price: price,
                    amount: isSell ? -amount : amount, // quantity
                    amountFilled: isSell ? -amountFilled : amountFilled, // executedQuantity
                    // Negative number represents the user transaction fee charged by the platform.
                    // Positive number represents rebate.
                    commissionAmount: -Number(d.fee || 0), // fee
                    commissionCurrency: d.feeAsset, // feeAsset
                } as Order;

                this.emit("orders", change);
                return;
            }
        }
    }
}
