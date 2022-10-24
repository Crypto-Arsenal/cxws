import {
    BinanceClient,
    ErisXClient,
    KrakenPrivateClient,
    OkexPrivateClient,
    HuobiPrivateClient,
    CryptoComPrivateClient,
    BitgetPrivateClient,
    BinancePrivateClient,
    BinanceFuturesUsdtmPrivateClient,
    BinanceFuturesCoinmPrivateClient,
} from "../../src";

/**
 * Driver code to test WS
 */
let binance = new BinanceFuturesCoinmPrivateClient({
    apiKey: "key",
    apiSecret: "secret",
});

binance.subscribePrivateOrders({ id: "id" });

binance.on("orders", data => console.log("orders hook", data));
binance.on("error", err => console.error(err));
