const { OrderlyPrivateClient } = require('./dist/src/exchanges/OrderlyPrivateClient')
const oc = new OrderlyPrivateClient();

// oc.on('candle', console.log)
// market could be from CCXT or genearted by the user
const market = {
    id: "BTCUSDT", // remote_id used by the exchange
    base: "BTC", // standardized base symbol for Bitcoin
    quote: "USDT", // standardized quote symbol for Tether
};

oc.subscribePrivateOrders(market)
// subscribe to trades
// oc.sub(market);