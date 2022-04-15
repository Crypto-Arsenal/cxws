export enum OrderStatus {
    NEW = "NEW",
    PARTIALLY_FILLED = "PARTIALLY_FILLED",
    FILLED = "FILLED",
    CANCELED = "CANCELED",
    PENDING_CANCEL = "CANCELING", // currently unused
    REJECTED = "REJECTED",
    EXPIRED = "EXPIRED",
}
