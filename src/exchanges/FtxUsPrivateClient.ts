import { ClientOptions } from "../ClientOptions";
import { PrivateClientOptions } from "../PrivateClientOptions";
import { FtxBaseClient } from "./FtxBase";
import { FtxPrivateBaseClient } from "./FtxPrivateBase";

export class FtxUsPrivateClient extends FtxPrivateBaseClient {
    constructor({
        wssPath = "wss://ftx.us/ws",
        watcherMs,
        apiKey,
        apiSecret,
    }: PrivateClientOptions = {}) {
        super({ name: "ftxus", apiKey, apiSecret, wssPath, watcherMs });
    }
}
