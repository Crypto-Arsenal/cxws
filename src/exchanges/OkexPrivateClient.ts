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

const pongBuffer = Buffer.from("pong");

export type OkexClientOptions = PrivateClientOptions & {
    sendThrottleMs?: number;
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
export class OkexPrivateClient extends BasicPrivateClient {
    public candlePeriod: CandlePeriod;

    protected _sendMessage: CancelableFn;
    protected _pingInterval: NodeJS.Timeout;

    constructor({
        wssPath = "wss://ws.okx.com:8443/ws/v5/private",
        watcherMs,
        apiKey,
        apiSecret,
        apiPassword,
        sendThrottleMs = 20,
    }: OkexClientOptions = {}) {
        super(wssPath, "OKEx", undefined, watcherMs);
        this.hasPrivateOrders = true;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.apiPassword = apiPassword;
        this._sendMessage = throttle(this.__sendMessage.bind(this), sendThrottleMs);
    }

    protected _sendSubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription) {
        this._wss.send(
            JSON.stringify({
                op: "subscribe",
                args: [
                    {
                        channel: "orders",
                        instType: "SPOT",
                    },
                ],
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
        const timestamp = "" + Date.now() / 1000;
        const sign = base64Encode(
            hmacSign("sha256", this.apiSecret, timestamp + "GET" + "/users/self/verify"),
        );

        this._wss.send(
            JSON.stringify({
                op: "login",
                args: [
                    {
                        apiKey: this.apiKey,
                        passphrase: this.apiPassword,
                        timestamp,
                        sign,
                    },
                ],
            }),
        );
    }

    protected _startPing() {
        clearInterval(this._pingInterval);
        this._pingInterval = setInterval(this._sendPing.bind(this), 15000);
    }

    protected _stopPing() {
        clearInterval(this._pingInterval);
    }

    protected _sendPing() {
        if (this._wss) {
            this._wss.send("ping");
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

    protected _processsMessage(msg: any) {
        console.log("msg", msg);
        if (msg.event === "error") {
            this.emit("error", msg);
            return;
        }

        if (msg.event === "login") {
            this.emit("login", msg);
            super._onConnected();
            return;
        }
        // clear semaphore on subscription event reply
        if (msg.event === "subscribe") {
            return;
        }

        // ignore unsubscribe
        if (msg.event === "unsubscribe") {
            return;
        }

        // prevent failed messages from
        if (!msg.data) {
            // eslint-disable-next-line no-console
            console.warn("warn: failure response", JSON.stringify(msg));
            return;
        }

        /**
         * https://www.okx.com/docs-v5/en/#websocket-api-private-channel-order-channel
         * msg {
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
    }
}
