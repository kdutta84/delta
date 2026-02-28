var C = require("../model/Constant");

////////////////////////////////////////////////////
//                   Interfaces                   //
////////////////////////////////////////////////////

///////////////// Para Interface  //////////////////
const I_Para = {
  switch: C.none,
  initPara: C.none,
  currDelta: 0,
  orderType: C.market,
  priceType: C.maker,
  barType: C.option,
  strikeGap: 0,
  interval: C.none,
  timeframe: C.none,
  channel: C.none,
  msgSetting: C.fixed,
  layout: C.horizontal,
  chartLayout: C.horizontalHalf,
  mLayout: C.horizontal,
  factor: 0,
  scale: C.none,
  profit: 0,
  loss: 0,
  hold: 0,
  exit: 0,
  headerMiddle: C.message,
  profitTrail: { flag: false, per: 0 },
  lossTrail: { flag: false, per: 0 },
  account: {
    wallet: 0,
    amount: 5,
    per: 0,
    currency: C.usd,
  },
  expiry: {
    raw: 0,
    date: 0,
    time: 0,
    text: 0,
    symbol: 0,
    format: 0,
  },
  chart: {
    index: C.none,
    symbol: C.none,
    category: C.none,
    callSymbol: C.none,
    putSymbol: C.none,
    callStrike: C.none,
    putStrike: C.none,
    interval: 0,
    range: 0,
    startChart: 0,
    endChart: 0,
    startCandle: 0,
    endCandle: 0,
  },
  volume: {
    flag: false,
    type: C.average,
    per: 0,
    action: C.none,
  },
  oi: {
    flag: false,
    type: C.down,
    per: 0,
    action: C.none,
  },
  alarm: {
    flag: false,
    time: 0,
    repeatFlag: false,
    repeatCount: 0,
    delta: false,
    track: false,
    volume: false,
    oi: false,
  },
  track: {
    flag: false,
    time: 0,
    text: "",
    high: 0,
    low: 0,
  },
  buy: {
    flag: false,
    index: C.none,
    type: C.none,
    callSymbol: C.none,
    putSymbol: C.none,
  },
  buyDelta: { flag: false, type: C.up, value: 0 },
  trail: { flag: false, type: C.none, per: 0 },
  support: {
    flag: true,
    type: C.trail,
    per: 0,
  },
  supportDelta: {
    flag: false,
    type: C.candle,
    value: 0,
  },
  addon: {
    flag: true,
    value: 1,
    per: 0,
  },
  sell: {
    support: { flag: false, count: 0, action: C.alert },
    addon: { flag: false, count: 0, action: C.alert },
    delta: { flag: false, count: 0, action: C.alert },
    reversal: { flag: false, count: 0, action: C.alert },
  },
  notify: {
    email: false,
    whatsapp: false,
    firebase: false,
  },
};

////////////////// Buy Interface //////////////////
const I_Buy = {
  flag: false,
  mode: C.none,
  display: false,
  timestamp: 0,
  index: C.none,
  type: C.none,
  direction: C.none,
  lotsize: 0,
  amount: 0,
  pnl: 0,
  max: 0,
  min: 0,
  fromMax: 0,
  fromMin: 0,
  supportFlag: false,
  support: 0,
  supportPer: 0,
  addonCount: 0,
  addonPer: 0,
  slippage: 0,
  slippagePer: 0,
  reverse: 0,
  call: {
    flag: false,
    symbol: C.none,
    type: C.call,
    category: C.none,
    addon: false,
    candle: {
      open: 0,
      high: 0,
      low: 0,
      close: 0,
      buyPer: 0,
      candlePer: 0,
    },
    pnl: {
      buy: 0,
      qty: 0,
      ltp: 0,
      per: 0,
      usd: 0,
      buySlp: 0,
      sellSlp: 0,
    },
    window: {
      status: false,
      buy: 0,
      green: 0,
      orange: 0,
      red: 0,
      topColor: C.none,
      bottomColor: C.none,
    },
  },
  put: {
    flag: false,
    symbol: C.none,
    type: C.put,
    category: C.none,
    addon: false,
    candle: {
      open: 0,
      high: 0,
      low: 0,
      close: 0,
      buyPer: 0,
      candlePer: 0,
    },
    pnl: {
      buy: 0,
      qty: 0,
      ltp: 0,
      per: 0,
      usd: 0,
      buySlp: 0,
      sellSlp: 0,
    },
    window: {
      status: false,
      buy: 0,
      green: 0,
      orange: 0,
      red: 0,
      topColor: C.none,
      bottomColor: C.none,
    },
  },
  delta: {
    buyCandle: {
      open: 0,
      high: 0,
      low: 0,
      close: 0,
    },
    candle: {
      open: 0,
      high: 0,
      low: 0,
      close: 0,
    },
    window: {
      status: false,
      buy: 0,
      high: 0,
      low: 0,
      color: C.none,
      target: 0,
      direction: C.up,
      gap: 0,
    },
  },
  addon: {
    flag: false,
    parent: false,
    symbol: C.none,
    type: C.none,
    category: C.none,
    pnl: {
      buy: 0,
      qty: 0,
      ltp: 0,
      per: 0,
      usd: 0,
      buySlp: 0,
      sellSlp: 0,
    },
  },
  capture: {
    call: 0,
    put: 0,
    delta: 0,
    callPer: 0,
    putPer: 0,
    deltaChg: 0,
  },
};

////////////////// Track Interface //////////////////
const I_Track = {
  index: C.none,
  symbol: C.none,
  type: C.none,
  strike: 0,
  open: 0,
  high: 0,
  low: 0,
  close: 0,
  fromHigh: 0,
  fromLow: 0,
};

////////////////// Bar Strikes Interface //////////////
const I_BarStrikes = {
  strike: {
    btcCall: 0,
    btcPut: 0,
    ethCall: 0,
    ethPut: 0,
  },
  symbol: {
    btcCall: 0,
    btcPut: 0,
    ethCall: 0,
    ethPut: 0,
  },
};

//////////////////// Data Interface ////////////////
const I_Data = {
  chart: {
    market: {},
    call: {},
    put: {},
    delta: {},
  },
  bar: {
    market: [0, 0],
    call: [0, 0],
    delta: [0, 0],
    put: [0, 0],
  },
  track: {},
  buy: {},
  flags: {
    busy: null,
    busyProcess: C.none,
    para: false,
    strike: false,
    chart: false,
    track: false,
    buy: false,
  },
};

//////////////////// Volume Interface ////////////////
const I_Volume = {
  flag: false,
  btc: {
    flag: false,
    cond: 0,
    per: 0,
  },
  eth: {
    flag: false,
    cond: 0,
    per: 0,
  },
};

////////////// Deep Freeze Interfaces ///////////////
deepFreeze(I_Para);
deepFreeze(I_Buy);
deepFreeze(I_Track);
deepFreeze(I_BarStrikes);
deepFreeze(I_Data);
deepFreeze(I_Volume);

////////////////////////////////////////////////////
// Declare Interface Variables
////////////////////////////////////////////////////
const Para = JSON.parse(JSON.stringify(I_Para));
const Buy = JSON.parse(JSON.stringify(I_Buy));
const Track = JSON.parse(JSON.stringify(I_Track));
const Data = JSON.parse(JSON.stringify(I_Data));
const BarStrikes = JSON.parse(JSON.stringify(I_BarStrikes));

////////////// Deep Seal Parents ///////////////
deepSeal(Para);
deepSeal(Buy);
deepSeal(Track);
deepSeal(Data);
deepSeal(BarStrikes);

////////////////////////////////////////////////////
// Destructure Into Variables
////////////////////////////////////////////////////
const {
  profitTrail: P_ProfitTrail,
  lossTrail: P_LossTrail,
  account: P_Account,
  support: P_Support,
  addon: P_Addon,
  trail: P_Trail,
  expiry: P_Expiry,
  chart: P_Chart,
  track: P_Track,
  buy: P_Buy,
  volume: P_Volume,
  oi: P_Oi,
  alarm: P_Alarm,
  buyDelta: P_BuyDelta,
  supportDelta: P_SupportDelta,
  sell: {
    support: P_SellSupport,
    delta: P_SellDelta,
    addon: P_SellAddon,
    reversal: P_SellReversal,
  },
  notify: P_Notify,
} = Para;

const {
  call: BuyCall,
  put: BuyPut,
  delta: BuyDelta,
  addon: BuyAddon,
  capture: BuyCapture,
  call: { candle: CallCandle, pnl: CallPnl, window: CallWindow },
  put: { candle: PutCandle, pnl: PutPnl, window: PutWindow },
  delta: {
    buyCandle: DeltaBuyCandle,
    candle: DeltaCandle,
    window: DeltaWindow,
  },
  addon: { pnl: AddonPnl },
} = Buy;

const Ticker = {
  category: 0,
  index: 0,
  symbol: 0,
  strike: 0,
  type: 0,
  open: 0,
  high: 0,
  low: 0,
  close: 0,
  volume: 0,
  oi: 0,
  per: 0,
};

const Trn = {
  flag: false,
  parent: 0,
  buyTime: 0,
  sellTime: 0,
  symbol: C.none,
  trnType: C.none,
  icon: C.none,
  buy: 0,
  ltp: 0,
  per: 0,
};

const Alert = {
  time: 0,
  trigger: C.none,
  action: C.none,
  index: C.none,
  output: 0,
};

const Backtest = {
  flag: false,
  inc: 0,
  callSymbol: "",
  callLtp: 0,
  putSymbol: "",
  putLtp: 0,
};

const oDelta = {},
  btcCandle = {},
  ethCandle = {},
  lastMsg = {},
  aData = [],
  aSubscribed = [],
  aUnSubscribed = [],
  aTimeAxis = [],
  aMessage = [],
  aAllMsg = [],
  aTrack = [],
  aTrn = [],
  aAlert = [],
  aOpenPosition = [],
  aBtcVolume = [],
  aEthVolume = [],
  aRecords = [],
  aItems = [],
  aAllIndex = [C.btc, C.eth],
  aMarketSymbols = [C.btcSymbol, C.ethSymbol],
  serverStart = 0,
  buyMax = 0,
  buyMin = 0;

let appAction = C.none,
  isTracking = false,
  busyFlag = null,
  busyProcess = C.none,
  paraFlag = false,
  strikeFlag = false,
  chartFlag = false,
  candleFlag = false,
  trackFlag = false,
  buyFlag = false,
  msgFlag = false,
  recordModel,
  historyModel,
  transporter,
  mailOptions;

///////////////// Seal Childs //////////////////
Object.seal(P_ProfitTrail);
Object.seal(P_LossTrail);
Object.seal(P_Account);
Object.seal(P_Support);
Object.seal(P_Addon);
Object.seal(P_Trail);
Object.seal(P_Expiry);
Object.seal(P_Chart);
Object.seal(P_Track);
Object.seal(P_Buy);
Object.seal(P_Volume);
Object.seal(P_Oi);
Object.seal(P_Alarm);
Object.seal(P_BuyDelta);
Object.seal(P_SupportDelta);

Object.seal(BuyCall);
Object.seal(BuyPut);
Object.seal(BuyDelta);
Object.seal(BuyAddon);
Object.seal(BuyCapture);
Object.seal(CallCandle);
Object.seal(CallPnl);
Object.seal(CallWindow);
Object.seal(PutCandle);
Object.seal(PutPnl);
Object.seal(PutWindow);
Object.seal(DeltaBuyCandle);
Object.seal(DeltaCandle);
Object.seal(DeltaWindow);

Object.seal(Trn);
Object.seal(Alert);
Object.seal(Backtest);

///////////////// Deep Freeze Function //////////////////
function deepFreeze(object) {
  // Retrieve the property names defined on object
  const propNames = Object.getOwnPropertyNames(object);

  // Freeze properties before freezing self
  for (const name of propNames) {
    const value = object[name];

    // Check if value is an object and not null, then recursively deep freeze it
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
}

///////////////// Deep Seal Function //////////////////
function deepSeal(object) {
  // Check if the value is an object (arrays are objects in JS) and not null
  if (
    typeof object === "object" &&
    object !== null &&
    !Object.isSealed(object)
  ) {
    // Recursively seal nested properties first
    for (const key in object) {
      if (object.hasOwnProperty(key)) {
        deepSeal(object[key]);
      }
    }
    // Seal the current object
    Object.seal(object);
  }
}

////////////////////////////////////////////////////
// Export Module
////////////////////////////////////////////////////
module.exports = {
  // Interfaces
  I_Para,
  I_Buy,
  I_Track,
  I_BarStrikes,
  I_Data,
  I_Volume,

  // Clones
  Para,
  Buy,
  Track,
  BarStrikes,

  // Destructured
  P_ProfitTrail,
  P_LossTrail,
  P_Account,
  P_Support,
  P_Addon,
  P_Trail,
  P_Expiry,
  P_Chart,
  P_Track,
  P_Buy,
  P_Volume,
  P_Oi,
  P_Alarm,
  P_BuyDelta,
  P_SupportDelta,
  P_SellSupport,
  P_SellDelta,
  P_SellAddon,
  P_SellReversal,
  P_Notify,

  BuyCall,
  BuyPut,
  BuyDelta,
  BuyAddon,
  BuyCapture,
  CallCandle,
  CallPnl,
  CallWindow,
  PutCandle,
  PutPnl,
  PutWindow,
  DeltaBuyCandle,
  DeltaCandle,
  DeltaWindow,
  AddonPnl,

  // Variables
  Data,
  Ticker,
  Trn,
  Alert,
  Backtest,
  appAction,
  oDelta,
  isTracking,

  busyFlag,
  busyProcess,
  paraFlag,
  strikeFlag,
  chartFlag,
  candleFlag,
  trackFlag,
  buyFlag,
  msgFlag,

  // Arrays
  aData,
  aSubscribed,
  aUnSubscribed,
  aTimeAxis,
  aMessage,
  aAllMsg,
  aTrack,
  aTrn,
  aAlert,
  aOpenPosition,
  aBtcVolume,
  aEthVolume,
  aRecords,
  aItems,
  aAllIndex,
  aMarketSymbols,
  serverStart,
  buyMax,
  buyMin,

  // Database
  recordModel,
  historyModel,
};
