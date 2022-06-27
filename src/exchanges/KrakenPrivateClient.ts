/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
    BasicPrivateClient,
    PrivateChannelSubscription,
    PrivateChannelSubscriptionMap,
} from "../BasicPrivateClient";
import * as https from "../Https";
import ccxt from "ccxt";
import { PrivateClientOptions } from "../PrivateClientOptions";
import { OrderStatus } from "../OrderStatus";
import { Order } from "../Order";

export type KrakenClientOptions = PrivateClientOptions & {
    autoloadSymbolMaps?: boolean;
};

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
export class KrakenPrivateClient extends BasicPrivateClient {
    public ccxt: ccxt.kraken;

    public debounceWait: number;

    protected debouceTimeoutHandles: Map<string, NodeJS.Timeout>;
    protected subscriptionLog: Map<number, any>;
    protected fromRestMap: Map<string, string>;
    protected fromWsMap: Map<string, string>;

    constructor({
        wssPath = "wss://ws-auth.kraken.com",
        autoloadSymbolMaps = true,
        watcherMs,
        apiKey = "",
        apiSecret = "",
    }: KrakenClientOptions = {}) {
        super(wssPath, "kraken", apiKey, apiSecret, "", undefined, watcherMs);

        this.hasPrivateOrders = true;

        this.subscriptionLog = new Map();
        this.debouceTimeoutHandles = new Map();
        this.debounceWait = 200;

        this.fromRestMap = new Map();
        this.fromWsMap = new Map();

        this.ccxt = new ccxt.kraken({
            apiKey,
            secret: apiSecret,
        });

        try {
            this.ccxt.checkRequiredCredentials();
        } catch (err) {
            this.emit("error", err);
        }

        if (autoloadSymbolMaps) {
            this.loadSymbolMaps().catch(err => this.emit("error", err));
        }
    }

    protected _sendUnsubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription) {
        console.log("kraken _sendUnsubPrivateOrders");
        this._debounceSend("openOrders", this._privateOrderSubs, false, {
            name: "openOrders",
            token: this.apiToken,
        });
    }

    protected _sendSubPrivateOrders() {
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
    public async loadSymbolMaps() {
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
    protected _wsSymbolsFromSubMap(map: PrivateChannelSubscriptionMap) {
        const restSymbols = Array.from(map.keys());
        return restSymbols.map(p => this.fromRestMap.get(p)).filter(p => p);
    }

    /**
    Debounce is used to throttle a function that is repeatedly called. This
    is applicable when many calls to subscribe or unsubscribe are executed
    in quick succession by the calling application.
   */
    protected _debounce(type: string, fn: () => void) {
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
    protected _debounceSend(
        debounceKey: string,
        subMap: PrivateChannelSubscriptionMap,
        subscribe: boolean,
        subscription: { name: string; [x: string]: any },
    ) {
        console.log("kraken _debounceSend");

        this._debounce(debounceKey, () => {
            const wsSymbols = this._wsSymbolsFromSubMap(subMap);
            if (!this._wss) return;
            this._wss.send(
                JSON.stringify({
                    event: subscribe ? "subscribe" : "unsubscribe",
                    subscription,
                }),
            );
        });
    }

    protected _onMessage(raw: string) {
        const msgs = JSON.parse(raw);
        this._processsMessage(msgs);
    }

    /**
     * Fires before connect
     */
    protected _beforeConnect() {
        console.log("kraken", "beforeconnect");
        super._beforeConnect();
        //
    }

    /**
     * Set webscoket token from REST api before subscribing to private feeds
     */
    protected _onConnected() {
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
    protected async _processsMessage(msg: any) {
        console.log('_processsMessage', msg)
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

        const [dictionary, channelName] = msg;
        if (channelName == 'openOrders') {
            for (const e of dictionary) {
                for (const [orderId, order] of Object.entries(e) as [string, any]) {
                    console.log(orderId, order);
                    if (order?.status == 'pending') {
                        console.log(`not going to update with status ${order?.status}`);
                        continue;
                    }
                    let fetchedOrder;
                    try {
                        fetchedOrder = await this.ccxt.fetchOrder(orderId, '');
                    } catch (err) {
                        console.log('fetchOrder error', err);
                        continue;
                    }
                    console.log('fetchedOrder', fetchedOrder);

                    const isSell = fetchedOrder.side.toLowerCase() == "sell";
                    let amount = Math.abs(Number(fetchedOrder.amount || 0));
                    const amountFilled = Math.abs(Number(fetchedOrder.filled || 0));
                    const price = Number(fetchedOrder.average || 0) || Number(fetchedOrder.price || 0);
                    let status: any = fetchedOrder.status;
                    // map to our status
                    if (status === "open") {
                        if (amountFilled != 0) {
                            status = OrderStatus.PARTIALLY_FILLED;
                        } else {
                            status = OrderStatus.NEW;
                        }
                    } else if (status === "closed") {
                        status = OrderStatus.FILLED;
                    } else if (status === "canceled") {
                        status = OrderStatus.CANCELED;
                    } else {
                        // SKIP rejected
                        console.log(`not going to update with status ${status}`);
                        continue;
                    }

                    const change = {
                        exchange: this.name,
                        pair: fetchedOrder.symbol,
                        exchangeOrderId: fetchedOrder.id,
                        status: status,
                        msg: status,
                        price: price,
                        amount: isSell ? -amount : amount,
                        amountFilled: isSell ? -amountFilled : amountFilled,
                        commissionAmount: Number(fetchedOrder.fee.cost),
                        commissionCurrency: fetchedOrder.fee.currency,
                    } as Order;

                    this.emit("orders", change);
                }
            }
        }
    }
}
