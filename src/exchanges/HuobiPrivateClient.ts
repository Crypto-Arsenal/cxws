import { PrivateClientOptions } from "../PrivateClientOptions";
import { HuobiPrivateBase } from "./HuobiPrivateBase";

export class HuobiPrivateClient extends HuobiPrivateBase {
    constructor({
        wssPath = "wss://api.huobi.pro/ws/v2",
        watcherMs,
        apiKey,
        apiSecret,
    }: PrivateClientOptions = {}) {
        super({ name: "Huobi", wssPath, watcherMs, apiKey, apiSecret });
    }
}
