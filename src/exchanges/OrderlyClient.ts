/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-implied-eval */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import moment from "moment";
import { BasicClient } from "../BasicClient";
import { Candle } from "../Candle";
import { CandlePeriod } from "../CandlePeriod";
import { ClientOptions } from "../ClientOptions";
import { CancelableFn } from "../flowcontrol/Fn";
import { throttle } from "../flowcontrol/Throttle";
import { Level2Point } from "../Level2Point";
import { Level2Snapshot } from "../Level2Snapshots";
import { Level2Update } from "../Level2Update";
import { Market } from "../Market";
import { NotImplementedFn } from "../NotImplementedFn";
import { Ticker } from "../Ticker";
import { Trade } from "../Trade";
import * as zlib from "../ZlibUtils";

const pongBuffer = Buffer.from("pong");

export type OrderlyClientOptions = ClientOptions & {
    sendThrottleMs?: number;
};

/**
 * Implements OKEx V3 WebSocket API as defined in
 * https://www.okex.com/docs/en/#spot_ws-general
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
const KEYS = {
    publicKey: "",
    accountId: "19ebb9b345e1ba2eb9b3734e8633eaf46f7a4020627bae33de1f7f00f6090a37",
    tradingPublic: "",
    tradingSecret: "",
    orderlyKeyPrivate: "",
};

type KlineType =
    | "1m"
    | "5m"
    | "15m"
    | "30m"
    | "1h"
    | "2h"
    | "4h"
    | "6h"
    | "12h"
    | "1d"
    | "3d"
    | "1w"
    | "2w";

interface IKlineObject {
    topic: string;
    ts: number;
    data: {
        symbol: string;
        type: KlineType;
        open: number;
        close: number;
        high: number;
        low: number;
        volume: number;
        amount: number;
        startTime: number;
        endTime: number;
    };
}

export class OrderlyClient extends BasicClient {
    public candlePeriod: CandlePeriod;

    protected _sendMessage: CancelableFn;
    protected _pingInterval: NodeJS.Timeout;

    constructor({
        wssPath = `wss://ws.orderly.org/ws/stream/${KEYS.accountId}`,
        watcherMs,
        sendThrottleMs = 20,
    }: OrderlyClientOptions = {}) {
        super(wssPath, "orderly", undefined, watcherMs);
        this.candlePeriod = CandlePeriod._1m;
        this.hasTickers = false;
        this.hasTrades = false;
        this.hasCandles = true;
        this.hasLevel2Snapshots = false;
        this.hasLevel2Updates = false;
        this._sendMessage = throttle(this.__sendMessage.bind(this), sendThrottleMs);
    }

    protected _beforeClose() {
        this._sendMessage.cancel();
    }

    protected _beforeConnect() {
        this._wss.on("connected", this._startPing.bind(this));
        this._wss.on("disconnected", this._stopPing.bind(this));
        this._wss.on("closed", this._stopPing.bind(this));
    }

    // https://docs-api.orderly.network/#websocket-api-ping-pong -> 10s to keep alive
    protected _startPing() {
        clearInterval(this._pingInterval);
        this._pingInterval = setInterval(this._sendPing.bind(this), 9 * 1000);
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

    protected _sendPong() {
        if (this._wss) {
            this._wss.send(
                JSON.stringify({
                    event: "pong",
                }),
            );
        }
    }

    /**
     * Constructs a market argument in a backwards compatible manner where
     * the default is a spot market.
     */
    protected _marketArg(method: string, market: Market) {
        // const type = (market.type || "spot").toLowerCase();
        // return `${type.toLowerCase()}/${method}:${market.id}`;
        return "SPOT_NEAR_USDC";
    }

    /**
     * Gets the exchanges interpretation of the candle period
     */
    protected _candlePeriod(period: CandlePeriod) {
        switch (period) {
            case CandlePeriod._1m:
                return "kline_1m";
            case CandlePeriod._3m:
                return "kline_1m";
            case CandlePeriod._5m:
                return "kline_5m";
            case CandlePeriod._15m:
                return "kline_15m";
            case CandlePeriod._30m:
                return "kline_30m";
            case CandlePeriod._1h:
                return "kline_1h";
            case CandlePeriod._2h:
                return "kline_1h";
            case CandlePeriod._4h:
                return "kline_1h";
            case CandlePeriod._6h:
                return "kline_1h";
            case CandlePeriod._12h:
                return "kline_1h";
            case CandlePeriod._1d:
                return "kline_1d";
            case CandlePeriod._1w:
                return "kline_1w";
        }
    }

    protected __sendMessage(msg) {
        this._wss.send(msg);
    }

    protected _sendSubTicker(remote_id, market) {
        this._sendMessage(
            JSON.stringify({
                op: "subscribe",
                args: [this._marketArg("ticker", market)],
            }),
        );
    }

    protected _sendUnsubTicker(remote_id, market) {
        this._sendMessage(
            JSON.stringify({
                op: "unsubscribe",
                args: [this._marketArg("ticker", market)],
            }),
        );
    }

    protected _sendSubTrades(remote_id, market) {
        this._sendMessage(
            JSON.stringify({
                op: "subscribe",
                args: [this._marketArg("trade", market)],
            }),
        );
    }

    protected _sendUnsubTrades(remote_id, market) {
        this._sendMessage(
            JSON.stringify({
                op: "unsubscribe",
                args: [this._marketArg("trade", market)],
            }),
        );
    }

    protected _sendSubCandles(remote_id, market) {
        this._sendMessage(
            JSON.stringify({
                id: "clientID6",
                topic: "SPOT_NEAR_USDC@kline_1m",
                event: "subscribe",
            }),
        );
    }

    protected _sendUnsubCandles(remote_id, market) {
        this._sendMessage(
            JSON.stringify({
                op: "unsubscribe",
                args: [this._marketArg("candle" + this._candlePeriod(this.candlePeriod), market)],
            }),
        );
    }

    protected _sendSubLevel2Snapshots(remote_id, market) {
        this._sendMessage(
            JSON.stringify({
                op: "subscribe",
                args: [this._marketArg("depth5", market)],
            }),
        );
    }

    protected _sendUnsubLevel2Snapshots(remote_id, market) {
        this._sendMessage(
            JSON.stringify({
                op: "unsubscribe",
                args: [this._marketArg("depth5", market)],
            }),
        );
    }

    protected _sendSubLevel2Updates(remote_id, market) {
        this._sendMessage(
            JSON.stringify({
                op: "subscribe",
                args: [this._marketArg("depth_l2_tbt", market)],
            }),
        );
    }

    protected _sendUnsubLevel2Updates(remote_id, market) {
        this._sendMessage(
            JSON.stringify({
                op: "unsubscribe",
                args: [this._marketArg("depth_l2_tbt", market)],
            }),
        );
    }

    protected _sendSubLevel3Snapshots = NotImplementedFn;
    protected _sendUnsubLevel3Snapshots = NotImplementedFn;
    protected _sendSubLevel3Updates = NotImplementedFn;
    protected _sendUnsubLevel3Updates = NotImplementedFn;

    protected _onMessage(compressed) {
        console.log("compressed", compressed);
        try {
            const msg = JSON.parse(compressed.toString());
            this._processsMessage(msg);
        } catch (ex) {
            this.emit("error", ex);
        }
        // zlib.inflateRaw(compressed, (err, raw) => {
        //     if (err) {
        //         this.emit("error", err);
        //         return;
        //     }

        //     // ignore pongs
        //     if (raw.equals(pongBuffer)) {
        //         return;
        //     }

        //     // process JSON message
        //     try {
        //         const msg = JSON.parse(raw.toString());
        //         this._processsMessage(msg);
        //     } catch (ex) {
        //         this.emit("error", ex);
        //     }
        // });
    }

    protected _processsMessage(msg: any) {
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

        // // tickers
        // if (msg.table.match(/ticker/)) {
        //     this._processTicker(msg);
        //     return;
        // }

        // // trades
        // if (msg.table.match(/trade/)) {
        //     this._processTrades(msg);
        //     return;
        // }

        // candles
        if (msg?.topic?.includes("@kline_")) {
            if (msg.data) {
                this._processCandles(msg);
            }
            return;
        }

        // // l2 snapshots
        // if (msg.table.match(/depth5/)) {
        //     this._processLevel2Snapshot(msg);
        //     return;
        // }

        // // l2 updates
        // if (msg.table.match(/depth/)) {
        //     this._processLevel2Update(msg);
        //     return;
        // }
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
    protected _processTicker(msg) {
        for (const datum of msg.data) {
            // ensure market
            const remoteId = datum.instrument_id;
            const market = this._tickerSubs.get(remoteId);
            if (!market) continue;

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
    protected _processTrades(msg) {
        for (const datum of msg.data) {
            // ensure market
            const remoteId = datum.instrument_id;
            const market = this._tradeSubs.get(remoteId);
            if (!market) continue;

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
    protected _processCandles(msg: IKlineObject) {
        const {
            data,
            data: { symbol },
        } = msg;
        this.emit("candle", data, symbol);
        // for (const datum of msg.data) {
        //     // ensure market
        //     const remoteId = datum.instrument_id;
        //     const market = this._candleSubs.get(remoteId);
        //     if (!market) continue;

        //     // construct and emit candle
        //     const candle = this._constructCandle(datum);
        //     this.emit("candle", candle, market);
        // }
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
    protected _processLevel2Snapshot(msg) {
        for (const datum of msg.data) {
            // ensure market
            const remote_id = datum.instrument_id;
            const market = this._level2SnapshotSubs.get(remote_id);
            if (!market) return;

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
    protected _processLevel2Update(msg) {
        const action = msg.action;
        for (const datum of msg.data) {
            // ensure market
            const remote_id = datum.instrument_id;
            const market = this._level2UpdateSubs.get(remote_id);
            if (!market) continue;

            // handle updates
            if (action === "partial") {
                const snapshot = this._constructLevel2Snapshot(datum, market);
                this.emit("l2snapshot", snapshot, market);
            } else if (action === "update") {
                const update = this._constructLevel2Update(datum, market);
                this.emit("l2update", update, market);
            } else {
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
    protected _constructTicker(data, market) {
        const {
            last,
            best_bid,
            best_bid_size,
            best_ask,
            best_ask_size,
            open_24h,
            high_24h,
            low_24h,
            base_volume_24h,
            volume_24h, // found in futures
            timestamp,
        } = data;

        const change = parseFloat(last) - parseFloat(open_24h);
        const changePercent = change / parseFloat(open_24h);
        const ts = moment.utc(timestamp).valueOf();
        return new Ticker({
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
    protected _constructTrade(datum, market) {
        const { price, side, size, timestamp, trade_id, qty } = datum;
        const ts = moment.utc(timestamp).valueOf();

        return new Trade({
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
    protected _constructCandle(datum) {
        const [datetime, open, high, low, close, volume] = datum.candle;
        const ts = moment.utc(datetime).valueOf();
        return new Candle(ts, open, high, low, close, volume);
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
    protected _constructLevel2Snapshot(datum, market) {
        const asks = datum.asks.map(p => new Level2Point(p[0], p[1], p[2]));
        const bids = datum.bids.map(p => new Level2Point(p[0], p[1], p[2]));
        const ts = moment.utc(datum.timestamp).valueOf();
        const checksum = datum.checksum;
        return new Level2Snapshot({
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
        const asks = datum.asks.map(p => new Level2Point(p[0], p[1], p[3]));
        const bids = datum.bids.map(p => new Level2Point(p[0], p[1], p[3]));
        const ts = moment.utc(datum.timestamp).valueOf();
        const checksum = datum.checksum;
        return new Level2Update({
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
