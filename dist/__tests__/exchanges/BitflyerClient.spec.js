"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TestRunner_1 = require("../TestRunner");
const BitflyerClient_1 = require("../../src/exchanges/BitflyerClient");
(0, TestRunner_1.testClient)({
    clientFactory: () => new BitflyerClient_1.BitflyerClient(),
    clientName: "BitflyerClient",
    exchangeName: "bitFlyer",
    markets: [
        {
            id: "BTC_JPY",
            base: "BTC",
            quote: "JPY",
        },
    ],
    testConnectEvents: true,
    testDisconnectEvents: true,
    testReconnectionEvents: true,
    testCloseEvents: true,
    hasTickers: true,
    hasTrades: true,
    hasCandles: false,
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
        hasVolume: true,
        hasQuoteVolume: true,
        hasChange: false,
        hasChangePercent: false,
        hasBid: true,
        hasBidVolume: true,
        hasAsk: true,
        hasAskVolume: true,
    },
    trade: {
        hasTradeId: true,
    },
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
    },
});
//# sourceMappingURL=BitflyerClient.spec.js.map