import * as ccxt from "ccxt";
import { OrderStatus } from "./OrderStatus";
import { OrderEvent } from "./OrderEvent";
export declare type Order = {
    exchange: ccxt.ExchangeId;
    pair: string;
    exchangeOrderId: string;
    status: OrderStatus;
    event: OrderEvent;
    msg: OrderStatus;
    price: number;
    amount: number;
    amountFilled: number;
    commissionAmount: number;
    commissionCurrency: string;
};
