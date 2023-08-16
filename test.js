const { OrderlyClient } = require('./dist/src/exchanges/OrderlyClient')
const oc = new OrderlyClient();

oc.on('candle', console.log)
// market could be from CCXT or genearted by the user
const market = {
    id: "BTCUSDT", // remote_id used by the exchange
    base: "BTC", // standardized base symbol for Bitcoin
    quote: "USDT", // standardized quote symbol for Tether
};

oc.subscribeCandles(market)
// subscribe to trades
// oc.sub(market);