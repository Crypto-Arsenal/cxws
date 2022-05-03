import { BasicClient } from "./BasicClient";
import { BasicMultiClient } from "./BasicMultiClient";
import { SmartWss } from "./SmartWss";
import { Watcher } from "./Watcher";

import { Auction } from "./Auction";
import { BlockTrade } from "./BlockTrade";
import { Candle } from "./Candle";
import { CandlePeriod } from "./CandlePeriod";
import { Level2Point } from "./Level2Point";
import { Level2Snapshot } from "./Level2Snapshots";
import { Level2Update } from "./Level2Update";
import { Level3Point } from "./Level3Point";
import { Level3Snapshot } from "./Level3Snapshot";
import { Level3Update } from "./Level3Update";
import { Ticker } from "./Ticker";
import { Trade } from "./Trade";
import { Order } from "./Order";
import { BiboxClient } from "./exchanges/BiboxClient";
import { BinanceClient } from "./exchanges/BinanceClient";
import { BinancePrivateClient } from "./exchanges/BinancePrivateClient";
import { BinanceFuturesCoinmClient } from "./exchanges/BinanceFuturesCoinmClient";
import { BinanceFuturesUsdtmClient } from "./exchanges/BinanceFuturesUsdtmClient";
import { BinanceJeClient } from "./exchanges/BinanceJeClient";
import { BinanceUsClient } from "./exchanges/BinanceUsClient";
import { BitfinexClient } from "./exchanges/BitfinexClient";
import { BitgetPrivateClient } from "./exchanges/BitgetPrivateClient";
import { BitflyerClient } from "./exchanges/BitflyerClient";
import { BithumbClient } from "./exchanges/BithumbClient";
import { BitmexClient } from "./exchanges/BitmexClient";
import { BitstampClient } from "./exchanges/BitstampClient";
import { BittrexClient } from "./exchanges/BittrexClient";
import { CexClient } from "./exchanges/CexClient";
import { CryptoComPrivateClient } from "./exchanges/CryptoComPrivateClient";
import { CoinbaseProClient } from "./exchanges/CoinbaseProClient";
import { CoinexClient } from "./exchanges/CoinexClient";
import { DeribitClient } from "./exchanges/DeribitClient";
import { DigifinexClient } from "./exchanges/DigifinexClient";
import { ErisXClient } from "./exchanges/ErisxClient";
import { FtxClient } from "./exchanges/FtxClient";
import { FtxPrivateClient } from "./exchanges/FtxPrivateClient";
import { FtxUsClient } from "./exchanges/FtxUsClient";
import { GateioClient } from "./exchanges/GateioClient";
import { GeminiClient } from "./exchanges/Geminiclient";
import { HitBtcClient } from "./exchanges/HitBtcClient";
import { HuobiClient } from "./exchanges/HuobiClient";
import { HuobiPrivateClient } from "./exchanges/HuobiPrivateClient";
import { HuobiFuturesClient } from "./exchanges/HuobiFuturesClient";
import { HuobiJapanClient } from "./exchanges/HuobiJapanClient";
import { HuobiKoreaClient } from "./exchanges/HuobiKoreaClient";
import { HuobiSwapsClient } from "./exchanges/HuobiSwapsClient";
import { KrakenClient } from "./exchanges/KrakenClient";
import { KrakenPrivateClient } from "./exchanges/KrakenPrivateClient";
import { KucoinClient } from "./exchanges/KucoinClient";
import { LedgerXClient } from "./exchanges/LedgerXClient";
import { LiquidClient } from "./exchanges/LiquidClient";
import { OkexClient } from "./exchanges/OkexClient";
import { OkexPrivateClient } from "./exchanges/OkexPrivateClient";
import { PoloniexClient } from "./exchanges/PoloniexClient";
import { UpbitClient } from "./exchanges/UpbitClient";
import { ZbClient } from "./exchanges/ZbClient";
import { BinancePrivateBase } from "./exchanges/BinancePrivateBase";
import { BasicPrivateClient, PrivateChannelSubscription } from "./BasicPrivateClient";
import * as ccxt from "ccxt";

export const PrivateWSClient: { [key in ccxt.ExchangeId]: any } = {
    aax: null,
    ascendex: null,
    bequant: null,
    bibox: null,
    bigone: null,
    binance: BinancePrivateClient,
    binancecoinm: null,
    binanceus: null,
    binanceusdm: null,
    bit2c: null,
    bitbank: null,
    bitbay: null,
    bitbns: null,
    bitcoincom: null,
    bitfinex: null,
    bitfinex2: null,
    bitflyer: null,
    bitforex: null,
    bitget: BitgetPrivateClient,
    bithumb: null,
    bitmart: null,
    bitmex: null,
    bitpanda: null,
    bitrue: null,
    bitso: null,
    bitstamp: null,
    bitstamp1: null,
    bittrex: null,
    bitvavo: null,
    bl3p: null,
    blockchaincom: null,
    btcalpha: null,
    btcbox: null,
    btcmarkets: null,
    btctradeua: null,
    btcturk: null,
    buda: null,
    bw: null,
    bybit: null,
    bytetrade: null,
    cdax: null,
    cex: null,
    coinbase: null,
    coinbaseprime: null,
    coinbasepro: null,
    coincheck: null,
    coinex: null,
    coinfalcon: null,
    coinmate: null,
    coinone: null,
    coinspot: null,
    crex24: null,
    cryptocom: CryptoComPrivateClient,
    currencycom: null,
    delta: null,
    deribit: null,
    digifinex: null,
    eqonex: null,
    equos: null,
    exmo: null,
    flowbtc: null,
    fmfwio: null,
    ftx: FtxPrivateClient,
    ftxus: null,
    gateio: null,
    gemini: null,
    hitbtc: null,
    hitbtc3: null,
    hollaex: null,
    huobi: HuobiPrivateClient,
    huobijp: null,
    huobipro: null,
    idex: null,
    independentreserve: null,
    indodax: null,
    itbit: null,
    kraken: KrakenPrivateClient,
    kucoin: null,
    kucoinfutures: null,
    kuna: null,
    latoken: null,
    lbank: null,
    liquid: null,
    luno: null,
    lykke: null,
    mercado: null,
    mexc: null,
    ndax: null,
    novadax: null,
    oceanex: null,
    okcoin: null,
    okex: null,
    okex5: null,
    okx: null,
    paymium: null,
    phemex: null,
    poloniex: null,
    probit: null,
    qtrade: null,
    ripio: null,
    stex: null,
    therock: null,
    tidebit: null,
    tidex: null,
    timex: null,
    upbit: null,
    vcc: null,
    wavesexchange: null,
    wazirx: null,
    whitebit: null,
    woo: null,
    xena: null,
    yobit: null,
    zaif: null,
    zb: null,
    zipmex: null,
    zonda: null,
};

export {
    //
    // Base clients
    BasicClient,
    BasicMultiClient,
    SmartWss,
    Watcher,
    //
    // Event types
    Auction,
    BlockTrade,
    Candle,
    CandlePeriod,
    Level2Point,
    Level2Snapshot,
    Level2Update,
    Level3Point,
    Level3Snapshot,
    Level3Update,
    Ticker,
    Trade,
    Order,
    //
    // Clients
    BiboxClient,
    BinanceClient,
    BinancePrivateClient,
    BinanceFuturesCoinmClient,
    BinanceFuturesUsdtmClient,
    BinanceJeClient,
    BinanceUsClient,
    BitfinexClient,
    BitgetPrivateClient,
    BitflyerClient,
    BithumbClient,
    BitmexClient,
    BitstampClient,
    BittrexClient,
    CexClient,
    CryptoComPrivateClient,
    CoinbaseProClient,
    CoinexClient,
    DeribitClient,
    DigifinexClient,
    ErisXClient,
    FtxClient,
    FtxPrivateClient,
    FtxUsClient,
    GateioClient,
    GeminiClient,
    HitBtcClient,
    HuobiClient,
    HuobiPrivateClient,
    HuobiFuturesClient,
    HuobiSwapsClient,
    HuobiJapanClient,
    HuobiKoreaClient,
    KucoinClient,
    KrakenClient,
    KrakenPrivateClient,
    LedgerXClient,
    LiquidClient,
    OkexClient,
    OkexPrivateClient,
    PoloniexClient,
    UpbitClient,
    ZbClient,
};

/**
 * @deprecated Use named imports instead of default import. Client
 * names have also changed and are now suffixed with `Client`. Deprecation
 * warning added in v0.46.0 and will be removed in a future version.
 */
export default {
    Bibox: BiboxClient,
    Binance: BinanceClient,
    BinancePrivate: BinancePrivateClient,
    BinanceFuturesCoinM: BinanceFuturesCoinmClient,
    BinanceFuturesUsdtM: BinanceFuturesUsdtmClient,
    BinanceJe: BinanceJeClient,
    BinanceUs: BinanceUsClient,
    Bitfinex: BitfinexClient,
    Bitflyer: BitflyerClient,
    Bithumb: BithumbClient,
    BitMEX: BitmexClient,
    Bitstamp: BitstampClient,
    Bittrex: BittrexClient,
    Cex: CexClient,
    CoinbasePro: CoinbaseProClient,
    Coinex: CoinexClient,
    Deribit: DeribitClient,
    Digifinex: DigifinexClient,
    ErisX: ErisXClient,
    Ftx: FtxClient,
    FtxPrivate: FtxPrivateClient,
    FtxUs: FtxUsClient,
    Gateio: GateioClient,
    Gemini: GeminiClient,
    HitBTC: HitBtcClient,
    Huobi: HuobiClient,
    HuobiFutures: HuobiFuturesClient,
    HuobiSwaps: HuobiSwapsClient,
    HuobiJapan: HuobiJapanClient,
    HuobiKorea: HuobiKoreaClient,
    Kucoin: KucoinClient,
    Kraken: KrakenClient,
    KrakenPrivate: KrakenPrivateClient,
    LedgerX: LedgerXClient,
    Liquid: LiquidClient,
    OKEx: OkexClient,
    Poloniex: PoloniexClient,
    Upbit: UpbitClient,
    Zb: ZbClient,
};
