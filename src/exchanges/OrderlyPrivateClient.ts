/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-implied-eval */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BasicPrivateClient, PrivateChannelSubscription } from "../BasicPrivateClient";
import { CandlePeriod } from "../CandlePeriod";
import { CancelableFn } from "../flowcontrol/Fn";
import { throttle } from "../flowcontrol/Throttle";
import { Market } from "../Market";
import { PrivateClientOptions } from "../PrivateClientOptions";
import { base64Encode, hmacSign } from "../Jwt";
import { OrderStatus } from "../OrderStatus";
import { Order } from "../Order";
import { OrderEvent } from "../OrderEvent";
import { InvestmentType, ExchangeId } from "../types";
import { eddsa } from "ccxt/js/src/base/functions";
import * as nacl from "tweetnacl";
import * as elliptic from "elliptic";
import * as crypto from "crypto";
import * as ethUtil from "ethereumjs-util";
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

export const generateGetHeaders = (method: string, urlParam: string, params: Record<string, any>, orderlyKeyPrivate: string, accountId: string, orderlyKey: string, includeQuery = false): Promise<any> => {
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

const generatePostHeadersAndRequestData = (params, orderlyKeyPrivate, accountId, orderlyKey, tradingSecret, tradingPublic, includeQuery = false) =>  {
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
        const messageStr = [
            timestamp,
        ].join("");
        console.log(messageStr);
        const messageBytes = new TextEncoder().encode(messageStr);
        const keyPairSign =  getOrderlyKeyPair(orderlyKeyPrivate);
        const orderlySign = signPostRequestByOrderlyKey(keyPairSign, messageBytes);
        return {
            "orderly_key": orderlyKey,
            "sign": orderlySign,
            "timestamp": Number(timestamp)
        };
    // }
};


export type OrderlyClientOptions = PrivateClientOptions & {
    sendThrottleMs?: number;
    testNet?: boolean;
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

export class OrderlyPrivateClient extends BasicPrivateClient {
    public candlePeriod: CandlePeriod;

    protected _sendMessage: CancelableFn;
    protected _pingInterval: NodeJS.Timeout;

    constructor({
        wssPath = `wss://ws-private.orderly.org/v2/ws/private/stream/${KEYS.accountId}`,
        watcherMs,
        apiKey,
        apiSecret,
        apiPassword,
        sendThrottleMs = 20,
        testNet = false,
    }: OrderlyClientOptions = {}) {
        if (testNet) {
            wssPath = `wss://testnet-ws-private.orderly.org/v2/ws/private/stream/${KEYS.accountId}`;
        }
        super(wssPath, "orderly" as ExchangeId, apiKey, apiSecret, apiPassword, undefined, watcherMs);
        this.hasPrivateOrders = true;
        this._sendMessage = throttle(this.__sendMessage.bind(this), sendThrottleMs);
    }

    /**
     *
     * @param subscriptionId
     * @param channel
     * @see https://www.okx.com/docs-v5/en/#websocket-api-private-channel-order-channel
     */
    protected _sendSubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription) {
        this._wss.send(
            JSON.stringify({
                id: "clientID3",
                topic: "executionreport",
                event: "subscribe",
            }),
        );
    }
    protected _sendUnsubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription) {
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
        const params = generatePostHeadersAndRequestData({}, KEYS.orderlyKeyPrivate, KEYS.accountId, KEYS.publicKey, KEYS.tradingSecret, KEYS.tradingPublic);
    
        this._wss.send(
            JSON.stringify({
                id: "123r333",
                event: "auth",
                params: params
            })
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
//             _processsMessage {
//   topic: 'executionreport',
//   ts: 1691126463207,
//   data: {
//     symbol: 'SPOT_NEAR_USDC',
//     clientOrderId: '',
//     orderId: 382138349,
//     type: 'LIMIT',
//     side: 'SELL',
//     quantity: 16.21,
//     price: 2,
//     tradeId: 0,
//     executedPrice: 0,
//     executedQuantity: 0,
//     fee: 0,
//     feeAsset: 'USDC',
//     totalExecutedQuantity: 0,
//     avgPrice: 0,
//     status: 'NEW', //     "status": "FILLED", // NEW / FILLED / PARTIAL_FILLED / CANCELLED
//     reason: '',
//     totalFee: 0,
//     visible: 16.21,
//     timestamp: 1691126463207,
//     brokerId: 'woofi_dex',
//     brokerName: 'WOOFi DEX',
//     maker: false
//   }
// }            
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
                const amount = Math.abs(Number(d.sz || 0));
                const amountFilled = Math.abs(Number(d.accFillSz || 0));
                const price = Number(d.avgPx || 0) || Number(d.px || 0);
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
