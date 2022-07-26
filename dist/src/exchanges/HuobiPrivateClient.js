"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HuobiPrivateClient = void 0;
const HuobiPrivateBase_1 = require("./HuobiPrivateBase");
class HuobiPrivateClient extends HuobiPrivateBase_1.HuobiPrivateBase {
    constructor({ wssPath = "wss://api.huobi.pro/ws/v2", watcherMs, apiKey, apiSecret, } = {}) {
        super({ name: "Huobi", wssPath, watcherMs, apiKey, apiSecret });
    }
}
exports.HuobiPrivateClient = HuobiPrivateClient;
//# sourceMappingURL=HuobiPrivateClient.js.map