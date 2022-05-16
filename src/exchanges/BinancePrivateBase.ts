/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/**
 * Binance now (as of Nov 2019) has the ability to perform live subscribes using
 * a single socket. With this functionality, there is no longer a need to
 * use the URL-mutation code and we can use a BasicClient and allow subscribing
 * and unsubscribing.
 *
 * Binance allows subscribing to many streams at the same time, however there is
 * a max payload length that cannot be exceeded. This requires the use of a
 * subscription batching method.
 *
 * Binance limits the number of messages that can be sent as well so throttling
 * of batched sends must be performed.
 *
 * _sendSubTrades calls _batchSub
 * _batchSub uses the `batch` flow control helper to batch all calls on the
 *    same tick into a single call
 * _batchSub calls _sendMessage
 * _sendMessage uses the `throttle` flow controler helper to limit calls to
 *    1 per second
 *
 */

import { BasicClient } from "../BasicClient";
import { Candle } from "../Candle";
import { CandlePeriod } from "../CandlePeriod";
import { batch } from "../flowcontrol/Batch";
import { CancelableFn } from "../flowcontrol/Fn";
import { throttle } from "../flowcontrol/Throttle";
import { Level2Point } from "../Level2Point";
import { Level2Snapshot } from "../Level2Snapshots";
import { Ticker } from "../Ticker";
import { Trade } from "../Trade";
import { Market } from "../Market";
import { Level2Update } from "../Level2Update";
import * as https from "../Https";
import ccxt, { ExchangeId } from "ccxt";
import { PrivateClientOptions } from "../PrivateClientOptions";
import { BasicPrivateClient, PrivateChannelSubscription } from "../BasicPrivateClient";
import { OrderStatus } from "../OrderStatus";
import { Order } from "../Order";

export type BinancePrivateClientOptions = PrivateClientOptions & {
    name?: ccxt.ExchangeId;
    wssPath?: string;
    restL2SnapshotPath?: string;
    watcherMs?: number;
    useAggTrades?: boolean;
    requestSnapshot?: boolean;
    socketBatchSize?: number;
    socketThrottleMs?: number;
    restThrottleMs?: number;
    l2updateSpeed?: string;
    l2snapshotSpeed?: string;
    testNet?: boolean;
    batchTickers?: boolean;
};

export class BinancePrivateBase extends BasicPrivateClient {
    public dynamicWssPath: string;

    public useAggTrades: boolean;
    public l2updateSpeed: string;
    public l2snapshotSpeed: string;
    public requestSnapshot: boolean;
    public candlePeriod: CandlePeriod;
    public batchTickers: boolean;

    protected _messageId: number;
    protected _restL2SnapshotPath: string;
    protected _tickersActive: boolean;
    protected _batchSub: CancelableFn;
    protected _batchUnsub: CancelableFn;
    protected _sendMessage: CancelableFn;
    protected _requestLevel2Snapshot: CancelableFn;

    constructor({
        name = "binance",
        wssPath,
        restL2SnapshotPath,
        watcherMs = 30000,
        useAggTrades = true,
        requestSnapshot = true,
        socketBatchSize = 200,
        socketThrottleMs = 1000,
        restThrottleMs = 1000,
        l2updateSpeed = "",
        l2snapshotSpeed = "",
        batchTickers = true,
        apiKey = "",
        apiSecret = "",
    }: BinancePrivateClientOptions = {}) {
        super(wssPath, name, apiKey, apiSecret, "", undefined, watcherMs);

        this._restL2SnapshotPath = restL2SnapshotPath;

        this.useAggTrades = useAggTrades;
        this.l2updateSpeed = l2updateSpeed;
        this.l2snapshotSpeed = l2snapshotSpeed;
        this.requestSnapshot = requestSnapshot;
        this.batchTickers = batchTickers;
        this.dynamicWssPath = wssPath;

        this._messageId = 0;
        this._tickersActive = false;
        this.candlePeriod = CandlePeriod._1m;

        this._batchSub = batch(this.__batchSub.bind(this), socketBatchSize);
        this._batchUnsub = batch(this.__batchUnsub.bind(this), socketBatchSize);

        this._sendMessage = throttle(this.__sendMessage.bind(this), socketThrottleMs);
        this._requestLevel2Snapshot = throttle(
            this.__requestLevel2Snapshot.bind(this),
            restThrottleMs,
        );

        this.hasPrivateOrders = true;

        // spot ccxt
        this.ccxt = new ccxt.binance({
            apiKey,
            secret: apiSecret,
            verbose: true,
        });

        try {
            this.ccxt.checkRequiredCredentials();
        } catch (err) {
            this.emit("error", err);
        }
    }

    protected _sendUnsubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription) {
        throw new Error("Method not implemented.");
    }

    protected getWssPath() {
        return this.dynamicWssPath;
    }

    /**
     * Set webscoket token from REST api before subscribing to private feeds
     * https://binance-docs.github.io/apidocs/spot/en/#user-data-streams
     * TODO: SEE HOW KUOCOIN DOES IT!!!
     */
    protected _connect(): void {
        this.ccxt
            .publicPostUserDataStream()
            .then(d => {
                if (d.listenKey) {
                    this.apiToken = d.listenKey;
                    this.dynamicWssPath = `${this.wssPath}?streams=${this.apiToken}`;
                    setTimeout(function userDataKeepAlive() {
                        // keepalive
                        try {
                            this.ccxt
                                .sapiPutUserDataStream({ listenKey: this.apiToken })
                                .then(d => setTimeout(userDataKeepAlive, 60 * 30 * 1000))
                                .catch(err => setTimeout(userDataKeepAlive, 60000));
                        } catch (error) {
                            setTimeout(userDataKeepAlive, 60000); // retry in 1 minute
                        }
                    }, 60 * 30 * 1000); // 30 minute keepalive
                }
                super._connect();
            })
            .catch(err => {
                this.emit("error", err);
            });
    }

    protected _sendSubPrivateOrders() {
        console.log("_sendSubPrivateOrders");

        // this._wss.send(
        //     JSON.stringify({
        //         method: "SUBSCRIBE",
        //         params: ["!ticker@arr"],
        //         id: new Date().getTime(),
        //     }),
        // );
    }

    //////////////////////////////////////////////

    protected _onClosing() {
        this._tickersActive = false;
        this._batchSub.cancel();
        this._batchUnsub.cancel();
        this._sendMessage.cancel();
        this._requestLevel2Snapshot.cancel();
        super._onClosing();
    }

    protected _sendSubTicker(remote_id: string) {
        if (this.batchTickers) {
            if (this._tickersActive) return;
            this._tickersActive = true;
            this._wss.send(
                JSON.stringify({
                    method: "SUBSCRIBE",
                    params: ["!ticker@arr"],
                    id: ++this._messageId,
                }),
            );
        } else {
            this._wss.send(
                JSON.stringify({
                    method: "SUBSCRIBE",
                    params: [`${remote_id.toLowerCase()}@ticker`],
                    id: ++this._messageId,
                }),
            );
        }
    }

    protected __batchSub(args: any[]) {
        const params = args.map(p => p[0]);
        const id = ++this._messageId;
        const msg = JSON.stringify({
            method: "SUBSCRIBE",
            params,
            id,
        });
        this._sendMessage(msg);
    }

    protected __batchUnsub(args) {
        const params = args.map(p => p[0]);
        const id = ++this._messageId;
        const msg = JSON.stringify({
            method: "UNSUBSCRIBE",
            params,
            id,
        });
        this._sendMessage(msg);
    }

    protected __sendMessage(msg) {
        this._wss.send(msg);
    }

    protected _sendSubTrades(remote_id: string) {
        const stream = remote_id.toLowerCase() + (this.useAggTrades ? "@aggTrade" : "@trade");
        this._batchSub(stream);
    }

    protected _sendUnsubTrades(remote_id: string) {
        const stream = remote_id.toLowerCase() + (this.useAggTrades ? "@aggTrade" : "@trade");
        this._batchUnsub(stream);
    }

    protected _sendSubCandles(remote_id: string) {
        const stream = remote_id.toLowerCase() + "@kline_" + candlePeriod(this.candlePeriod);
        this._batchSub(stream);
    }

    protected _sendUnsubCandles(remote_id: string) {
        const stream = remote_id.toLowerCase() + "@kline_" + candlePeriod(this.candlePeriod);
        this._batchUnsub(stream);
    }

    protected _sendSubLevel2Snapshots(remote_id: string) {
        const stream =
            remote_id.toLowerCase() +
            "@depth20" +
            (this.l2snapshotSpeed ? `@${this.l2snapshotSpeed}` : "");
        this._batchSub(stream);
    }

    protected _sendUnsubLevel2Snapshots(remote_id: string) {
        const stream =
            remote_id.toLowerCase() +
            "@depth20" +
            (this.l2snapshotSpeed ? `@${this.l2snapshotSpeed}` : "");
        this._batchUnsub(stream);
    }

    protected _sendUnsubLevel2Updates(remote_id: string) {
        const stream =
            remote_id.toLowerCase() +
            "@depth" +
            (this.l2updateSpeed ? `@${this.l2updateSpeed}` : "");
        this._batchUnsub(stream);
    }

    protected _sendSubLevel3Snapshots() {
        throw new Error("Method not implemented.");
    }

    protected _sendUnsubLevel3Snapshots() {
        throw new Error("Method not implemented.");
    }

    protected _sendSubLevel3Updates() {
        throw new Error("Method not implemented.");
    }

    protected _sendUnsubLevel3Updates() {
        throw new Error("Method not implemented.");
    }

    protected _onMessage(raw: string) {
        console.log('_onMessage', raw);

        const msg = JSON.parse(raw);
        // subscribe/unsubscribe responses
        if (msg.result === null && msg.id) {
            // console.log(msg);
            return;
        }

        // errors
        if (msg.error) {
            const error = new Error(msg.error.msg) as any;
            error.msg = msg;
            this.emit("error", error);
        }

        // All code past this point relies on msg.stream in some manner. This code
        // acts as a guard on msg.stream and aborts prematurely if the property is
        // not available.
        if (!msg.stream) {
            return;
        }

        if (msg.data.e === "executionReport") {
            /**
             * https://binance-docs.github.io/apidocs/spot/en/#payload-order-update
             * @example
{
    "e": "executionReport",        // Event type
    "E": 1499405658658,            // Event time
    "s": "ETHBTC",                 // Symbol
    "c": "mUvoqJxFIILMdfAW5iGSOW", // Client order ID
    "S": "BUY",                    // Side
    "o": "LIMIT",                  // Order type
    "f": "GTC",                    // Time in force
    "q": "1.00000000",             // Order quantity
    "p": "0.10264410",             // Order price
    "P": "0.00000000",             // Stop price
    "d": 4,                        // Trailing Delta; This is only visible if the order was a trailing stop order.
    "F": "0.00000000",             // Iceberg quantity
    "g": -1,                       // OrderListId
    "C": "",                       // Original client order ID; This is the ID of the order being canceled
    "x": "NEW",                    // Current execution type
    "X": "NEW",                    // Current order status
    "r": "NONE",                   // Order reject reason; will be an error code.
    "i": 4293153,                  // Order ID
    "l": "0.00000000",             // Last executed quantity
    "z": "0.00000000",             // Cumulative filled quantity
    "L": "0.00000000",             // Last executed price
    "n": "0",                      // Commission amount
    "N": null,                     // Commission asset
    "T": 1499405658657,            // Transaction time
    "t": -1,                       // Trade ID
    "I": 8641984,                  // Ignore
    "w": true,                     // Is the order on the book?
    "m": false,                    // Is this trade the maker side?
    "M": false,                    // Ignore
    "O": 1499405658657,            // Order creation time
    "Z": "0.00000000",             // Cumulative quote asset transacted quantity
    "Y": "0.00000000",             // Last quote asset transacted quantity (i.e. lastPrice * lastQty)
    "Q": "0.00000000"              // Quote Order Qty
}
             */
            let {
                x: executionType,
                s: symbol,
                q: amount,
                z: amountFilled,
                S: side,
                p: orderPrice,
                i: orderId,
                X: status,
                L: lastExecutedPrice,
                n: commissionAmount,
                N: commissionCurrency,
            } = msg.data;

            // map to our status
            if (status === "NEW") {
                status = OrderStatus.NEW;
            } else if (status === "PARTIALLY_FILLED") {
                status = OrderStatus.PARTIALLY_FILLED;
            } else if (status === "FILLED") {
                status = OrderStatus.FILLED;
            } else if (status === "CANCELED" || status === "EXPIRED") {
                status = OrderStatus.CANCELED;
            } else {
                // SKIP REJECTED and PENDING_CANCEL
                console.log(`not going to update with status ${status}`);
                return;
            }

            const isSell = side.toUpperCase() == "SELL";
            amount = Math.abs(Number(amount || 0));
            amountFilled = Math.abs(Number(amountFilled || 0));
            const price = Number(lastExecutedPrice || 0) || Number(orderPrice || 0);
            const change = {
                exchange: this.name,
                pair: symbol,
                exchangeOrderId: orderId,
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

    protected _constructTicker(msg, market: Market) {
        const {
            E: timestamp,
            c: last,
            v: volume,
            q: quoteVolume,
            h: high,
            l: low,
            p: change,
            P: changePercent,
            a: ask,
            A: askVolume,
            b: bid,
            B: bidVolume,
        } = msg;
        const open = parseFloat(last) + parseFloat(change);
        return new Ticker({
            exchange: this.name,
            base: market.base,
            quote: market.quote,
            timestamp: timestamp,
            last,
            open: open.toFixed(8),
            high,
            low,
            volume,
            quoteVolume,
            change,
            changePercent,
            bid,
            bidVolume,
            ask,
            askVolume,
        });
    }

    protected _constructAggTrade({ data }, market: Market) {
        const { a: trade_id, p: price, q: size, T: time, m: buyer } = data;
        const unix = time;
        const amount = size;
        const side = buyer ? "buy" : "sell";
        return new Trade({
            exchange: this.name,
            base: market.base,
            quote: market.quote,
            tradeId: trade_id.toFixed(),
            unix,
            side,
            price,
            amount,
        });
    }

    protected _constructRawTrade({ data }, market: Market) {
        const {
            t: trade_id,
            p: price,
            q: size,
            b: buyOrderId,
            a: sellOrderId,
            T: time,
            m: buyer,
        } = data;
        const unix = time;
        const amount = size;
        const side = buyer ? "buy" : "sell";
        return new Trade({
            exchange: this.name,
            base: market.base,
            quote: market.quote,
            tradeId: trade_id,
            unix,
            side,
            price,
            amount,
            buyOrderId,
            sellOrderId,
        });
    }

    /**
   * Kline data looks like:
   { stream: 'btcusdt@kline_1m',
    data:
    { e: 'kline',
      E: 1571068845689,
      s:  'BTCUSDT',
      k:
        { t: 1571068800000,
          T: 1571068859999,
          s: 'BTCUSDT',
          i: '1m',
          f: 189927800,
          L: 189928107,
          o: '8254.05000000',
          c: '8253.61000000',
          h: '8256.58000000',
          l: '8250.93000000',
          v: '19.10571600',
          n: 308,
          x: false,
          q: '157694.32610840',
          V: '8.19456200',
          Q: '67640.56793106',
          B: '0' } } }
   */
    protected _constructCandle({ data }) {
        const k = data.k;
        return new Candle(k.t, k.o, k.h, k.l, k.c, k.v);
    }

    protected _constructLevel2Snapshot(msg, market: Market) {
        const sequenceId = msg.data.lastUpdateId;
        const asks = msg.data.asks.map(p => new Level2Point(p[0], p[1]));
        const bids = msg.data.bids.map(p => new Level2Point(p[0], p[1]));
        return new Level2Snapshot({
            exchange: this.name,
            base: market.base,
            quote: market.quote,
            sequenceId,
            asks,
            bids,
        });
    }

    /**
   {
      "e": "depthUpdate", // Event type
      "E": 123456789,     // Event time
      "s": "BNBBTC",      // Symbol
      "U": 157,           // First update ID in event
      "u": 160,           // Final update ID in event
      "b": [              // Bids to be updated
        [
          "0.0024",       // Price level to be updated
          "10"            // Quantity
        ]
      ],
      "a": [              // Asks to be updated
        [
          "0.0026",       // Price level to be updated
          "100"           // Quantity
        ]
      ]
    }
   */
    protected _constructLevel2Update(msg, market) {
        const eventMs = msg.data.E;
        const sequenceId = msg.data.U;
        const lastSequenceId = msg.data.u;
        const asks = msg.data.a.map(p => new Level2Point(p[0], p[1]));
        const bids = msg.data.b.map(p => new Level2Point(p[0], p[1]));
        return new Level2Update({
            exchange: this.name,
            base: market.base,
            quote: market.quote,
            sequenceId,
            lastSequenceId,
            eventMs,
            asks,
            bids,
        });
    }

    protected async __requestLevel2Snapshot(market) {
        let failed = false;
        try {
            const remote_id = market.id;
            const uri = `${this._restL2SnapshotPath}?limit=1000&symbol=${remote_id}`;
            const raw = (await https.get(uri)) as any;
            const sequenceId = raw.lastUpdateId;
            const timestampMs = raw.E;
            const asks = raw.asks.map(p => new Level2Point(p[0], p[1]));
            const bids = raw.bids.map(p => new Level2Point(p[0], p[1]));
            const snapshot = new Level2Snapshot({
                exchange: this.name,
                base: market.base,
                quote: market.quote,
                sequenceId,
                timestampMs,
                asks,
                bids,
            });
            this.emit("l2snapshot", snapshot, market);
        } catch (ex) {
            this.emit("error", ex);
            failed = true;
        } finally {
            if (failed) this._requestLevel2Snapshot(market);
        }
    }
}

export function candlePeriod(p) {
    switch (p) {
        case CandlePeriod._1m:
            return "1m";
        case CandlePeriod._3m:
            return "3m";
        case CandlePeriod._5m:
            return "5m";
        case CandlePeriod._15m:
            return "15m";
        case CandlePeriod._30m:
            return "30m";
        case CandlePeriod._1h:
            return "1h";
        case CandlePeriod._2h:
            return "2h";
        case CandlePeriod._4h:
            return "4h";
        case CandlePeriod._6h:
            return "6h";
        case CandlePeriod._8h:
            return "8h";
        case CandlePeriod._12h:
            return "12h";
        case CandlePeriod._1d:
            return "1d";
        case CandlePeriod._3d:
            return "3d";
        case CandlePeriod._1w:
            return "1w";
        case CandlePeriod._1M:
            return "1M";
    }
}
