"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TestRunner_1 = require("../TestRunner");
const CexClient_1 = require("../../src/exchanges/CexClient");
(0, TestRunner_1.testClient)({
    clientFactory: () => new CexClient_1.CexClient({
        apiKey: process.env.CEX_API_KEY,
        apiSecret: process.env.CEX_API_SECRET,
    }),
    clientName: "CexClient",
    exchangeName: "CEX",
    markets: [
        {
            id: "BTC/USD",
            base: "BTC",
            quote: "USD",
        },
        {
            id: "BTC/EUR",
            base: "BTC",
            quote: "USD",
        },
        {
            id: "BTT/EUR",
            base: "BTT",
            quote: "EUR",
        },
    ],
    getEventingSocket(client, market) {
        return client._clients.get(market.id).then(c => c._wss);
    },
    testConnectEvents: true,
    testDisconnectEvents: true,
    testReconnectionEvents: true,
    testCloseEvents: true,
    hasTickers: true,
    hasTrades: true,
    hasCandles: true,
    hasLevel2Snapshots: true,
    hasLevel2Updates: false,
    hasLevel3Snapshots: false,
    hasLevel3Updates: false,
    ticker: {
        hasTimestamp: true,
        hasLast: true,
        hasOpen: true,
        hasHigh: false,
        hasLow: false,
        hasVolume: true,
        hasQuoteVolume: false,
        hasChange: true,
        hasChangePercent: true,
        hasBid: false,
        hasBidVolume: false,
        hasAsk: false,
        hasAskVolume: false,
    },
    trade: {
        hasTradeId: true,
    },
    candle: {},
    l2snapshot: {
        hasTimestampMs: false,
        hasSequenceId: true,
        hasCount: false,
    },
});
//# sourceMappingURL=CexClient.spec.js.map