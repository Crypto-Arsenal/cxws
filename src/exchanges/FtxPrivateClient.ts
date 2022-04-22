import { ClientOptions } from "../ClientOptions";
import { PrivateClientOptions } from "../PrivateClientOptions";
import { FtxBaseClient } from "./FtxBase";
import { FtxPrivateBaseClient } from "./FtxPrivateBase";

export class FtxPrivateClient extends FtxPrivateBaseClient {
    constructor({
        wssPath = "wss://ftx.com/ws",
        watcherMs,
        apiKey,
        apiSecret,
    }: PrivateClientOptions = {}) {
        super({ name: "FTX", apiKey, apiSecret, wssPath, watcherMs });
    }
}
