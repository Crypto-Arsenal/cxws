"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FtxUsPrivateClient = void 0;
const FtxPrivateBase_1 = require("./FtxPrivateBase");
class FtxUsPrivateClient extends FtxPrivateBase_1.FtxPrivateBaseClient {
    constructor({ wssPath = "wss://ftx.us/ws", watcherMs, apiKey, apiSecret, } = {}) {
        super({ name: "ftxus", apiKey, apiSecret, wssPath, watcherMs });
    }
}
exports.FtxUsPrivateClient = FtxUsPrivateClient;
//# sourceMappingURL=FtxUsPrivateClient.js.map