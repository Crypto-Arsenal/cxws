"use strict";
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
exports.candlePeriod = exports.BinancePrivateBase = void 0;
const Candle_1 = require("../Candle");
const CandlePeriod_1 = require("../CandlePeriod");
const Batch_1 = require("../flowcontrol/Batch");
const Throttle_1 = require("../flowcontrol/Throttle");
const Level2Point_1 = require("../Level2Point");
const Level2Snapshots_1 = require("../Level2Snapshots");
const Ticker_1 = require("../Ticker");
const Trade_1 = require("../Trade");
const Level2Update_1 = require("../Level2Update");
const https = __importStar(require("../Https"));
const ccxt_1 = __importDefault(require("ccxt"));
const BasicPrivateClient_1 = require("../BasicPrivateClient");
const OrderStatus_1 = require("../OrderStatus");
const OrderEvent_1 = require("../OrderEvent");
const JSONbig = require('json-bigint');
class BinancePrivateBase extends BasicPrivateClient_1.BasicPrivateClient {
    constructor({ name = "binance", wssPath, restL2SnapshotPath, watcherMs = 30000, useAggTrades = true, requestSnapshot = true, socketBatchSize = 200, socketThrottleMs = 1000, restThrottleMs = 1000, l2updateSpeed = "", l2snapshotSpeed = "", batchTickers = true, apiKey = "", apiSecret = "", } = {}) {
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
        this.candlePeriod = CandlePeriod_1.CandlePeriod._1m;
        this._batchSub = (0, Batch_1.batch)(this.__batchSub.bind(this), socketBatchSize);
        this._batchUnsub = (0, Batch_1.batch)(this.__batchUnsub.bind(this), socketBatchSize);
        this._sendMessage = (0, Throttle_1.throttle)(this.__sendMessage.bind(this), socketThrottleMs);
        this._requestLevel2Snapshot = (0, Throttle_1.throttle)(this.__requestLevel2Snapshot.bind(this), restThrottleMs);
        this.hasPrivateOrders = true;
        // spot ccxt
        this.ccxt = new ccxt_1.default.binance({
            apiKey,
            secret: apiSecret,
            verbose: true,
        });
        try {
            this.ccxt.checkRequiredCredentials();
        }
        catch (err) {
            this.emit("error", err);
        }
    }
    _sendUnsubPrivateOrders(subscriptionId, channel) {
        throw new Error("Method not implemented.");
    }
    getWssPath() {
        return this.dynamicWssPath;
    }
    _sendSubPrivateOrders() {
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
    _onClosing() {
        this._tickersActive = false;
        this._batchSub.cancel();
        this._batchUnsub.cancel();
        this._sendMessage.cancel();
        this._requestLevel2Snapshot.cancel();
        super._onClosing();
    }
    _sendSubTicker(remote_id) {
        if (this.batchTickers) {
            if (this._tickersActive)
                return;
            this._tickersActive = true;
            this._wss.send(JSON.stringify({
                method: "SUBSCRIBE",
                params: ["!ticker@arr"],
                id: ++this._messageId,
            }));
        }
        else {
            this._wss.send(JSON.stringify({
                method: "SUBSCRIBE",
                params: [`${remote_id.toLowerCase()}@ticker`],
                id: ++this._messageId,
            }));
        }
    }
    __batchSub(args) {
        const params = args.map(p => p[0]);
        const id = ++this._messageId;
        const msg = JSON.stringify({
            method: "SUBSCRIBE",
            params,
            id,
        });
        this._sendMessage(msg);
    }
    __batchUnsub(args) {
        const params = args.map(p => p[0]);
        const id = ++this._messageId;
        const msg = JSON.stringify({
            method: "UNSUBSCRIBE",
            params,
            id,
        });
        this._sendMessage(msg);
    }
    __sendMessage(msg) {
        this._wss.send(msg);
    }
    _sendSubTrades(remote_id) {
        const stream = remote_id.toLowerCase() + (this.useAggTrades ? "@aggTrade" : "@trade");
        this._batchSub(stream);
    }
    _sendUnsubTrades(remote_id) {
        const stream = remote_id.toLowerCase() + (this.useAggTrades ? "@aggTrade" : "@trade");
        this._batchUnsub(stream);
    }
    _sendSubCandles(remote_id) {
        const stream = remote_id.toLowerCase() + "@kline_" + candlePeriod(this.candlePeriod);
        this._batchSub(stream);
    }
    _sendUnsubCandles(remote_id) {
        const stream = remote_id.toLowerCase() + "@kline_" + candlePeriod(this.candlePeriod);
        this._batchUnsub(stream);
    }
    _sendSubLevel2Snapshots(remote_id) {
        const stream = remote_id.toLowerCase() +
            "@depth20" +
            (this.l2snapshotSpeed ? `@${this.l2snapshotSpeed}` : "");
        this._batchSub(stream);
    }
    _sendUnsubLevel2Snapshots(remote_id) {
        const stream = remote_id.toLowerCase() +
            "@depth20" +
            (this.l2snapshotSpeed ? `@${this.l2snapshotSpeed}` : "");
        this._batchUnsub(stream);
    }
    _sendUnsubLevel2Updates(remote_id) {
        const stream = remote_id.toLowerCase() +
            "@depth" +
            (this.l2updateSpeed ? `@${this.l2updateSpeed}` : "");
        this._batchUnsub(stream);
    }
    _sendSubLevel3Snapshots() {
        throw new Error("Method not implemented.");
    }
    _sendUnsubLevel3Snapshots() {
        throw new Error("Method not implemented.");
    }
    _sendSubLevel3Updates() {
        throw new Error("Method not implemented.");
    }
    _sendUnsubLevel3Updates() {
        throw new Error("Method not implemented.");
    }
    _onMessage(raw) {
        console.log('_onMessage', raw);
        const msg = JSONbig.parse(raw);
        // subscribe/unsubscribe responses
        if (msg.result === null && msg.id) {
            // console.log(msg);
            return;
        }
        // errors
        if (msg.error) {
            const error = new Error(msg.error.msg);
            error.msg = msg;
            this.emit("error", error);
        }
        // All code past this point relies on msg.stream in some manner. This code
        // acts as a guard on msg.stream and aborts prematurely if the property is
        // not available.
        if (!msg.stream) {
            return;
        }
        if (msg.data.e === "listenKeyExpired") {
            // reconnect when listenKey is expired
            // https://binance-docs.github.io/apidocs/futures/en/#close-user-data-stream-user_stream
            return this.reconnect();
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
            let { x: executionType, s: symbol, q: amount, z: amountFilled, S: side, o: orderType, p: orderPrice, i: orderId, X: status, L: lastExecutedPrice, n: commissionAmount, N: commissionCurrency, } = msg.data;
            // map to our status
            if (status === "NEW") {
                status = OrderStatus_1.OrderStatus.NEW;
            }
            else if (status === "PARTIALLY_FILLED") {
                status = OrderStatus_1.OrderStatus.PARTIALLY_FILLED;
            }
            else if (status === "FILLED") {
                status = OrderStatus_1.OrderStatus.FILLED;
            }
            else if (status === "CANCELED") {
                status = OrderStatus_1.OrderStatus.CANCELED;
            }
            else if (status === "EXPIRED" && (orderType === "LIMIT" || orderType === "MARKET")) {
                status = OrderStatus_1.OrderStatus.CANCELED;
            }
            else {
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
                event: null,
                msg: status,
                price: price,
                amount: isSell ? -amount : amount,
                amountFilled: isSell ? -amountFilled : amountFilled,
                commissionAmount: commissionAmount,
                commissionCurrency: commissionCurrency,
            };
            this.emit("orders", change);
        }
        else if (msg.data.e === "ORDER_TRADE_UPDATE") {
            /**
             * https://binance-docs.github.io/apidocs/futures/en/#event-order-update
             * @example
{
  "e":"ORDER_TRADE_UPDATE",     // Event Type
  "E":1568879465651,            // Event Time
  "T":1568879465650,            // Transaction Time
  "o":{
    "s":"BTCUSDT",              // Symbol
    "c":"TEST",                 // Client Order Id
      // special client order id:
      // starts with "autoclose-": liquidation order
      // "adl_autoclose": ADL auto close order
      // "settlement_autoclose-": settlement order for delisting or delivery
    "S":"SELL",                 // Side
    "o":"TRAILING_STOP_MARKET", // Order Type
    "f":"GTC",                  // Time in Force
    "q":"0.001",                // Original Quantity
    "p":"0",                    // Original Price
    "ap":"0",                   // Average Price
    "sp":"7103.04",             // Stop Price. Please ignore with TRAILING_STOP_MARKET order
    "x":"NEW",                  // Execution Type
    "X":"NEW",                  // Order Status
    "i":8886774,                // Order Id
    "l":"0",                    // Order Last Filled Quantity
    "z":"0",                    // Order Filled Accumulated Quantity
    "L":"0",                    // Last Filled Price
    "N":"USDT",             // Commission Asset, will not push if no commission
    "n":"0",                // Commission, will not push if no commission
    "T":1568879465650,          // Order Trade Time
    "t":0,                      // Trade Id
    "b":"0",                    // Bids Notional
    "a":"9.91",                 // Ask Notional
    "m":false,                  // Is this trade the maker side?
    "R":false,                  // Is this reduce only
    "wt":"CONTRACT_PRICE",      // Stop Price Working Type
    "ot":"TRAILING_STOP_MARKET",    // Original Order Type
    "ps":"LONG",                        // Position Side
    "cp":false,                     // If Close-All, pushed with conditional order
    "AP":"7476.89",             // Activation Price, only puhed with TRAILING_STOP_MARKET order
    "cr":"5.0",                 // Callback Rate, only puhed with TRAILING_STOP_MARKET order
    "pP": false,              // ignore
    "si": 0,                  // ignore
    "ss": 0,                  // ignore
    "rp":"0"                            // Realized Profit of the trade
  }
}
             */
            let { x: executionType, s: symbol, q: amount, z: amountFilled, S: side, o: orderType, p: orderPrice, i: orderId, X: status, L: lastExecutedPrice, n: commissionAmount, N: commissionCurrency, } = msg.data.o;
            // map to our status
            if (status === "NEW") {
                status = OrderStatus_1.OrderStatus.NEW;
            }
            else if (status === "PARTIALLY_FILLED") {
                status = OrderStatus_1.OrderStatus.PARTIALLY_FILLED;
            }
            else if (status === "FILLED") {
                status = OrderStatus_1.OrderStatus.FILLED;
            }
            else if (status === "CANCELED") {
                status = OrderStatus_1.OrderStatus.CANCELED;
            }
            else if (status === "EXPIRED" && (orderType === "LIMIT" || orderType === "MARKET")) {
                status = OrderStatus_1.OrderStatus.CANCELED;
            }
            else {
                // SKIP REJECTED and PENDING_CANCEL
                console.log(`not going to update with status ${status}`);
                return;
            }
            let event = null;
            if (orderType === "LIQUIDATION") {
                event = OrderEvent_1.OrderEvent.LIQUIDATION;
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
                event: event,
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
    _constructTicker(msg, market) {
        const { E: timestamp, c: last, v: volume, q: quoteVolume, h: high, l: low, p: change, P: changePercent, a: ask, A: askVolume, b: bid, B: bidVolume, } = msg;
        const open = parseFloat(last) + parseFloat(change);
        return new Ticker_1.Ticker({
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
    _constructAggTrade({ data }, market) {
        const { a: trade_id, p: price, q: size, T: time, m: buyer } = data;
        const unix = time;
        const amount = size;
        const side = buyer ? "buy" : "sell";
        return new Trade_1.Trade({
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
    _constructRawTrade({ data }, market) {
        const { t: trade_id, p: price, q: size, b: buyOrderId, a: sellOrderId, T: time, m: buyer, } = data;
        const unix = time;
        const amount = size;
        const side = buyer ? "buy" : "sell";
        return new Trade_1.Trade({
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
    _constructCandle({ data }) {
        const k = data.k;
        return new Candle_1.Candle(k.t, k.o, k.h, k.l, k.c, k.v);
    }
    _constructLevel2Snapshot(msg, market) {
        const sequenceId = msg.data.lastUpdateId;
        const asks = msg.data.asks.map(p => new Level2Point_1.Level2Point(p[0], p[1]));
        const bids = msg.data.bids.map(p => new Level2Point_1.Level2Point(p[0], p[1]));
        return new Level2Snapshots_1.Level2Snapshot({
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
    _constructLevel2Update(msg, market) {
        const eventMs = msg.data.E;
        const sequenceId = msg.data.U;
        const lastSequenceId = msg.data.u;
        const asks = msg.data.a.map(p => new Level2Point_1.Level2Point(p[0], p[1]));
        const bids = msg.data.b.map(p => new Level2Point_1.Level2Point(p[0], p[1]));
        return new Level2Update_1.Level2Update({
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
    async __requestLevel2Snapshot(market) {
        let failed = false;
        try {
            const remote_id = market.id;
            const uri = `${this._restL2SnapshotPath}?limit=1000&symbol=${remote_id}`;
            const raw = (await https.get(uri));
            const sequenceId = raw.lastUpdateId;
            const timestampMs = raw.E;
            const asks = raw.asks.map(p => new Level2Point_1.Level2Point(p[0], p[1]));
            const bids = raw.bids.map(p => new Level2Point_1.Level2Point(p[0], p[1]));
            const snapshot = new Level2Snapshots_1.Level2Snapshot({
                exchange: this.name,
                base: market.base,
                quote: market.quote,
                sequenceId,
                timestampMs,
                asks,
                bids,
            });
            this.emit("l2snapshot", snapshot, market);
        }
        catch (ex) {
            this.emit("error", ex);
            failed = true;
        }
        finally {
            if (failed)
                this._requestLevel2Snapshot(market);
        }
    }
}
exports.BinancePrivateBase = BinancePrivateBase;
function candlePeriod(p) {
    switch (p) {
        case CandlePeriod_1.CandlePeriod._1m:
            return "1m";
        case CandlePeriod_1.CandlePeriod._3m:
            return "3m";
        case CandlePeriod_1.CandlePeriod._5m:
            return "5m";
        case CandlePeriod_1.CandlePeriod._15m:
            return "15m";
        case CandlePeriod_1.CandlePeriod._30m:
            return "30m";
        case CandlePeriod_1.CandlePeriod._1h:
            return "1h";
        case CandlePeriod_1.CandlePeriod._2h:
            return "2h";
        case CandlePeriod_1.CandlePeriod._4h:
            return "4h";
        case CandlePeriod_1.CandlePeriod._6h:
            return "6h";
        case CandlePeriod_1.CandlePeriod._8h:
            return "8h";
        case CandlePeriod_1.CandlePeriod._12h:
            return "12h";
        case CandlePeriod_1.CandlePeriod._1d:
            return "1d";
        case CandlePeriod_1.CandlePeriod._3d:
            return "3d";
        case CandlePeriod_1.CandlePeriod._1w:
            return "1w";
        case CandlePeriod_1.CandlePeriod._1M:
            return "1M";
    }
}
exports.candlePeriod = candlePeriod;
//# sourceMappingURL=BinancePrivateBase.js.map