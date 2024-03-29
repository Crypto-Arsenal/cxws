"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderlyClient = void 0;
/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-implied-eval */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const moment_1 = __importDefault(require("moment"));
const BasicClient_1 = require("../BasicClient");
const Candle_1 = require("../Candle");
const CandlePeriod_1 = require("../CandlePeriod");
const Throttle_1 = require("../flowcontrol/Throttle");
const Level2Point_1 = require("../Level2Point");
const Level2Snapshots_1 = require("../Level2Snapshots");
const Level2Update_1 = require("../Level2Update");
const NotImplementedFn_1 = require("../NotImplementedFn");
const Ticker_1 = require("../Ticker");
const Trade_1 = require("../Trade");
class OrderlyClient extends BasicClient_1.BasicClient {
    constructor({ sendThrottleMs = 20 } = {}) {
        super(`wss://ws.orderly.org/ws/stream/bf6eb263984c964a0cda3e9a35aa486268eea085d9b90fe792c8f9ad7e129a2c`, "orderly", undefined, 20);
        this._sendSubLevel3Snapshots = NotImplementedFn_1.NotImplementedFn;
        this._sendUnsubLevel3Snapshots = NotImplementedFn_1.NotImplementedFn;
        this._sendSubLevel3Updates = NotImplementedFn_1.NotImplementedFn;
        this._sendUnsubLevel3Updates = NotImplementedFn_1.NotImplementedFn;
        this.candlePeriod = CandlePeriod_1.CandlePeriod._1m;
        this.hasTickers = false;
        this.hasTrades = false;
        this.hasCandles = true;
        this.hasLevel2Snapshots = false;
        this.hasLevel2Updates = false;
        this._sendMessage = (0, Throttle_1.throttle)(this.__sendMessage.bind(this), sendThrottleMs);
    }
    _beforeClose() {
        this._sendMessage.cancel();
    }
    _beforeConnect() {
        this._wss.on("connected", this._startPing.bind(this));
        this._wss.on("disconnected", this._stopPing.bind(this));
        this._wss.on("closed", this._stopPing.bind(this));
    }
    // https://docs-api.orderly.network/#websocket-api-ping-pong -> 10s to keep alive
    _startPing() {
        clearInterval(this._pingInterval);
        this._pingInterval = setInterval(this._sendPing.bind(this), 9 * 1000);
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
    _sendPong() {
        if (this._wss) {
            this._wss.send(JSON.stringify({
                event: "pong",
            }));
        }
    }
    /**
     * Constructs a market argument in a backwards compatible manner where
     * the default is a spot market.
     */
    _marketArg(method, market) {
        // const type = (market.type || "spot").toLowerCase();
        // return `${type.toLowerCase()}/${method}:${market.id}`;
        return "SPOT_NEAR_USDC";
    }
    /**
     * Gets the exchanges interpretation of the candle period
     */
    _candlePeriod(period) {
        switch (period) {
            case CandlePeriod_1.CandlePeriod._1m:
                return "kline_1m";
            case CandlePeriod_1.CandlePeriod._3m:
                return "kline_1m";
            case CandlePeriod_1.CandlePeriod._5m:
                return "kline_5m";
            case CandlePeriod_1.CandlePeriod._15m:
                return "kline_15m";
            case CandlePeriod_1.CandlePeriod._30m:
                return "kline_30m";
            case CandlePeriod_1.CandlePeriod._1h:
                return "kline_1h";
            case CandlePeriod_1.CandlePeriod._2h:
                return "kline_1h";
            case CandlePeriod_1.CandlePeriod._4h:
                return "kline_1h";
            case CandlePeriod_1.CandlePeriod._6h:
                return "kline_1h";
            case CandlePeriod_1.CandlePeriod._12h:
                return "kline_1h";
            case CandlePeriod_1.CandlePeriod._1d:
                return "kline_1d";
            case CandlePeriod_1.CandlePeriod._1w:
                return "kline_1w";
        }
    }
    __sendMessage(msg) {
        this._wss.send(msg);
    }
    _sendSubTicker(remote_id, market) {
        this._sendMessage(JSON.stringify({
            op: "subscribe",
            args: [this._marketArg("ticker", market)],
        }));
    }
    _sendUnsubTicker(remote_id, market) {
        this._sendMessage(JSON.stringify({
            op: "unsubscribe",
            args: [this._marketArg("ticker", market)],
        }));
    }
    _sendSubTrades(remote_id, market) {
        this._sendMessage(JSON.stringify({
            op: "subscribe",
            args: [this._marketArg("trade", market)],
        }));
    }
    _sendUnsubTrades(remote_id, market) {
        this._sendMessage(JSON.stringify({
            op: "unsubscribe",
            args: [this._marketArg("trade", market)],
        }));
    }
    _sendSubCandles(remote_id, market) {
        this._sendMessage(JSON.stringify({
            id: "clientID6",
            topic: "SPOT_NEAR_USDC@kline_1m",
            event: "subscribe",
        }));
    }
    _sendUnsubCandles(remote_id, market) {
        this._sendMessage(JSON.stringify({
            op: "unsubscribe",
            args: [this._marketArg("candle" + this._candlePeriod(this.candlePeriod), market)],
        }));
    }
    _sendSubLevel2Snapshots(remote_id, market) {
        this._sendMessage(JSON.stringify({
            op: "subscribe",
            args: [this._marketArg("depth5", market)],
        }));
    }
    _sendUnsubLevel2Snapshots(remote_id, market) {
        this._sendMessage(JSON.stringify({
            op: "unsubscribe",
            args: [this._marketArg("depth5", market)],
        }));
    }
    _sendSubLevel2Updates(remote_id, market) {
        this._sendMessage(JSON.stringify({
            op: "subscribe",
            args: [this._marketArg("depth_l2_tbt", market)],
        }));
    }
    _sendUnsubLevel2Updates(remote_id, market) {
        this._sendMessage(JSON.stringify({
            op: "unsubscribe",
            args: [this._marketArg("depth_l2_tbt", market)],
        }));
    }
    _onMessage(compressed) {
        console.log("compressed", compressed);
        try {
            const msg = JSON.parse(compressed.toString());
            this._processsMessage(msg);
        }
        catch (ex) {
            this.emit("error", ex);
        }
    }
    _processsMessage(msg) {
        console.log("_processsMessage", msg);
        // clear semaphore on subscription event reply
        if (msg.event === "subscribe") {
            return;
        }
        // ignore unsubscribe
        if (msg.event === "unsubscribe") {
            return;
        }
        // prevent failed messages from
        if (msg.event == "pong") {
            return;
        }
        if (msg.event == "ping") {
            this._sendPong();
        }
        // candles
        if (msg?.topic?.includes("@kline_")) {
            if (msg.data) {
                this._processCandles(msg);
            }
            return;
        }
    }
    /**
   * Process ticker messages in the format
    { table: 'spot/ticker',
      data:
      [ { instrument_id: 'ETH-BTC',
          last: '0.02181',
          best_bid: '0.0218',
          best_ask: '0.02181',
          open_24h: '0.02247',
          high_24h: '0.02262',
          low_24h: '0.02051',
          base_volume_24h: '379522.2418555',
          quote_volume_24h: '8243.729793336415',
          timestamp: '2019-07-15T17:10:55.671Z' } ] }
   */
    _processTicker(msg) {
        for (const datum of msg.data) {
            // ensure market
            const remoteId = datum.instrument_id;
            const market = this._tickerSubs.get(remoteId);
            if (!market)
                continue;
            // construct and emit ticker
            const ticker = this._constructTicker(datum, market);
            this.emit("ticker", ticker, market);
        }
    }
    /**
   * Processes trade messages in the format
    { table: 'spot/trade',
      data:
      [ { instrument_id: 'ETH-BTC',
          price: '0.0218',
          side: 'sell',
          size: '1.1',
          timestamp: '2019-07-15T17:10:56.047Z',
          trade_id: '776432498' } ] }
   */
    _processTrades(msg) {
        for (const datum of msg.data) {
            // ensure market
            const remoteId = datum.instrument_id;
            const market = this._tradeSubs.get(remoteId);
            if (!market)
                continue;
            // construct and emit trade
            const trade = this._constructTrade(datum, market);
            this.emit("trade", trade, market);
        }
    }
    /**
   * Processes a candle message
    {
      "table": "spot/candle60s",
      "data": [
        {
          "candle": [
            "2020-08-10T20:42:00.000Z",
            "0.03332",
            "0.03332",
            "0.03331",
            "0.03332",
            "44.058532"
          ],
          "instrument_id": "ETH-BTC"
        }
      ]
    }
   */
    _processCandles(msg) {
        const { data, data: { symbol }, } = msg;
        this.emit("candle", data, symbol);
    }
    /**
   * Processes a level 2 snapshot message in the format:
      { table: 'spot/depth5',
        data: [{
            asks: [ ['0.02192', '1.204054', '3' ] ],
            bids: [ ['0.02191', '15.117671', '3' ] ],
            instrument_id: 'ETH-BTC',
            timestamp: '2019-07-15T16:54:42.301Z' } ] }
   */
    _processLevel2Snapshot(msg) {
        for (const datum of msg.data) {
            // ensure market
            const remote_id = datum.instrument_id;
            const market = this._level2SnapshotSubs.get(remote_id);
            if (!market)
                return;
            // construct snapshot
            const snapshot = this._constructLevel2Snapshot(datum, market);
            this.emit("l2snapshot", snapshot, market);
        }
    }
    /**
   * Processes a level 2 update message in one of two formats.
   * The first message received is the "partial" orderbook and contains
   * 200 records in it.
   *
    { table: 'spot/depth',
          action: 'partial',
          data:
            [ { instrument_id: 'ETH-BTC',
                asks: [Array],
                bids: [Array],
                timestamp: '2019-07-15T17:18:31.737Z',
                checksum: 723501244 } ] }
   *
   * Subsequent calls will include the updates stream for changes to
   * the order book:
   *
      { table: 'spot/depth',
      action: 'update',
      data:
        [ { instrument_id: 'ETH-BTC',
            asks: [Array],
            bids: [Array],
            timestamp: '2019-07-15T17:18:32.289Z',
            checksum: 680530848 } ] }
   */
    _processLevel2Update(msg) {
        const action = msg.action;
        for (const datum of msg.data) {
            // ensure market
            const remote_id = datum.instrument_id;
            const market = this._level2UpdateSubs.get(remote_id);
            if (!market)
                continue;
            // handle updates
            if (action === "partial") {
                const snapshot = this._constructLevel2Snapshot(datum, market);
                this.emit("l2snapshot", snapshot, market);
            }
            else if (action === "update") {
                const update = this._constructLevel2Update(datum, market);
                this.emit("l2update", update, market);
            }
            else {
                // eslint-disable-next-line no-console
                console.error("Unknown action type", msg);
            }
        }
    }
    /**
   * Constructs a ticker from the datum in the format:
      { instrument_id: 'ETH-BTC',
        last: '0.02172',
        best_bid: '0.02172',
        best_ask: '0.02173',
        open_24h: '0.02254',
        high_24h: '0.02262',
        low_24h: '0.02051',
        base_volume_24h: '378400.064179',
        quote_volume_24h: '8226.4437921288',
        timestamp: '2019-07-15T16:10:40.193Z' }
   */
    _constructTicker(data, market) {
        const { last, best_bid, best_bid_size, best_ask, best_ask_size, open_24h, high_24h, low_24h, base_volume_24h, volume_24h, // found in futures
        timestamp, } = data;
        const change = parseFloat(last) - parseFloat(open_24h);
        const changePercent = change / parseFloat(open_24h);
        const ts = moment_1.default.utc(timestamp).valueOf();
        return new Ticker_1.Ticker({
            exchange: this.name,
            base: market.base,
            quote: market.quote,
            timestamp: ts,
            last,
            open: open_24h,
            high: high_24h,
            low: low_24h,
            volume: base_volume_24h || volume_24h,
            change: change.toFixed(8),
            changePercent: changePercent.toFixed(2),
            bid: best_bid || "0",
            bidVolume: best_bid_size || "0",
            ask: best_ask || "0",
            askVolume: best_ask_size || "0",
        });
    }
    /**
   * Constructs a trade from the message datum in format:
    { instrument_id: 'ETH-BTC',
      price: '0.02182',
      side: 'sell',
      size: '0.94',
      timestamp: '2019-07-15T16:38:02.169Z',
      trade_id: '776370532' }
    */
    _constructTrade(datum, market) {
        const { price, side, size, timestamp, trade_id, qty } = datum;
        const ts = moment_1.default.utc(timestamp).valueOf();
        return new Trade_1.Trade({
            exchange: this.name,
            base: market.base,
            quote: market.quote,
            tradeId: trade_id,
            side,
            unix: ts,
            price,
            amount: size || qty,
        });
    }
    /**
   * Constructs a candle for the market
      {
        "candle": [
          "2020-08-10T20:42:00.000Z",
          "0.03332",
          "0.03332",
          "0.03331",
          "0.03332",
          "44.058532"
        ],
        "instrument_id": "ETH-BTC"
      }
   * @param {*} datum
   */
    _constructCandle(datum) {
        const [datetime, open, high, low, close, volume] = datum.candle;
        const ts = moment_1.default.utc(datetime).valueOf();
        return new Candle_1.Candle(ts, open, high, low, close, volume);
    }
    /**
   * Constructs a snapshot message from the datum in a
   * snapshot message data property. Datum in the format:
   *
      { instrument_id: 'ETH-BTC',
        asks: [ ['0.02192', '1.204054', '3' ] ],
        bids: [ ['0.02191', '15.117671', '3' ] ],
        timestamp: '2019-07-15T16:54:42.301Z' }
   *
   * The snapshot may also come from an update, in which case we need
   * to include the checksum
   *
      { instrument_id: 'ETH-BTC',
        asks: [ ['0.02192', '1.204054', '3' ] ],
        bids: [ ['0.02191', '15.117671', '3' ] ],
        timestamp: '2019-07-15T17:18:31.737Z',
        checksum: 723501244 }

   */
    _constructLevel2Snapshot(datum, market) {
        const asks = datum.asks.map(p => new Level2Point_1.Level2Point(p[0], p[1], p[2]));
        const bids = datum.bids.map(p => new Level2Point_1.Level2Point(p[0], p[1], p[2]));
        const ts = moment_1.default.utc(datum.timestamp).valueOf();
        const checksum = datum.checksum;
        return new Level2Snapshots_1.Level2Snapshot({
            exchange: this.name,
            base: market.base,
            quote: market.quote,
            timestampMs: ts,
            asks,
            bids,
            checksum,
        });
    }
    /**
   * Constructs an update message from the datum in the update
   * stream. Datum is in the format:
    { instrument_id: 'ETH-BTC',
      asks: [ ['0.02192', '1.204054', '3' ] ],
      bids: [ ['0.02191', '15.117671', '3' ] ],
      timestamp: '2019-07-15T17:18:32.289Z',
      checksum: 680530848 }
   */
    // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
    _constructLevel2Update(datum, market) {
        const asks = datum.asks.map(p => new Level2Point_1.Level2Point(p[0], p[1], p[3]));
        const bids = datum.bids.map(p => new Level2Point_1.Level2Point(p[0], p[1], p[3]));
        const ts = moment_1.default.utc(datum.timestamp).valueOf();
        const checksum = datum.checksum;
        return new Level2Update_1.Level2Update({
            exchange: this.name,
            base: market.base,
            quote: market.quote,
            timestampMs: ts,
            asks,
            bids,
            checksum,
        });
    }
}
exports.OrderlyClient = OrderlyClient;
//# sourceMappingURL=OrderlyClient.js.map