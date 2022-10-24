import ccxt from "ccxt";

/**
 * Interact with exchanges via API
 */
(async () => {
    const bi = new ccxt.binanceusdm({
        verbose: false,
        apiKey: "key",
        secret: "secret",
    });

    // await bi.loadMarkets();

    // const ord = await bi.createOrder("ETH/USDT", "LIMIT", "sell", 1100, 2);
    // console.log(ord);

    // await bi.fapiPrivateDeleteListenKey();
    // await bi.dapiPrivateDeleteListenKey();
})();
