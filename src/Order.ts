import * as ccxt from "ccxt";
import { OrderStatus } from "./OrderStatus";
export type Order = {
    exchange: ccxt.ExchangeId;
    pair: string;
    externalOrderId: string;
    status: OrderStatus;
    msg: OrderStatus;
    price: number;
    amount: number;
    amountFilled: number;
    commissionAmount: number;
    commissionCurrency: string;
};
