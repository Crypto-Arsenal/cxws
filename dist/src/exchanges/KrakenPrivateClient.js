"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KrakenPrivateClient = void 0;
/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const BasicPrivateClient_1 = require("../BasicPrivateClient");
const https = __importStar(require("../Https"));
const ccxt_1 = __importDefault(require("ccxt"));
/**
    Kraken's API documentation is availble at:
    https://www.kraken.com/features/websocket-api
    https://docs.kraken.com/websockets/#info
    https://docs.kraken.com/rest/#operation/getWebsocketsToken

    Once the socket is open you can subscribe to a channel by sending
    a subscribe request message.

    Ping is initiated by the client, not the server. This means
    we do not need to listen for pings events or respond appropriately.

    Requests take an array of pairs to subscribe to an event. This means
    when we subscribe or unsubscribe we need to send the COMPLETE list
    of active markets. BasicClient maintains the list of active markets
    in the various maps: _tickerSubs, _tradeSubs, _level2UpdateSubs.

    This client will retrieve the market keys from those maps to
    determine the remoteIds to send to the server on all sub/unsub requests.
  */
class KrakenPrivateClient extends BasicPrivateClient_1.BasicPrivateClient {
    constructor({ wssPath = "wss://ws-auth.kraken.com", autoloadSymbolMaps = true, watcherMs, apiKey = "", apiSecret = "", } = {}) {
        super(wssPath, "kraken", apiKey, apiSecret, "", undefined, watcherMs);
        this.hasPrivateOrders = true;
        this.subscriptionLog = new Map();
        this.debouceTimeoutHandles = new Map();
        this.debounceWait = 200;
        this.fromRestMap = new Map();
        this.fromWsMap = new Map();
        this.ccxt = new ccxt_1.default.kraken({
            apiKey,
            secret: apiSecret,
        });
        try {
            this.ccxt.checkRequiredCredentials();
        }
        catch (err) {
            this.emit("error", err);
        }
        if (autoloadSymbolMaps) {
            this.loadSymbolMaps().catch(err => this.emit("error", err));
        }
    }
    _sendUnsubPrivateOrders(subscriptionId, channel) {
        console.log("kraken _sendUnsubPrivateOrders");
        this._debounceSend("openOrders", this._privateOrderSubs, false, {
            name: "openOrders",
            token: this.apiToken,
        });
    }
    _sendSubPrivateOrders() {
        console.log("kraken _sendSubPrivateOrders");
        this._debounceSend("openOrders", this._privateOrderSubs, true, {
            name: "openOrders",
            token: this.apiToken,
        });
    }
    /**
    Kraken made the websocket symbols different
    than the REST symbols. Because CCXT uses the REST symbols,
    we're going to default to receiving REST symbols and mapping them
    to the corresponding WS symbol.

    In order to do this, we'll need to retrieve the list of symbols from
    the REST API. The constructor executes this.
   */
    async loadSymbolMaps() {
        const uri = "https://api.kraken.com/0/public/AssetPairs";
        const { result } = await https.get(uri);
        for (const symbol in result) {
            const restName = symbol;
            const wsName = result[symbol].wsname;
            if (wsName) {
                this.fromRestMap.set(restName, wsName);
                this.fromWsMap.set(wsName, restName);
            }
        }
    }
    /**
    Helper that retrieves the list of ws symbols from the supplied
    subscription map. The BasicClient manages the subscription maps
    when subscribe<Trade|Ticker|etc> is called and adds the records.
    This helper will take the values in a subscription map and
    convert them into the websocket symbols, ensuring that markets
    that are not mapped do not get included in the list.

    @param map subscription map such as _tickerSubs or _tradeSubs
   */
    _wsSymbolsFromSubMap(map) {
        const restSymbols = Array.from(map.keys());
        return restSymbols.map(p => this.fromRestMap.get(p)).filter(p => p);
    }
    /**
    Debounce is used to throttle a function that is repeatedly called. This
    is applicable when many calls to subscribe or unsubscribe are executed
    in quick succession by the calling application.
   */
    _debounce(type, fn) {
        clearTimeout(this.debouceTimeoutHandles.get(type));
        this.debouceTimeoutHandles.set(type, setTimeout(fn, this.debounceWait));
    }
    /**
    This method is called by each of the _send* methods.  It uses
    a debounce function on a given key so we can batch send the request
    with the active symbols. We also need to convert the rest symbols
    provided by the caller into websocket symbols used by the Kraken
    ws server.

    @param debounceKey unique key for the caller so each call
    is debounced with related calls
    @param subMap subscription map storing the current subs
    for the type, such as _tickerSubs, _tradeSubs, etc.
    @param subscribe true for subscribe, false for unsubscribe
    @param subscription the subscription name passed to the
    JSON-RPC call
   */
    _debounceSend(debounceKey, subMap, subscribe, subscription) {
        console.log("kraken _debounceSend");
        this._debounce(debounceKey, () => {
            const wsSymbols = this._wsSymbolsFromSubMap(subMap);
            if (!this._wss)
                return;
            this._wss.send(JSON.stringify({
                event: subscribe ? "subscribe" : "unsubscribe",
                subscription,
            }));
        });
    }
    _onMessage(raw) {
        const msgs = JSON.parse(raw);
        this._processsMessage(msgs);
    }
    /**
     * Fires before connect
     */
    _beforeConnect() {
        console.log("kraken", "beforeconnect");
        super._beforeConnect();
        //
    }
    /**
     * Set webscoket token from REST api before subscribing to private feeds
     */
    _onConnected() {
        console.log("kraken _onConnected, _sendAuthentication");
        this.ccxt
            .privatePostGetWebSocketsToken()
            .then(d => {
            if (d.result.token) {
                this.apiToken = d.result.token;
            }
            super._onConnected();
        })
            .catch(err => {
            this.emit("error", err);
        });
    }
    /**
    When a subscription is initiated, a subscriptionStatus event is sent.
    This message will be cached in the subscriptionLog for look up later.
    When messages arrive, they only contain the subscription id.  The
    id is used to look up the subscription details in the subscriptionLog
    to determine what the message means.
   */
    _processsMessage(msg) {
        if (msg.event === "heartbeat") {
            return;
        }
        if (msg.event === "systemStatus") {
            return;
        }
        // Capture the subscription metadata for use later.
        if (msg.event === "subscriptionStatus") {
            console.log("rando subscriptionStatus", msg);
            /*
            {
                channelName: 'openOrders',
                event: 'subscriptionStatus',
                status: 'subscribed',
                subscription: { maxratecount: 60, name: 'openOrders' }
            }
            */
            this.subscriptionLog.set(parseInt(msg.channelID), msg);
            return;
        }
        /**
     * [
[{"OQNU73-ZPVWZ-EICDW2":{"avg_price":"0.00000000","cost":"0.00000000","descr":{"close":null,"leverage":null,"order":"buy 2.50000000 ADA/USDT @ limit 1.12376000","ordertype":"limit","pair":"ADA/USDT","price":"1.12376000","price2":"0.00000000","type":"buy"},"expiretm":null,"fee":"0.00000000","limitprice":"0.00000000","misc":"","oflags":"fciq","opentm":"1644133459.730105","refid":null,"starttm":null,"status":"open","stopprice":"0.00000000","timeinforce":"GTC","userref":0,"vol":"2.50000000","vol_exec":"0.00000000"}},{"OXAWVP-WCYMK-7JF27K":{"avg_price":"0.00000","cost":"0.00000","descr":{"close":null,"leverage":null,"order":"buy 0.00100000 XBT/USDT @ limit 1.00000","ordertype":"limit","pair":"XBT/USDT","price":"1.00000","price2":"0.00000","type":"buy"},"expiretm":null,"fee":"0.00000","limitprice":"0.00000","misc":"","oflags":"fciq","opentm":"1644133366.808059","refid":null,"starttm":null,"status":"open","stopprice":"0.00000","timeinforce":"GTC","userref":0,"vol":"0.00100000","vol_exec":"0.00000000"}}] openOrders
[{"OXAWVP-WCYMK-7JF27K":{"lastupdated":"1644134121.715066","status":"canceled","vol_exec":"0.00000000","cost":"0.00000","fee":"0.00000","avg_price":"0.00000","userref":0,"cancel_reason":"User requested"}}] openOrders
     */
        // All messages from this point forward should arrive as an array
        if (!Array.isArray(msg)) {
            return;
        }
        const [subscriptionId, details] = msg;
        console.log(JSON.stringify(subscriptionId), details);
        return;
        const sl = this.subscriptionLog.get(subscriptionId);
        // If we don't have a subscription log entry for this event then
        // we need to abort since we don't know what to do with it!
        // From the subscriptionLog entry's pair, we can convert
        // the ws symbol into a rest symbol
        const remote_id = this.fromWsMap.get(sl.pair);
        // private orders
        if (sl.subscription.name === "openOrders") {
            const market = this._privateOrderSubs.get(remote_id);
            if (!market)
                return;
            this.emit("orders", details, market);
            // const ticker = this._constructTicker(details, market);
            // if (ticker) {
            // }
            return;
        }
    }
}
exports.KrakenPrivateClient = KrakenPrivateClient;
//# sourceMappingURL=KrakenPrivateClient.js.map