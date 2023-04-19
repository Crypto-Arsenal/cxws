import { ExchangeId } from "./types";
import { OrderStatus } from "./OrderStatus";
import { OrderEvent } from "./OrderEvent";
export declare type Order = {
    exchange: ExchangeId;
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
