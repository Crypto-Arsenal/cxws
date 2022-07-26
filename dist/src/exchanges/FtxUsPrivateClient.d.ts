import { PrivateClientOptions } from "../PrivateClientOptions";
import { FtxPrivateBaseClient } from "./FtxPrivateBase";
export declare class FtxUsPrivateClient extends FtxPrivateBaseClient {
    constructor({ wssPath, watcherMs, apiKey, apiSecret, }?: PrivateClientOptions);
}
