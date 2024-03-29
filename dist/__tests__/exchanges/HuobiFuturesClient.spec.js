"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TestRunner_1 = require("../TestRunner");
const HuobiFuturesClient_1 = require("../../src/exchanges/HuobiFuturesClient");
(0, TestRunner_1.testClient)({
    clientFactory: () => new HuobiFuturesClient_1.HuobiFuturesClient(),
    clientName: "HuobiFuturesClient",
    exchangeName: "Huobi Futures",
    markets: [
        {
            id: "BTC_CW",
            base: "BTC",
            quote: "USD",
        },
        {
            id: "BTC_NW",
            base: "BTC",
            quote: "USD",
        },
        {
            id: "BTC_CQ",
            base: "BTC",
            quote: "USD",
        },
        {
            id: "BTC_NQ",
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
    hasLevel2Snapshots: true,
    hasLevel2Updates: true,
    hasLevel3Snapshots: false,
    hasLevel3Updates: false,
    ticker: {
        hasTimestamp: true,
        hasLast: true,
        hasOpen: true,
        hasHigh: true,
        hasLow: true,
        hasVolume: true,
        hasQuoteVolume: true,
        hasChange: true,
        hasChangePercent: true,
        hasAsk: false,
        hasBid: false,
        hasAskVolume: false,
        hasBidVolume: false,
    },
    trade: {
        hasTradeId: true,
        tradeIdPattern: /[0-9]+/,
    },
    candle: {},
    l2update: {
        hasSnapshot: true,
        hasSequenceId: true,
        hasTimestampMs: true,
    },
    l2snapshot: {
        hasTimestampMs: true,
        hasSequenceId: true,
        hasCount: false,
    },
});
//# sourceMappingURL=HuobiFuturesClient.spec.js.map