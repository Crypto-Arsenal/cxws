import { PrivateClientOptions } from "../PrivateClientOptions";
import { HuobiPrivateBase } from "./HuobiPrivateBase";
export declare class HuobiPrivateClient extends HuobiPrivateBase {
    constructor({ wssPath, watcherMs, apiKey, apiSecret, }?: PrivateClientOptions);
}
