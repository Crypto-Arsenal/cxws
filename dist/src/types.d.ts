import ccxt from "ccxt";
export declare type ExchangeId = keyof typeof ccxt.exchanges;
export declare enum InvestmentType {
    SPOT = "SPOT",
    USD_M_FUTURES = "USD_M_FUTURES",
    COIN_M_FUTURES = "COIN_M_FUTURES"
}
