import ccxt from "ccxt";

export type ExchangeId = keyof typeof ccxt.exchanges;

export enum InvestmentType {
    SPOT = "SPOT",
    USD_M_FUTURES = "USD_M_FUTURES",
    COIN_M_FUTURES = "COIN_M_FUTURES",
}