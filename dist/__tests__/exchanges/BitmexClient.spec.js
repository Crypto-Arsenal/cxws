"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const TestRunner_1 = require("../TestRunner");
const BitmexClient_1 = require("../../src/exchanges/BitmexClient");
(0, TestRunner_1.testClient)({
    clientFactory: () => new BitmexClient_1.BitmexClient(),
    clientName: "BitMEXClient",
    exchangeName: "BitMEX",
    markets: [
        {
            id: "XBTUSD",
            base: "BTC",
            quote: "USD",
        },
    ],
    testConnectEvents: true,
    testDisconnectEvents: true,
    testReconnectionEvents: true,
    testCloseEvents: true,
    hasTickers: true,
    hasTrades: true,
    hasCandles: true,
    hasLevel2Snapshots: false,
    hasLevel2Updates: true,
    hasLevel3Snapshots: false,
    hasLevel3Updates: false,
    ticker: {
        hasTimestamp: true,
        hasLast: true,
        hasOpen: false,
        hasHigh: false,
        hasLow: false,
        hasVolume: false,
        hasQuoteVolume: false,
        hasChange: false,
        hasChangePercent: false,
        hasAsk: true,
        hasBid: true,
        hasAskVolume: true,
        hasBidVolume: true,
    },
    trade: {
        hasTradeId: true,
        tests: (spec, result) => {
            it("trade.tradeId should be 32 hex characters", () => {
                (0, chai_1.expect)(result.trade.tradeId).to.match(/^[a-f0-9]{32,32}$/);
            });
        },
    },
    candle: {},
    l2snapshot: {
        hasTimestampMs: false,
        hasSequenceId: false,
        hasCount: false,
    },
    l2update: {
        hasSnapshot: true,
        hasTimestampMs: false,
        hasSequenceId: false,
        hasCount: false,
        done: (spec, result, update) => {
            const point = update.bids[0] || update.asks[0];
            if (point.meta.type === "update")
                result.hasUpdate = true;
            if (point.meta.type === "insert")
                result.hasInsert = true;
            if (point.meta.type === "delete")
                result.hasDelete = true;
            return result.hasUpdate && result.hasInsert && result.hasDelete;
        },
        tests: (spec, result) => {
            it("update.bid/ask should have meta.id", () => {
                const point = result.update.bids[0] || result.update.asks[0];
                (0, chai_1.expect)(point.meta.id).to.be.greaterThan(0);
            });
            it("update.bid/ask should have meta.type", () => {
                const point = result.update.bids[0] || result.update.asks[0];
                (0, chai_1.expect)(point.meta.type).to.be.match(/update|delete|insert/);
            });
        },
    },
});
//# sourceMappingURL=BitmexClient.spec.js.map