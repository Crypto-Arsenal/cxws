/// <reference types="node" />
import { BasicPrivateClient, PrivateChannelSubscription, PrivateChannelSubscriptionMap } from "../BasicPrivateClient";
import { kraken } from "ccxt";
import { PrivateClientOptions } from "../PrivateClientOptions";
export declare type KrakenClientOptions = PrivateClientOptions & {
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
export declare class KrakenPrivateClient extends BasicPrivateClient {
    ccxt: kraken;
    debounceWait: number;
    protected debouceTimeoutHandles: Map<string, NodeJS.Timeout>;
    protected subscriptionLog: Map<number, any>;
    protected fromRestMap: Map<string, string>;
    protected fromWsMap: Map<string, string>;
    constructor({ wssPath, autoloadSymbolMaps, watcherMs, apiKey, apiSecret, }?: KrakenClientOptions);
    protected _sendUnsubPrivateOrders(subscriptionId: string, channel: PrivateChannelSubscription): void;
    protected _sendSubPrivateOrders(): void;
    /**
    Kraken made the websocket symbols different
    than the REST symbols. Because CCXT uses the REST symbols,
    we're going to default to receiving REST symbols and mapping them
    to the corresponding WS symbol.

    In order to do this, we'll need to retrieve the list of symbols from
    the REST API. The constructor executes this.
   */
    loadSymbolMaps(): Promise<void>;
    /**
    Helper that retrieves the list of ws symbols from the supplied
    subscription map. The BasicClient manages the subscription maps
    when subscribe<Trade|Ticker|etc> is called and adds the records.
    This helper will take the values in a subscription map and
    convert them into the websocket symbols, ensuring that markets
    that are not mapped do not get included in the list.

    @param map subscription map such as _tickerSubs or _tradeSubs
   */
    protected _wsSymbolsFromSubMap(map: PrivateChannelSubscriptionMap): string[];
    /**
    Debounce is used to throttle a function that is repeatedly called. This
    is applicable when many calls to subscribe or unsubscribe are executed
    in quick succession by the calling application.
   */
    protected _debounce(type: string, fn: () => void): void;
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
    protected _debounceSend(debounceKey: string, subMap: PrivateChannelSubscriptionMap, subscribe: boolean, subscription: {
        name: string;
        [x: string]: any;
    }): void;
    protected _onMessage(raw: string): void;
    /**
     * Fires before connect
     */
    protected _beforeConnect(): void;
    /**
     * Set webscoket token from REST api before subscribing to private feeds
     */
    protected _onConnected(): void;
    /**
    When a subscription is initiated, a subscriptionStatus event is sent.
    This message will be cached in the subscriptionLog for look up later.
    When messages arrive, they only contain the subscription id.  The
    id is used to look up the subscription details in the subscriptionLog
    to determine what the message means.
   */
    protected _processsMessage(msg: any): Promise<void>;
}
