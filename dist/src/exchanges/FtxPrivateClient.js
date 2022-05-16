"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FtxPrivateClient = void 0;
const FtxPrivateBase_1 = require("./FtxPrivateBase");
class FtxPrivateClient extends FtxPrivateBase_1.FtxPrivateBaseClient {
    constructor({ wssPath = "wss://ftx.com/ws", watcherMs, apiKey, apiSecret, } = {}) {
        super({ name: "ftx", apiKey, apiSecret, wssPath, watcherMs });
    }
}
exports.FtxPrivateClient = FtxPrivateClient;
//# sourceMappingURL=FtxPrivateClient.js.map