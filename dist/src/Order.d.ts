import * as ccxt from "ccxt";
import { OrderStatus } from "./OrderStatus";
export declare type Order = {
    exchange: ccxt.ExchangeId;
    pair: string;
    exchangeOrderId: string;
    status: OrderStatus;
    msg: OrderStatus;
    price: number;
    amount: number;
    amountFilled: number;
    commissionAmount: number;
    commissionCurrency: string;
};
