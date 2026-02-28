var M = require("../model/Model");
var C = require("../model/Constant");
var Fs = require("fs");
const env = require("dotenv").config();
const { MongoClient } = require("mongodb");
const nodemailer = require("nodemailer");
const { NtfyClient } = require("ntfy");
const { unsubscribe } = require("diagnostics_channel");
const ntfyClient = new NtfyClient("https://notify.coinpress.cloud");

async function initPara() {
  try {
    switch (M.Para.initPara) {
      case C.database:
        setDefaultPara();
        updateLog(C.para);
        addMessage(C.info, "Parameter Initialized => Model", C.P3);
        break;
      case C.log:
        let paraLog = await readLog(C.para);
        if (isJSON(paraLog)) {
          M.Para = { ...JSON.parse(paraLog) };
          M.Para.initPara = C.log;
          initExpiryPara();
          initChartPara();
          initTimeArray();
        } else {
          M.Para.initPara = C.none;
          initPara();
        }
        break;
      default:
        setDefaultPara();
        updateLog(C.para);
        addMessage(C.info, "Parameter Initialized => Model", C.P3);
    }
  } catch (error) {
    addMessage(C.error, findMsg(error), C.P1);
  }
}

async function checkNewCandle() {
  // End Candle
  if (getCurrentTime() <= M.P_Chart.endCandle) {
    return false;
  }

  // Validate Chart Expiry for Buy Order
  if (getCurrentTime() >= M.expiryAlert && M.Buy.flag == true) {
    addMessage(C.error, "Chart Expiry => Please Sell Order", C.P1);
    notifyMe(
      C.notify_alert,
      "Chart Expiry => Please Sell Order",
      C.notify_high,
    );
  }

  // End Chart
  if (getCurrentTime() >= M.P_Chart.endChart) {
    // Init Expiry
    initExpiryPara();
    // Restart Process
    await restartProcess();
    return;
  }

  // New Candle Actions
  updateChartTime();
  moveDataCandles();
  moveBuyCandles();
  resetDeltaCandle();
  moveDeltaWindow();
  deleteOldMessages();

  if (M.Buy.flag == false) {
    // Update Option Strikes
    await updateOptionStrikes();
    // Update Display Chart
    updateChartSymbols();
  }

  // Check Alarm Trigger
  checkAlarmTrigger();

  // Check Volume Trigger
  checkVolumeTrigger();

  // Check Volume Trigger
  checkOiTrigger();

  M.paraFlag = true;

  return true;
}

function resetDeltaCandle() {
  resetWithRef(M.DeltaCandle, M.I_Buy.delta.candle);
}

function checkAlarmTrigger() {
  if (
    M.P_Alarm.flag === false ||
    M.P_Alarm?.time === undefined ||
    M.Para.switch !== C.none ||
    getCurrentTime() < M.P_Alarm?.time
  ) {
    return;
  }

  // Do not Check, if Buy Exists
  if (M.Buy.flag === true) {
    return;
  }

  if (M.P_Alarm.delta === true) {
    M.P_BuyDelta.flag = true;
  }
  if (M.P_Alarm.track === true) {
    M.P_Track.flag = true;
    M.P_Track.time = M.P_Alarm.time;
    M.trackFlag = true;
  }
  if (M.P_Alarm.volume === true) {
    M.P_Volume.flag = true;
  }
  if (M.P_Alarm.oi === true) {
    M.P_Oi.flag = true;
  }

  if (M.P_Alarm.repeatFlag === true && M.P_Alarm.repeatCount > 0) {
    M.P_Alarm.repeatCount = M.P_Alarm.repeatCount - 1;
  } else {
    resetWithRef(M.P_Alarm, M.I_Para.alarm);
  }

  M.Para.switch = C.test;

  M.paraFlag = true;

  addMessage(C.info, "Alarm Trigger => Check Alert", C.P1);
  performAction(C.alarm, C.alert, C.both, C.track);
}

async function checkVolumeTrigger() {
  let flag = false,
    buyType = C.none;

  if (M.P_Volume.flag === false) {
    return;
  }
  var history = await getMarketHistory();
  var btcHistory = history[0];
  var ethHistory = history[1];
  // Volume Average
  if (M.P_Volume.type === C.average) {
    // BTC
    flag = checkVolumeAverage(btcHistory);

    if (flag === true) {
      buyType = getBuyType(C.btc);
      performAction(C.volume, M.P_Volume.action, C.btc, buyType);
    }
    // ETH
    flag = checkVolumeAverage(ethHistory);
    if (flag === true) {
      buyType = getBuyType(C.eth);
      performAction(C.volume, M.P_Volume.action, C.eth, buyType);
    }
  }

  // Volume Percentage
  if (M.P_Volume.type === C.percentage) {
    // BTC
    flag = checkVolumePercentage(btcHistory);

    if (flag === true) {
      buyType = getBuyType(C.btc);
      performAction(C.volume, M.P_Volume.action, C.btc, buyType);
    }
    // ETH
    flag = checkVolumePercentage(ethHistory);
    if (flag === true) {
      buyType = getBuyType(C.eth);
      performAction(C.volume, M.P_Volume.action, C.eth, buyType);
    }
  }
}

function getBuyType(Index) {
  let buyType;
  let callTicker = M.aData.find(
    (row) => row.index === Index && row.type === C.call,
  );
  let putTicker = M.aData.find(
    (row) => row.index === Index && row.type === C.put,
  );

  if (callTicker !== undefined && putTicker !== undefined) {
    if (callTicker.per > putTicker.per) {
      buyType = C.call;
    } else {
      buyType = C.put;
    }
  }
  return buyType;
}

async function performAction(Trigger, Action, Index, Type) {
  // Alert
  setAlert(Trigger, Action, Index, Type);

  // Buy Option
  if (Action === C.buy) {
    if (M.Buy.flag === true) {
      addMessage(C.error, "Buy => BuyOrder Exists", C.P1);
      return;
    }

    M.P_Buy.flag = true;
    M.P_Buy.index = Index;
    M.P_Buy.type = Type;

    let callTicker = M.aData.find(
      (item) =>
        item.category === C.option &&
        item.index === Index &&
        item.type === C.call,
    );
    if (callTicker !== undefined) {
      M.P_Buy.callSymbol = callTicker.symbol;
    }

    let putTicker = M.aData.find(
      (item) =>
        item.category === C.option &&
        item.index === Index &&
        item.type === C.put,
    );
    if (callTicker !== undefined) {
      M.P_Buy.putSymbol = putTicker.symbol;
    }

    addMessage(C.info, "Buy => Trigger : " + Trigger, C.P2);
    // await Buy.initBuy();
    // As Buy File Cannot be called from Helper
    M.appAction = "BuyChart";
  }

  // Sell Option
  if (Action === C.sell) {
    if (M.Buy.flag === false) {
      addMessage(C.error, "Sell => BuyOrder Dont Exists", C.P1);
      return;
    }
    if (M.Buy.index !== Index) {
      addMessage(C.error, "Sell => Invalid Sell Order", C.P1);
      return;
    }

    addMessage(C.info, "Sell => Trigger : " + Trigger, C.P2);
    // sellBoth();
    // As Buy File Cannot be called from Helper
    M.appAction = "SellBoth";
  }

  resetTrigger(Trigger);
}

function resetTrigger(Trigger) {
  switch (Trigger) {
    case "BuyDelta":
      M.P_BuyDelta.flag = false;
      break;
    case "Track":
      M.P_Track.flag = false;
      break;
    case "Alarm":
      if (M.P_Alarm.repeatCount < 0) {
        M.P_Alarm.flag = false;
      }
      break;
    case "Volume":
      M.P_Volume.flag = false;
      break;
    case "Oi":
      M.P_Oi.flag = false;
      break;
  }
  M.paraFlag = true;
}

function setAlert(Trigger, Action, Index, Type) {
  let alert = {};
  alert.time = getCurrentTimeText();
  alert.trigger = Trigger;
  alert.action = Action;
  alert.index = Index;
  alert.type = Type;
  // Update Alert Info
  switch (Trigger) {
    case C.reverse:
      alert.type = M.P_SellReversal.count;
      break;
    case C.delta:
      alert.type = M.P_SellDelta.count;
      break;
    case C.support:
      alert.type = M.P_SellSupport.count;
      break;
    case C.addon:
      alert.type = M.P_SellAddon.count;
      break;
    case C.alarm:
      alert.type = 0;
      if (M.P_Alarm.repeatFlag === true) {
        alert.type = M.P_Alarm.repeatCount + 1;
      }
      break;
    case C.volume:
      if (M.P_Volume.type === C.average) {
        alert.type = "~ " + M.P_Volume.per;
      } else {
        alert.type = "% " + M.P_Volume.per;
      }
      break;
    case C.oi:
      if (M.P_Oi.type === C.up) {
        alert.type = "> " + M.P_Oi.per;
      } else {
        alert.type = "< " + M.P_Oi.per;
      }

      break;
  }

  M.aAlert.push(alert);
  M.alertFlag = true;

  // Helper.notifyMe(
  //   C.notify_alert,
  //   alert.trigger +
  //     " | " +
  //     alert.action +
  //     " | " +
  //     alert.index +
  //     " | " +
  //     alert.type,
  // );
}

function clearAlert() {
  M.aAlert = [];
}

function checkVolumeAverage(History) {
  let totalVol = 0,
    avgVol = 0,
    len = 0,
    vol = 0;

  vol = History.pop()[5];
  len = History.length;

  for (let i = 0; i < len; i++) {
    totalVol = totalVol + History[i][5];
  }
  avgVol = totalVol / len;

  if (vol > avgVol + (avgVol * M.P_Volume.per) / 100) {
    return true;
  } else {
    return false;
  }
}

function checkVolumePercentage(History) {
  let from = 0,
    len = 0,
    to = 0,
    per = 0;

  len = History.length - 1;
  to = History[len][5];
  from = to;

  for (let i = len; i > 0; i--) {
    if (M.P_Volume.per > 0) {
      if (History[i][5] > from) {
        break;
      }
      from = History[i][5];
    } else if (M.P_Volume.per < 0) {
      if (History[i][5] < from) {
        break;
      }
      from = History[i][5];
    }
  }

  per = getPercentage(from, to);

  if (
    (M.P_Volume.per > 0 && per > M.P_Volume.per) ||
    (M.P_Volume.per < 0 && per < M.P_Volume.per)
  ) {
    return true;
  } else {
    return false;
  }
}

async function checkOiTrigger() {
  // Code Pending
  let flag = false,
    buyType = C.none;

  if (M.P_Oi.flag === false) {
    return;
  }

  var history = await getMarketOiHistory();

  var btcHistory = history[0];
  var ethHistory = history[1];
  // OI Up
  if (M.P_Oi.type === C.up) {
    // BTC
    flag = checkOiUp(btcHistory);
    if (flag === true) {
      buyType = getBuyType(C.btc);
      performAction(C.oi, M.P_Oi.action, C.btc, buyType);
    }
    // ETH
    flag = checkOiUp(ethHistory);
    if (flag === true) {
      buyType = getBuyType(C.eth);
      performAction(C.oi, M.P_Oi.action, C.eth, buyType);
    }
  }

  // OI Down
  if (M.P_Oi.type === C.down) {
    // BTC
    flag = checkOiDown(btcHistory);
    if (flag === true) {
      buyType = getBuyType(C.btc);
      performAction(C.volume, M.P_Oi.action, C.btc, buyType);
    }
    // ETH
    flag = checkOiDown(ethHistory);
    if (flag === true) {
      buyType = getBuyType(C.eth);
      performAction(C.volume, M.P_Oi.action, C.eth, buyType);
    }
  }
}

function checkOiUp(History) {
  let totalPer = 0;
  for (let i = 0; i < History.length; i++) {
    const history = History[i];
    let per = getPercentage(history.open, history.close);
    if (per > 0) {
      totalPer = totalPer + per;
    } else {
      break;
    }
  }
  if (Math.abs(totalPer) > M.P_Oi.per) {
    return true;
  } else {
    return false;
  }
}

function checkOiDown(History) {
  let totalPer = 0;
  for (let i = 0; i < History.length; i++) {
    const history = History[i];
    let per = getPercentage(history.open, history.close);
    if (per < 0) {
      totalPer = totalPer + per;
    } else {
      break;
    }
  }
  if (Math.abs(totalPer) > M.P_Oi.per) {
    return true;
  } else {
    return false;
  }
}

function initDeltaWindow() {
  M.DeltaWindow.status = true;
  M.DeltaWindow.buy = M.DeltaCandle.close;
  updateDeltaWindow();
}

function updateDeltaWindow() {
  if (M.DeltaWindow.status === false) {
    return;
  }
  updateDeltaWindowGap();
  setDeltaWindow();
  captureBuy();
}

function moveBuyCandles() {}

function moveDataCandles() {
  for (let i = 0; i < M.aData.length; i++) {
    let ticker = M.aData[i];
    ticker.open = ticker.close;
    ticker.high = ticker.close;
    ticker.low = ticker.close;
    ticker.per = 0;
  }
}

function moveDeltaWindow() {
  if (M.P_SupportDelta.flag === false) {
    return;
  }

  let move = M.DeltaWindow.high;

  M.DeltaWindow.target = formatDecimal(M.DeltaWindow.target - move);
  M.DeltaWindow.high = formatDecimal(M.DeltaWindow.high - move);
  M.DeltaWindow.low = formatDecimal(M.DeltaWindow.low - move);
}

function updateDeltaWindowGap() {
  let inc = (Math.abs(M.P_SupportDelta.value) * M.P_Addon.per) / 100;
  // Update Delta Window Gap
  switch (M.DeltaWindow.direction) {
    case C.up:
      if (M.DeltaCandle.close > M.DeltaWindow.target) {
        M.DeltaWindow.gap = M.DeltaWindow.gap + inc;
      }
      if (M.DeltaCandle.close < M.DeltaWindow.low) {
        M.DeltaWindow.direction = C.down;
        M.DeltaWindow.gap = M.DeltaWindow.gap - inc;
      }
      break;
    case C.down:
      if (M.DeltaCandle.close < M.DeltaWindow.low) {
        M.DeltaWindow.gap = M.DeltaWindow.gap + inc;
      } else {
        M.DeltaWindow.direction = C.up;
        M.DeltaWindow.gap = M.DeltaWindow.gap - inc;
      }
      break;
    default:
      throw new Error("Invalid Delta Window Directioon");
  }

  if (M.DeltaWindow.gap < M.P_SupportDelta.value) {
    M.DeltaWindow.gap = M.P_SupportDelta.value;
  }
}

function setDeltaWindow() {
  M.DeltaWindow.target = formatDecimal(M.DeltaCandle.close + M.DeltaWindow.gap);
  M.DeltaWindow.high = M.DeltaCandle.close;
  M.DeltaWindow.low = formatDecimal(M.DeltaCandle.close - M.DeltaWindow.gap);
  if (M.BuyAddon.flag === true) {
    M.DeltaWindow.color = C.blueWindow;
  } else {
    M.DeltaWindow.color = C.greyWindow;
  }
}

function updateChartTime() {
  M.P_Chart.startCandle = M.P_Chart.startCandle + M.P_Chart.interval;
  M.P_Chart.endCandle = M.P_Chart.endCandle + M.P_Chart.interval;
  M.P_Chart.startChart = M.P_Chart.startChart + M.P_Chart.interval;

  // Chart Flag
  M.candleFlag = true;
}

async function updateOptionStrikes() {
  // Get Market Tickers
  const aMarketData = await getMarketTickers();

  // Add Option Symbols
  const aOptionSymbols = getOptionSymbols(aMarketData);

  addSymbols(C.option, aOptionSymbols);
}

function deleteOldMessages() {
  M.aAllMsg = M.aAllMsg.filter((msg) => msg.priority !== C.P3);
  M.msgFlag = true;
}

function updateChartSymbols() {
  if (M.P_Chart.category == C.market) {
    return;
  }
  let found = M.aData.some(
    (item) =>
      item.symbol === M.P_Chart.callSymbol ||
      item.symbol === M.P_Chart.putSymbol,
  );
  if (!found) {
    callTicker = M.aData.find(
      (item) =>
        item.category === C.option &&
        item.index === M.P_Chart.index &&
        item.type === C.call,
    );
    putTicker = M.aData.find(
      (item) =>
        item.category === C.option &&
        item.index === M.P_Chart.index &&
        item.type === C.put,
    );
    if (callTicker === undefined || putTicker === undefined) {
      return;
    }
    M.P_Chart.callSymbol = callTicker.symbol;
    M.P_Chart.putSymbol = putTicker.symbol;

    // Chart Flag
    M.chartFlag = true;
  }
}

function updateDataTickers(data) {
  //////////////////////////
  switch (data.type) {
    case C.tickerChannel:
      updateCandleVolOi(data);
      break;
    case M.Para.channel:
      updateChartCandle(data);
      break;
  }
}

function updateCandleVolOi(data) {
  // Get All relevant Tickers
  let aTicker = M.aData.filter((row) => row.symbol === data.symbol);

  // No Tcikers Found
  if (aTicker === undefined) {
    return;
  }

  for (let i = 0; i < aTicker.length; i++) {
    var ticker = aTicker[i];
    ticker.volume = formatDecimal(data.volume);
    ticker.oi = formatDecimal(data.oi);
  }
}

function updateChartCandle(data) {
  let aTicker = M.aData.filter(
    (row) =>
      (M.Para.priceType == C.maker ? "MARK:" + row.symbol : row.symbol) ==
      data.symbol,
  );

  if (aTicker == undefined) {
    return;
  }

  for (let i = 0; i < aTicker.length; i++) {
    var ticker = aTicker[i];

    // TimeStamp
    ticker.startCandle = Math.floor(data.candle_start_time / 1000);
    ticker.lastUpdated = Math.floor(data.last_updated / 1000);

    // OHLC
    ticker.open = formatDecimal(data.open);
    ticker.high = formatDecimal(data.high);
    ticker.low = formatDecimal(data.low);
    ticker.close = formatDecimal(data.close);
    ticker.per = getPercentage(ticker.open, ticker.close);

    ///////////////  Backtest Start  /////////////////
    if (M.Backtest.flag) {
      switch (ticker.symbol) {
        case M.Backtest.callSymbol:
          updateCandle(ticker, M.Backtest.callLtp);
          ticker.per = getPercentage(ticker.open, ticker.close);
          break;
        case M.Backtest.putSymbol:
          updateCandle(ticker, M.Backtest.putLtp);
          ticker.per = getPercentage(ticker.open, ticker.close);
          break;
      }
    }
    ///////////////  Backtest End  /////////////////
  }
}

function updateCandle(Candle, Ltp) {
  if (Ltp > Candle.high) {
    Candle.high = Ltp;
  }
  if (Ltp < Candle.low) {
    Candle.low = Ltp;
  }
  Candle.close = Ltp;
}

function formatDecimal(value, decimals) {
  if (decimals == undefined) {
    decimals = 1;
  }
  return Number(parseFloat(value).toFixed(decimals));
}

function getPercentage(from, to) {
  if (to == 0) {
    return 0;
  } else {
    return formatDecimal(((to - from) / from) * 100);
  }
}

function addPercentage(Price, Percenatge) {
  var output = Price + (Price * Percenatge) / 100;
  return formatDecimal(output);
}

function setDefaultPara() {
  resetWithRef(M.Para, M.I_Para);
  initDefaultPara();
  initScalePara();
  initExpiryPara();
  initChartPara();
  initTimeArray();
}

function initChartPara() {
  M.P_Chart.type = C.market;
  M.P_Chart.symbol = C.btcSymbol;
  M.P_Chart.callSymbol = 0;
  M.P_Chart.putSymbol = 0;
  M.P_Chart.callStrike = 0;
  M.P_Chart.putStrike = 0;

  M.P_Chart.interval = getInterval();
  M.P_Chart.range = getRange();

  // Chart Time Lines
  setChartTimelines();
}

function getInterval() {
  let timeframe = 0,
    timeConv = 0;
  try {
    // Get Interval
    if (M.Para.timeframe.includes("m")) {
      timeframe = M.Para.timeframe.split("m")[0];
      timeConv = C.minToMili;
    } else if (M.Para.timeframe.includes("h")) {
      timeframe = M.Para.timeframe.split("h")[0];
      timeConv = C.hourToMili;
    } else {
      throw new Error("Invalid Timeframe");
    }
    if (timeframe <= 0) {
      throw new Error("Invalid Time Interval");
    }
    return timeframe * timeConv;
  } catch (error) {
    addMessage(C.error, error.message, C.P1);
    return 0;
  }
}

function getRange() {
  switch (M.Para.timeframe) {
    case "5m":
      return 5;
    case "15m":
      return 10;
    case "30m":
      return 20;
    case "1h":
      return 40;
    case "2h":
      return 80;
    case "4h":
      return 160;
    case "6h":
      return 240;
    case "12h":
      return 480;
  }
}

function setChartTimelines() {
  M.P_Chart.startCandle =
    Math.floor(getCurrentTime() / M.P_Chart.interval) * M.P_Chart.interval;
  M.P_Chart.endCandle = M.P_Chart.startCandle + M.P_Chart.interval;
  var currHour =
    Math.floor(M.P_Chart.startCandle / C.hourToMili) * C.hourToMili;
  M.P_Chart.startChart = currHour - C.hourToMili * M.P_Chart.range;
  M.P_Chart.endChart = M.P_Expiry.time;
}

function getCurrentTime() {
  let date = new Date();
  return date.getTime();
}

function initDefaultPara() {
  M.Para.switch = C.defaultPara.switch;
  M.Para.strikeGap = C.defaultPara.strikeGap;
  M.Para.barType = C.defaultPara.barType;
  M.Para.interval = C.defaultPara.interval;
  M.Para.timeframe = C.timeframe[C.defaultPara.interval];
  M.Para.channel = C.candlestick_ + C.defaultPara.interval;
  M.Para.scale = C.defaultPara.scale;
}

function initExpiryPara() {
  var today = new Date();
  var expiry = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    17,
    30,
    0,
    0,
  ); // 5:30:00 PM

  // expiry = new Date(); // Testing
  // today = new Date(); // Testing

  // Default Next date
  if (today.getTime() >= expiry.getTime()) {
    expiry.setDate(today.getDate() + 1);
  }

  // Set Next Date for Expiry
  if (M.Para.headerMiddle === C.backtest) {
    expiry.setDate(today.getDate() + 1);
  }

  // Set Expiry Para
  setExpiryPara(expiry);
}

function setExpiryPara(expiry) {
  M.P_Expiry.raw = expiry;
  M.P_Expiry.date = toDateFormat(expiry);
  M.P_Expiry.time = +expiry;
  M.P_Expiry.text = dateToTextFormat(expiry);
  M.P_Expiry.symbol = dateToSymbolFormat(expiry);
  M.expiryAlert = M.P_Expiry.time - 60 * 60000; // 60 Mins
}

function toDateFormat(expiry) {
  let year = expiry.getFullYear();
  let month = (expiry.getMonth() + 1).toString().padStart(2, "0");
  let day = expiry.getDate().toString().padStart(2, "0");
  return day + "-" + month + "-" + year;
}

function dateToTextFormat(expiry) {
  let month = expiry.getMonth();
  let date = expiry.getDate();
  let monthText = C.aMonth[month];
  return date + " " + monthText;
}

function dateToSymbolFormat(expiry) {
  let year = expiry.getFullYear().toString().slice(2, 4);
  let month = (expiry.getMonth() + 1).toString().padStart(2, "0");
  let day = expiry.getDate().toString().padStart(2, "0");
  return day + month + year;
}

function initTimeArray() {
  M.aTimeAxis = [];
  var time = M.P_Chart.startChart;
  while (time <= M.P_Chart.endChart) {
    M.aTimeAxis.push(time);
    time = time + M.P_Chart.interval;
  }
}

function initScalePara() {
  let factor = 0;
  let addon = 0;
  let round = 3;
  let scope = 0;

  switch (M.Para.scale) {
    case C.small:
      factor = 20; // 15;
      break;
    case C.medium:
      factor = 30; // 20;
      break;
    case C.large:
      factor = 40; // 25;
      break;
    default:
      throw new Error("Invalid Buy Scale");
  }

  // Parameters
  M.Para.factor = factor;
  M.Para.hold = factor;
  M.Para.exit = factor * 2;

  // M.Para.profit = factor * 3;
  // M.Para.loss = factor * -4;
  // // Addon
  // if (M.P_Addon.flag === true) {
  //   M.Para.profit = formatDecimal(M.Para.profit + factor * 2 * M.P_Addon.value);
  //   M.Para.loss = formatDecimal(M.Para.loss - factor * 3 * M.P_Addon.value);
  // }

  if (M.P_Addon.flag === true) {
    addon = M.P_Addon.value;
  }

  scope = round * factor * (1 + 2 * addon); // 2 -> sides

  M.Para.loss = formatDecimal(scope * -1);
  M.Para.profit = formatDecimal((2 / 3) * scope);

  // Trail
  M.P_ProfitTrail.per = formatDecimal(M.Para.profit - factor * 2);
  M.P_LossTrail.per = formatDecimal(M.Para.profit + factor * 2);

  // Delta
  M.P_BuyDelta.value = Math.round(factor / 5);
  M.P_Support.per = factor;
  M.P_SupportDelta.value = Math.round(factor / 2);
  M.P_SellSupport.value = Math.round(factor / 5);
  M.P_SellAddon.value = Math.round(factor / 5);
  M.P_SellReversal.value = Math.round(factor / 5);
  M.P_SellDelta.value = -factor;
  M.P_Addon.per = factor;
  M.P_Volume.per = factor * 4;
  M.P_Oi.per = factor / 5;

  // Track
  M.P_Track.high = Math.round(factor * 0.6); // 60 %
  M.P_Track.low = Math.round(-factor * 0.8); // 80 %
}

function initScalePara_old() {
  let factor = 0;
  let addon = 0;

  switch (M.Para.scale) {
    case C.small:
      factor = C.smallFactor; // 15;
      break;
    case C.medium:
      factor = C.mediumFactor; // 20;
      break;
    case C.large:
      factor = C.largeFactor; // 25;
      break;
    default:
      throw new Error("Invalid Buy Scale");
  }

  if (M.BuyAddon.flag === true) {
    addon = M.BuyAddon.value;
  }
  //   let intervalMin = getIntervalMin();

  // Parameters
  M.Para.factor = factor;
  M.Para.profit = factor * (6 + addon);
  M.Para.loss = -M.Para.profit;
  M.Para.hold = factor;
  M.Para.exit = factor * 3;

  // Delta
  M.P_BuyDelta.value = Math.round(factor / 5);
  M.P_Support.per = factor;
  M.P_SupportDelta.value = Math.round(factor / 3);
  M.P_SellSupport.value = factor / 5;
  M.P_SellAddon.value = factor / 5;
  M.P_SellReversal.value = 4 + addon;
  M.P_SellDelta.value = -factor;
  M.P_Addon.per = factor;
  M.P_Volume.per = factor * 4;
  M.P_Oi.per = factor / 5;

  // Track
  M.P_Track.high = Math.round(factor * 0.6); // 60 %
  M.P_Track.low = Math.round(-factor * 0.8); // 80 %
}

function addMessage(type, message, priority) {
  if (type === C.error && message !== "Insufficient Amount") {
    debugger;
  }

  // Avoid Duplicate Messages
  if (M.lastMsg?.type === type && M.lastMsg?.message === message) {
    return;
  }

  // Capture Last Message
  M.lastMsg = {
    type: type,
    message: message,
    priority: priority,
  };

  // Update Message with Time
  M.lastMsg.message = getTimeString() + " - " + M.lastMsg.message;

  // Append to Message Array
  M.aMessage.push(M.lastMsg);
  M.aAllMsg.push(M.lastMsg);
  console.log(message);
}

function getTimeString() {
  const [date, time, period] = new Date().toLocaleString().split(" ");
  const [hour, minute, sec] = time.split(":");
  let formattedHour = parseInt(hour);
  return `${formattedHour}:${minute} ${period}`;
}

function resetWithRef(target, source) {
  for (const key in target) {
    if (typeof target[key] === "object") {
      resetWithRef(target[key], source[key]);
    } else {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        if (source === undefined) {
          target[key] = undefined;
        } else {
          target[key] = source[key];
        }
      }
    }
  }
}

async function getWallet() {
  try {
    var wallet = await M.oDelta.fetchBalance();
    M.P_Account.wallet = Math.round(wallet.free.USD);
    M.P_Account.per = Math.round(
      (M.P_Account.amount / M.P_Account.wallet) * 100,
    );
    if (M.P_Account.wallet == 0) {
      throw new Error("Empty Wallet");
    }
    if (M.P_Account.amount == 0) {
      throw new Error("Insufficient Amount");
    }
  } catch (error) {
    addMessage(C.error, findMsg(error), C.P1);
  }
}

async function initSymbols() {
  // Get Market Hsitory
  await getAllMarketHistory();

  // Get Market Data
  const aMarketData = await getMarketTickers();

  // Get Option Symbols
  const aOptionSymbols = getOptionSymbols(aMarketData);

  // Add Symbols
  addSymbols(C.market, M.aMarketSymbols);
  addSymbols(C.option, aOptionSymbols);
}

async function getAllMarketHistory() {
  var history = await getMarketHistory();
  M.btcCandle = getCandle(history[0]);
  M.ethCandle = getCandle(history[1]);
}

async function getMarketHistory() {
  const [btcMarket, ethMarket] = await Promise.all([
    M.oDelta.fetchOHLCV(C.btcSymbol, M.Para.timeframe, M.P_Chart.startChart),
    M.oDelta.fetchOHLCV(C.ethSymbol, M.Para.timeframe, M.P_Chart.startChart),
  ]);
  return [btcMarket, ethMarket];
}

async function getMarketOiHistory() {
  const [btcMarket, ethMarket] = await Promise.all([
    getOiHistory(
      "OI:" + C.btcSymbol,
      Math.floor(M.P_Chart.startChart / 1000),
      Math.floor(M.P_Chart.endCandle / 1000),
    ),
    getOiHistory(
      "OI:" + C.ethSymbol,
      Math.floor(M.P_Chart.startChart / 1000),
      Math.floor(M.P_Chart.endCandle / 1000),
    ),
  ]);
  return [btcMarket, ethMarket];
}

async function getOiHistory(symbol, start, end) {
  const params = new URLSearchParams({
    symbol: symbol,
    resolution: M.Para.timeframe,
    start: start,
    end: end,
  });

  const path = `/v2/history/candles?${params}`;

  let data = await fetchDelta("GET", path);

  if (data.success === true) {
    return data.result;
  } else {
    addMessage(C.error, "Errror Getting Oi History", C.P1);
  }
}

function fetchDelta(method, path) {
  // Parameters
  var BASE_URL = "https://api.india.delta.exchange"; // Or https://api.global.delta.exchange
  var timestamp = String(Math.floor(Date.now() / 1000));

  // Header
  var headers = {
    // "api-key": this.api_key,
    timestamp: timestamp,
    "Content-Type": "application/json",
  };

  // Url Option
  var options = {
    method: method,
    headers: headers,
  };

  // Fetch Data
  // @ts-ignore
  var that = this;
  // @ts-ignore
  return new Promise(function (resolve, reject) {
    fetch(`${BASE_URL}${path}`, options)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        if (data.success == true) {
          resolve(data);
        } else {
          reject(that.error);
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function getCandle(history) {
  history.sort((a, b) => a - b);

  var candle = {
    open: history[0][1],
    high: history[0][2],
    low: history[0][3],
    close: history[history.length - 1][4],
  };

  for (let i = 0; i < history.length; i++) {
    var row = history[i];
    if (row[2] > candle.high) {
      candle.high = row[2];
    }
    if (row[3] < candle.low) {
      candle.low = row[3];
    }
  }
  return candle;
}

async function getMarketTickers() {
  const [btcData, ethData] = await Promise.all([
    M.oDelta.fetchTicker(C.btcSymbol),
    M.oDelta.fetchTicker(C.ethSymbol),
  ]);
  return [btcData, ethData];
}

function getOptionSymbols(aMarketData) {
  let aOptionSymbols = [],
    strike = 0;

  for (let i = 0; i < aMarketData.length; i++) {
    const market = aMarketData[i].info;
    const index = market.underlying_asset_symbol;

    strike = getClosestStrike(market.close, market.underlying_asset_symbol);
    aOptionSymbols.push(
      undefineSymbol(index, C.call, calcCallStrike(strike, index)),
    );
    aOptionSymbols.push(
      undefineSymbol(index, C.put, calcPutStrike(strike, index)),
    );
  }
  return aOptionSymbols;
}

function getClosestStrike(strike, index) {
  let window = 0;
  switch (index) {
    case C.btc:
      window = C.btcWindow;
      break;
    case C.eth:
      window = C.ethWindow;
      break;
    default:
      addMessage(C.error, "Invalid Index for Strike Calculation", C.P2);
      return 0;
  }

  return Math.round(strike / window) * window;
}

function calcCallStrike(strike, index) {
  let window = 0;
  switch (index) {
    case C.btc:
      window = C.btcWindow;
      break;
    case C.eth:
      window = C.ethWindow;
      break;
    default:
      throw new Error("Invalid Market Index");
  }
  return strike + window * M.Para.strikeGap;
}

function calcPutStrike(strike, index) {
  let window = 0;
  switch (index) {
    case C.btc:
      window = C.btcWindow;
      break;
    case C.eth:
      window = C.ethWindow;
      break;
    default:
      throw new Error("Invalid Market Index");
  }
  return strike - window * M.Para.strikeGap;
}

function addSymbols(category, aSymbols) {
  let aAddSymbol = [],
    aRemoveSymbol = [];

  aSymbols.forEach((symbol) => {
    const ticker = JSON.parse(JSON.stringify(M.Ticker));

    const { index, type, strike } = defineSymbol(symbol);

    let data = M.aData.find(
      (item) =>
        item.category === category &&
        item.index === index &&
        item.type === type,
    );

    // Do Nothing, if the symbol exists
    if (data?.symbol === symbol || data?.symbol === "MARK:" + symbol) {
      return;
    }

    // Else Remove Old Symbol, if exists
    if (data?.symbol !== undefined) {
      aRemoveSymbol.push(data.symbol);
    }

    // Add New Symbol
    ticker.category = category;
    ticker.symbol = symbol;
    ticker.index = index;
    ticker.type = type;
    ticker.strike = strike;
    M.aData.push(ticker);
    if (
      category == C.market ||
      category == C.option ||
      category == C.buy ||
      category == C.chart
    ) {
      aAddSymbol.push(symbol);
    }

    if (category === M.Para.barType) {
      M.strikeFlag = true;
    }
  });

  // Subscribe Symbols
  if (aAddSymbol.length > 0) {
    subscribeSymbols(aAddSymbol);
  }

  // UnSubscribe Symbols
  if (aRemoveSymbol.length > 0) {
    removeDataSymbol(C.option, aRemoveSymbol);
    unSubscribeSymbols(aRemoveSymbol);
  }

  M.strikeFlag = true;
}

function subscribeSymbols(aSymbols) {
  if (aSymbols?.length == undefined || aSymbols?.length == 0) {
    return;
  }

  // OI & Volume
  var oPayload = {
    type: "subscribe",
    payload: {
      channels: [
        {
          name: C.tickerChannel,
          symbols: aSymbols,
        },
      ],
    },
  };

  oSocket.ws.send(JSON.stringify(oPayload));

  // OHLC
  if (M.Para.priceType == C.maker) {
    aSymbols = aSymbols.map((symbol) => "MARK:" + symbol);
  }
  var oPayload = {
    type: "subscribe",
    payload: {
      channels: [
        {
          name: M.Para.channel,
          symbols: aSymbols,
        },
      ],
    },
  };
  oSocket.ws.send(JSON.stringify(oPayload));

  for (let i = 0; i < aSymbols.length; i++) {
    M.aSubscribed.push(aSymbols[i]);
    addMessage(C.info, aSymbols[i] + " - Subscribed", C.P3);
  }
}

function unSubscribeSymbols(aSymbols) {
  if (aSymbols?.length == undefined || aSymbols?.length == 0) {
    return;
  }

  // Options
  var oPayload = {
    type: "unsubscribe",
    payload: {
      channels: [
        {
          name: M.Para.channel,
          symbols: aSymbols,
        },
      ],
    },
  };
  oSocket.ws.send(JSON.stringify(oPayload));

  // M.aSubscribed = M.aSubscribed.filter((item) => !aSymbols.includes(item));

  // if (M.Para.priceType == C.maker) {
  //   aSymbols = aSymbols.map((symbol) => "MARK:" + symbol);
  // }

  for (let i = 0; i < aSymbols.length; i++) {
    M.aSubscribed = M.aSubscribed.filter((item) => item !== aSymbols[i]);
    addMessage(C.info, aSymbols[i] + " -  Un-Subscribed", C.P3);
    aSymbols[i] = aSymbols[i].split(":")[1];
  }

  // OI & Volume
  var oPayload = {
    type: "unsubscribe",
    payload: {
      channels: [
        {
          name: C.tickerChannel,
          symbols: aSymbols,
        },
      ],
    },
  };
  oSocket.ws.send(JSON.stringify(oPayload));
}

function defineSymbol(symbol) {
  let index = C.none,
    type = C.none,
    strike = 0;

  // Get Actual Symbol
  if (M.Para.priceType === C.maker) {
    symbol = symbol.split(":")[1] ?? symbol;
  }

  // Market Symbols
  if (symbol === C.btcSymbol) {
    index = C.btc;
    return { index, type, strike };
  }

  if (symbol === C.ethSymbol) {
    index = C.eth;
    return { index, type, strike };
  }

  // Other Symbols
  const aParts = symbol.split("-");
  switch (aParts[0]) {
    case "C":
      type = C.call;
      break;
    case "P":
      type = C.put;
      break;
    default:
      addMessage(C.error, "Invalid Symbol Type: " + symbol, C.P2);
      return { index, type, strike };
  }

  index = aParts[1];
  strike = aParts[2];
  return { index, type, strike };
}

function undefineSymbol(index, type, strike) {
  switch (type) {
    case C.call:
      type = "C";
      break;
    case C.put:
      type = "P";
      break;
    default:
      addMessage(C.error, "Invalid Symbol Type: " + type, C.P2);
      return C.none;
  }

  return type + "-" + index + "-" + strike + "-" + M.P_Expiry.symbol;
}

function removeDataSymbol(category, aSymbol) {
  // Remove existing symbol from aData
  for (let i = 0; i < aSymbol.length; i++) {
    M.aData = M.aData.filter(
      (item) => !(item.category === category && item.symbol === aSymbol[i]),
    );
  }
}

function findMsg(error) {
  if (error?.message != undefined) {
    return error.message;
  }

  if (error != undefined) {
    return error;
  }

  return "No Message Found";
}

async function readLog(Filetype) {
  try {
    var filePath = C.logPath + Filetype + ".json";
    const data = Fs.readFileSync(filePath, "utf8");
    return data;
  } catch (error) {
    addMessage(C.error, error, C.P1);
  }
}

function updateLog(fileName) {
  try {
    var filePath = C.logPath + fileName + ".json";
    switch (fileName) {
      case C.para:
        Fs.writeFile(filePath, JSON.stringify(M.Para), (err) => {});
        break;
      case C.track:
        Fs.writeFile(filePath, JSON.stringify(M.Track), (err) => {});
        break;
      case C.buy:
        Fs.writeFile(filePath, JSON.stringify(M.Buy), (err) => {});
        break;
      case C.trn:
        Fs.writeFile(filePath, JSON.stringify(M.aTrn), (err) => {});
        break;
      case C.position:
        Fs.writeFile(filePath, JSON.stringify(M.aOpenPosition), (err) => {});
        break;
      case C.sell:
        filePath = C.logPath + "BuyDB.json";
        Fs.appendFile(filePath, JSON.stringify(M.Buy), (err) => {});

        filePath = C.logPath + "TrnDB.json";
        Fs.appendFile(filePath, JSON.stringify(M.aTrn), (err) => {});
        break;
      default:
        throw new Error("Invalid Log Path");
    }
  } catch (error) {
    addMessage(C.error, error, C.P1);
  }
}

function deleteLog(fileName) {
  try {
    var filePath = C.logPath + fileName + ".json";
    Fs.writeFile(filePath, JSON.stringify({}), (err) => {});
  } catch (error) {
    addMessage(C.error, error);
  }
}

function formatDecimal(value, decimals) {
  if (decimals == undefined) {
    decimals = 1;
  }
  return Number(parseFloat(value).toFixed(decimals));
}

function getDelta(callPer, putPer) {
  return formatDecimal(callPer + putPer);
}

function setBusy(status, process) {
  M.busyFlag = status;
  if (status == true) {
    M.busyTime = getCurrentTime();
    M.busyProcess = process;
  } else if (status == false) {
    M.busyTime = 0;
    M.busyProcess = C.none;
  }
}

function getPercentage(from, to) {
  if (to == 0) {
    return 0;
  } else {
    return formatDecimal(((to - from) / from) * 100);
  }
}

function getIntervalMin() {
  switch (M.Para.interval) {
    case "1m":
      return 1;
    case "5m":
      return 5;
    case "15m":
      return 15;
    case "30m":
      return 30;
    case "1h":
      return 60;
    case "4h":
      return 240;
    case "1d":
      return 1440;
    default:
      return 15;
  }
}

function resetTrack() {
  // if (M.P_Track.flag === true) {
  M.P_Track.flag = false;
  M.P_Track.time = 0;
  M.P_Track.text = "";

  resetWithRef(M.Track, M.I_Track);
  M.aTrack = [];

  //   M.trackFlag = true;

  //   addMessage(C.info, "Track Reset", C.P3);
  // }
}

function getTicker(Index, Type) {
  let ticker = M.aData.find(
    (row) => row.category === C.buy && row.index === Index && row.type === Type,
  );
  if (ticker !== undefined) {
    return ticker;
  } else {
    ticker = M.aData.find(
      (row) =>
        row.category === C.option && row.index === Index && row.type === Type,
    );
    return ticker;
  }
}

function sendBarStrikes(res) {
  let ticker;
  let barStrikes = JSON.parse(JSON.stringify(M.I_BarStrikes));

  // BTC Call
  ticker = getTicker(C.btc, C.call);
  if (ticker !== undefined) {
    barStrikes.symbol.btcCall = ticker.symbol;
    barStrikes.strike.btcCall = ticker.strike;
  }

  // BTC Put
  ticker = getTicker(C.btc, C.put);
  if (ticker !== undefined) {
    barStrikes.symbol.btcPut = ticker.symbol;
    barStrikes.strike.btcPut = ticker.strike;
  }

  // ETH Call
  ticker = getTicker(C.eth, C.call);
  if (ticker !== undefined) {
    barStrikes.symbol.ethCall = ticker.symbol;
    barStrikes.strike.ethCall = ticker.strike;
  }

  // ETH Put
  ticker = getTicker(C.eth, C.put);
  if (ticker !== undefined) {
    barStrikes.symbol.ethPut = ticker.symbol;
    barStrikes.strike.ethPut = ticker.strike;
  }
  //////////////////////////
  // for (let i = 0; i < M.aData.length; i++) {
  //   const data = M.aData[i];
  //   if (data.category != M.Para.barType) {
  //     continue;
  //   }
  //   switch (data.index) {
  //     case C.btc:
  //       if (data.type === C.call) {
  //         barStrikes.symbol.btcCall = data.symbol;
  //         barStrikes.strike.btcCall = data.strike;
  //       } else if (data.type === C.put) {
  //         barStrikes.symbol.btcPut = data.symbol;
  //         barStrikes.strike.btcPut = data.strike;
  //       }
  //       break;
  //     case C.eth:
  //       if (data.type === C.call) {
  //         barStrikes.symbol.ethCall = data.symbol;
  //         barStrikes.strike.ethCall = data.strike;
  //       } else if (data.type === C.put) {
  //         barStrikes.symbol.ethPut = data.symbol;
  //         barStrikes.strike.ethPut = data.strike;
  //       }
  //       break;
  //   }
  // }
  sendData(res, barStrikes);
}

function resetPnl(Pnl) {
  // Call Pnl is just for reference
  resetWithRef(Pnl, M.I_Buy.call.pnl);
}

function sendMessage(res, status, message) {
  res.send({
    status: status,
    type: C.message,
    message: message,
    time: currentTimeText(),
  });
}

function currentTimeText() {
  let aTime = new Date().toLocaleTimeString().split(":");
  return aTime[0] + ":" + aTime[1] + aTime[2].slice(2, 6);
}

function sendData(res, Data) {
  res.send({
    status: C.success,
    data: Data,
  });
}

function restartServer() {
  deleteLog(C.track);
  deleteLog(C.buy);

  if (M.P_Track.flag == false) {
    resetWithRef(M.P_Track, M.I_Para.track);
    resetWithRef(M.Track, M.Track);
    M.aTrack = [];
  }
  if (M.P_Buy.flag == false) {
    resetWithRef(M.P_Buy, M.I_Para.buy);
    resetWithRef(M.Buy, M.I_Buy);
    M.aTrn = [];
  }
  // Restart Server
  restartProcess();
}

function historyToCandle(history) {
  history.sort((a, b) => a - b);
  var candle = {};
  candle.open = history[0][1];
  candle.close = history[history.length - 1][4];
  candle.high = history.reduce((max, row) => Math.max(max, row[2]), -Infinity);
  candle.low = history.reduce((min, row) => Math.min(min, row[3]), Infinity);
  return candle;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getLiveData(req, res) {
  let serverData = JSON.parse(JSON.stringify(M.I_Data));

  // Chart
  serverData.chart = getChartData();

  // Bar
  serverData.bar = getBarData();

  // Buy Info & Transactions
  if (M.Buy.display == true) {
    serverData.buy = M.Buy;
    serverData.aTrn = M.aTrn;
  }

  // // Messages
  if (M.aMessage.length > 0) {
    serverData.aMessage = M.aMessage;
    M.aMessage = [];
  }

  // Flags
  serverData.flags = updateServerFlags();

  sendData(res, serverData);
}

function getChartData() {
  let chart = JSON.parse(JSON.stringify(M.I_Data.chart));

  if (M.P_Chart.category == C.option) {
    var callTicker = M.aData.find(
      (item) => item.symbol == M.P_Chart.callSymbol,
    );

    if (callTicker == undefined) {
      // throw new Error("Call Data Not Found");
    } else {
      chart.call = callTicker;
    }
    var putTicker = M.aData.find((item) => item.symbol == M.P_Chart.putSymbol);

    if (putTicker == undefined) {
      // throw new Error("Put Data Not Found");
    } else {
      chart.put = putTicker;
    }

    // Delta
    if (callTicker !== undefined && putTicker !== undefined) {
      chart.delta = getDeltaCandle(callTicker, putTicker);
    }
  }

  // Market Data
  let marketTicker = M.aData.find(
    (item) => item.category === C.market && item.symbol == M.P_Chart.symbol,
  );
  if (marketTicker == undefined) {
    // throw new Error("Market Data Not Found");
  } else {
    chart.market = marketTicker;
  }

  return chart;
}

function getDeltaCandle(callTicker, putTicker) {
  var candle = {};
  var CeHigh = getPercentage(callTicker.open, callTicker.high);
  var PeLow = getPercentage(putTicker.open, putTicker.low);
  var side_1 = getDelta(CeHigh, PeLow);

  var CeLow = getPercentage(callTicker.open, callTicker.low);
  var PeHigh = getPercentage(putTicker.open, putTicker.high);
  var side_2 = getDelta(CeLow, PeHigh);

  var CeClose = getPercentage(callTicker.open, callTicker.close);
  var PeClose = getPercentage(putTicker.open, putTicker.close);
  var close = getDelta(CeClose, PeClose);

  // Open
  candle.open = 0;

  // High
  candle.high = Math.max(side_1, side_2, close);
  if (candle.high < 0) {
    candle.high = 0;
  }

  // Low
  candle.low = Math.min(side_1, side_2, close);
  if (candle.low > 0) {
    candle.low = 0;
  }

  // Close
  candle.close = close;

  return candle;
}

function getBarData() {
  let bar = JSON.parse(JSON.stringify(M.I_Data.bar));
  switch (M.Para.barType) {
    case C.market:
      getMarketBar(bar);
      break;
    case C.option:
      getOptionBar(bar);
      break;
    case C.track:
      getTrackBar(bar);
      break;
    case C.buy:
      getBuyBar(bar);
    default:
      break;
  }
  return bar;
}

function getMarketBar(Bar) {
  var marketBar = Bar.market;
  // BTC
  var btcLtp = M.aData.find((row) => row.symbol == C.btcSymbol);
  if (btcLtp?.close != undefined) {
    updateCandle(M.btcCandle, btcLtp.close);
    marketBar[0] = getPercentage(M.btcCandle.open, M.btcCandle.close);
  }

  // ETH
  var ethLtp = M.aData.find((row) => row.symbol == C.ethSymbol);
  if (ethLtp?.close != undefined) {
    updateCandle(M.btcCandle, ethLtp.close);
    marketBar[1] = getPercentage(M.ethCandle.open, M.ethCandle.close);
  }
}

function getOptionBar(Bar) {
  var callBar = Bar.call,
    deltaBar = Bar.delta,
    putBar = Bar.put;

  // BTC

  var btcCall = getDataOption(C.btc, C.option, C.call);
  var btcPut = getDataOption(C.btc, C.option, C.put);

  if (btcCall?.per != undefined && btcPut?.per != undefined) {
    callBar[0] = btcCall.per;
    putBar[0] = btcPut.per;
    deltaBar[0] = getDelta(btcCall.per, btcPut.per);
  }

  // ETH
  var ethCall = getDataOption(C.eth, C.option, C.call);
  var ethPut = getDataOption(C.eth, C.option, C.put);

  if (ethCall?.per != undefined && ethPut?.per != undefined) {
    callBar[1] = ethCall.per;
    putBar[1] = ethPut.per;
    deltaBar[1] = getDelta(ethCall.per, ethPut.per);
  }
}

function getTrackBar(Bar) {
  if (M.P_Track.flag == false || M.aTrack.length == 0) {
    return;
  }

  // Btc Call
  [Bar.call[0], Bar.put[0]] = getTrackCandle(C.btc, C.call);

  // Btc Put
  [Bar.call[1], Bar.put[1]] = getTrackCandle(C.btc, C.put);

  // Eth Call
  [Bar.call[2], Bar.put[2]] = getTrackCandle(C.eth, C.call);

  // Eth Put
  [Bar.call[3], Bar.put[3]] = getTrackCandle(C.eth, C.put);
}

function getTrackCandle(index, type) {
  let candle = [0, 0];
  let ticker = M.aTrack.find(
    (item) => item.index === index && item.type === type,
  );
  if (ticker != undefined) {
    candle[0] = ticker.fromHigh;
    candle[1] = ticker.fromLow;
  }
  return candle;
}

function getBuyBar(Bar) {
  if (M.Buy.flag == false || M.Buy.mode == C.none) {
    return;
  }
  var callBar = Bar.call,
    deltaBar = Bar.delta,
    putBar = Bar.put;

  let callPer = getPercentage(M.CallCandle.open, M.CallCandle.close);
  let putPer = getPercentage(M.PutCandle.open, M.PutCandle.close);

  if (callPer != undefined && putPer != undefined) {
    switch (M.Buy.index) {
      case C.btc:
        callBar[0] = callPer;
        putBar[0] = putPer;
        deltaBar[0] = getDelta(callPer, putPer);
        break;
      case C.eth:
        callBar[1] = callPer;
        putBar[1] = putPer;
        deltaBar[1] = getDelta(callPer, putPer);
    }
  }
}

function updateServerFlags() {
  let flags = JSON.parse(JSON.stringify(M.I_Data.flags));

  // Busy
  flags.busy = M.busyFlag;
  if (M.busyFlag === true) {
    let busyGap = getCurrentTime() - M.busyTime;
    if (busyGap > C.busyDelay) {
      flags.busyProcess = M.busyProcess;
    } else {
      flags.busy = false;
    }
  }

  // Para
  flags.para = M.paraFlag;
  if (M.paraFlag) {
    M.paraFlag = !M.paraFlag;
  }

  // Strike
  flags.strike = M.strikeFlag;
  if (M.strikeFlag) {
    M.strikeFlag = !M.strikeFlag;
  }

  // Chart
  flags.chart = M.chartFlag;
  if (M.chartFlag) {
    M.chartFlag = !M.chartFlag;
  }

  // Chart
  flags.candle = M.candleFlag;
  if (M.candleFlag) {
    M.candleFlag = !M.candleFlag;
  }

  // Track
  flags.track = M.trackFlag;
  if (M.trackFlag) {
    M.trackFlag = !M.trackFlag;
  }

  // Buy
  flags.buy = M.buyFlag;
  if (M.buyFlag) {
    M.buyFlag = !M.buyFlag;
  }

  // Message
  flags.msg = M.msgFlag;
  if (M.msgFlag) {
    M.msgFlag = !M.msgFlag;
  }

  // Alert
  flags.alert = M.alertFlag;
  if (M.alertFlag) {
    M.alertFlag = !M.alertFlag;
  }

  return flags;
}

function getDataOption(Index, Category, Type) {
  return M.aData.find(
    (row) => row.category == Category && row.index == Index && row.type == Type,
  );
}

function validateBuySymbols(value) {
  var found = false;
  found = M.aData.some((item) => item.symbol == value.callSymbol);
  if (found == false) {
    return C.error;
  }
  found = M.aData.some((item) => item.symbol == value.putSymbol);
  if (found == false) {
    return C.error;
  }
  return C.success;
}

function getCurrentTimeText() {
  let unit = " AM";
  let hrs = new Date().getHours();
  let min = new Date().getMinutes();

  if (hrs > 12) {
    hrs = hrs - 12;
    unit = " PM";
  }

  // String(hrs).padStart(2, "0");
  min = String(min).padStart(2, "0");

  return hrs + ":" + min + unit;

  // return new Date().toTimeString().slice(0, 5);
}

function isJSON(str) {
  if (typeof str !== "string" || str === "") {
    return false;
  }
  return true;
}
////////////////////////////////////////////////////
//                 Open Position                  //
////////////////////////////////////////////////////
async function getOpenPosition() {
  setBusy(true, "Open Position");

  try {
    // Get Open Posiiotn
    let aOpenPosition = await M.oDelta.fetchPositions();

    ///////// Testing ///////////
    // let positionLog = await readLog("Position");
    // aOpenPosition = JSON.parse(positionLog);
    //////////////////////////
    if (aOpenPosition?.length == undefined || aOpenPosition?.length == 0) {
      console.log("No Open Position Found");
      setBusy(false);
      return;
    }

    if (aOpenPosition?.length > 3) {
      addMessage(C.error, "Extra Buy Position Available", C.P2);
      setBusy(false);
      return;
    }

    addMessage(C.success, "Open Position Found", C.P1);

    // Read Buy Log
    var buyLog = await readLog(C.buy);
    // buyLog = "";

    if (isJSON(buyLog)) {
      buyLog = JSON.parse(buyLog);

      addSymbols(C.buy, [buyLog.call.symbol, buyLog.put.symbol]);

      if (buyLog == undefined) {
        setActualOpenPosition(aOpenPosition);
      } else {
        let isValid = checkLogOpenPosition(buyLog, aOpenPosition);
        if (isValid) {
          setLogOpenPosition(buyLog);

          // Update Para Buy
          M.P_Buy.flag = true;
          M.P_Buy.index = buyLog.index;
          M.P_Buy.type = buyLog.type;
          M.P_Buy.callSymbol = buyLog.call.symbol;
          M.P_Buy.putSymbol = buyLog.put.symbol;

          // Update Trn History
          var trnLog = await readLog(C.trn);
          if (isJSON(trnLog)) {
            M.aTrn = JSON.parse(trnLog);
          }
        } else {
          setActualOpenPosition(aOpenPosition);
        }
      }
    } else {
      setActualOpenPosition(aOpenPosition);
    }

    // Bar Strikes Flag
    M.paraFlag = true;
    M.strikeFlag = true;

    setBusy(false);
  } catch (error) {
    setBusy(false);
    addMessage(C.error, findMsg(error), C.P1);
  }
}

function checkLogOpenPosition(log, aPosition) {
  let productSymbol = C.none,
    type = C.none;
  if (log.flag == false) {
    addMessage(C.error, "Buy Log not Active", C.P2);
    return false;
  }

  let logCallSymbol = log.call.symbol;
  let logPutSymbol = log.put.symbol;

  for (let i = 0; i < aPosition.length; i++) {
    productSymbol = aPosition[i].info.product_symbol;
    type = aPosition[i].info.product.contract_type;
    if (
      (type === "call_options" && productSymbol !== logCallSymbol) ||
      (type === "put_options" && productSymbol !== logPutSymbol)
    ) {
      return false;
    }
  }

  return true;
}

function setLogOpenPosition(buyLog) {
  resetWithRef(M.Buy, buyLog);
}

async function setActualOpenPosition(aOpenPosition) {
  resetWithRef(M.Buy, M.I_Buy);

  let main = aOpenPosition[0];
  let mainInfo = aOpenPosition[0]?.info;
  let support;
  if (main === undefined) {
    addMessage(C.error, "Invalid Open Position", C.P2);
  }

  const { index, type, strike } = defineSymbol(main.info.product_symbol);

  // Header
  M.Buy.flag = true;
  M.Buy.mode = C.active;
  M.Buy.display = true;
  M.Buy.timestamp = main.info.created_at;
  M.Buy.index = index;
  M.Buy.type = type;
  M.Buy.lotsize = main.contractSize;
  M.Buy.amount = main.entryPrice * main.contracts * main.contractSize;
  M.Buy.supportFlag = aOpenPosition.length > 1 ? true : false;
  M.Buy.support = 0;
  M.Buy.supportPer = 0;
  M.Buy.reverse = 0;
  M.Buy.direction = aOpenPosition.length > 1 ? C.down : C.up;
  M.Buy.pnl = 0;

  if (type === C.call) {
    await fillCallOpenPosition(main, C.main);
  } else {
    await fillPutOpenPosition(main, C.main);
  }

  fillOpenPositionTrn(main, C.main);

  // Support
  if (aOpenPosition.length > 1) {
    support = aOpenPosition[1];
    fillOpenPositionTrn(support, C.support);
  }

  if (type === C.call) {
    fillPutOpenPosition(support, C.support);
  } else {
    fillCallOpenPosition(support, C.support);
  }
}

function fillOpenPositionTrn(ticker, trnType) {
  var trn = {
    flag: true,
    symbol: ticker.info.product_symbol,
    parent: M.Buy.timestamp,
    timeStamp: ticker.info.created_at,
    time: new Date(ticker.info.created_at).toTimeString().slice(0, 5),
    trnType: trnType,
    icon: getTrnIcon(trnType),
    buy: ticker.entryPrice,
    ltp: 0,
    per: 0,
  };
  M.aTrn.push(trn);
}

async function fillCallOpenPosition(position, category) {
  M.BuyCall.category = category;

  if (position?.info?.product.symbol === undefined) {
    M.BuyCall.symbol = getBuyOppositeSymbol();
    return;
  }

  M.BuyCall.flag = true;
  M.BuyCall.symbol = position.info.product.symbol;

  // Candle
  let history = await M.oDelta.fetchOHLCV(
    position.info.product_symbol,
    M.Para.timeframe,
    new Date(position.info.created_at).getTime(),
  );
  M.CallCandle = historyToCandle(history);

  // Pnl
  M.CallPnl.buy = position.entryPrice;
  M.CallPnl.qty = position.contracts;
  M.CallPnl.ltp = M.aData.find(
    (item) => (item.symbol = M.BuyCall.symbol),
  ).close;
  M.CallPnl.per = getPercentage(M.CallPnl.buy, M.CallPnl.ltp);
  M.CallPnl.usd =
    position.entryPrice * position.contracts * position.contractSize;

  // Window
  if (category == C.main) {
    initMainWindow(M.CallWindow, M.CallPnl.ltp);
  } else {
    initSupportWindow(M.CallWindow, M.CallPnl.ltp);
  }

  // Add Trn
  addTrn(M.BuyCall);
}

function addTrn(ticker) {
  var trn = {
    flag: true,
    symbol: ticker.symbol,
    type: ticker.type,
    category: ticker.category,
    icon: getTrnIcon(ticker.category),
    parent: M.Buy.timestamp,
    buyTime: new Date().getTime(),
    buyTimeText: Helper.getCurrentTimeText(),
    sellTime: 0,
    sellTimeText: " ",
    buy: ticker.pnl.buy,
    ltp: ticker.pnl.ltp,
    per: Helper.formatDecimal(ticker.pnl.per),
  };
  M.aTrn.push(trn);
}

async function fillPutOpenPosition(position, category) {
  M.BuyPut.flag = true;
  M.BuyPut.category = category;
  M.BuyPut.symbol = position.info.product.symbol;

  // Candle
  let history = await M.oDelta.fetchOHLCV(
    position.info.product_symbol,
    M.Para.timeframe,
    new Date(position.info.created_at).getTime(),
  );
  M.PutCandle = historyToCandle(history);

  // Pnl
  M.PutPnl.buy = position.entryPrice;
  M.PutPnl.qty = position.contracts;
  M.PutPnl.ltp = M.aData.find((item) => (item.symbol = M.BuyPut.symbol)).close;
  M.PutPnl.per = getPercentage(M.PutPnl.buy, M.PutPnl.ltp);
  M.PutPnl.usd =
    position.entryPrice * position.contracts * position.contractSize;

  // Window
  if (category == C.main) {
    initMainWindow(M.PutWindow, M.PutPnl.ltp);
  } else {
    initSupportWindow(M.PutWindow, M.PutPnl.ltp);
  }

  // Add Trn
  addTrn(M.BuyPut);
}

function initMainWindow(Window, Price) {
  if (Price == undefined || Price == 0) {
    return;
  }
  Window.status = true;
  Window.buy = formatDecimal(Price);
  Window.green = formatDecimal(Price);
  Window.orange = addPercentage(Price, -M.Para.hold);
  Window.red = addPercentage(Price, -M.Para.exit);
  Window.topColor = C.greenWindow;
  Window.bottomColor = C.orangeWindow;
}

function initSupportWindow(Window, Price) {
  if (Price == undefined || Price == 0) {
    return;
  }
  Window.status = true;
  Window.buy = formatDecimal(Price);
  Window.green = 0;
  Window.orange = formatDecimal(Price);
  Window.red = addPercentage(Price, -M.P_Support.per);
  Window.topColor = C.none;
  Window.bottomColor = C.orangeWindow;
}

function captureBuy() {
  M.BuyCapture.call = M.CallCandle.close;
  M.BuyCapture.put = M.PutCandle.close;
  M.BuyCapture.delta = M.DeltaCandle.close;
  M.BuyCapture.callPer = 0;
  M.BuyCapture.putPer = 0;
  M.BuyCapture.deltaChg = 0;
}

async function upadateSymbols() {
  // Get Market Hsitory
  await getAllMarketHistory();

  // Get Market Data
  const aMarketData = await getMarketTickers();

  // Get Option Symbols
  const aOptionSymbols = getMarketToOptionSymbols(aMarketData);

  // Add Symbols
  addSymbols(C.market, M.aMarketSymbols);
  addSymbols(C.option, aOptionSymbols);
}

function getMarketToOptionSymbols(aMarketData) {
  let aOptionSymbols = [],
    strike = 0;

  for (let i = 0; i < aMarketData.length; i++) {
    const market = aMarketData[i].info;
    const index = market.underlying_asset_symbol;

    strike = getClosestStrike(market.close, market.underlying_asset_symbol);
    aOptionSymbols.push(
      undefineSymbol(index, C.call, calcCallStrike(strike, index)),
    );
    aOptionSymbols.push(
      undefineSymbol(index, C.put, calcPutStrike(strike, index)),
    );
  }
  return aOptionSymbols;
}

async function restartProcess() {
  setBusy(true, "Restart Process");

  // Init Required Para
  initChartPara();
  initTimeArray();

  // Update Symbols
  await initSymbols();
  // await upadateSymbols();

  M.Para.chart.category = C.market;
  M.Para.chart.symbol = C.btcSymbol;

  // Flags
  M.paraFlag = true;
  M.chartFlag = true;
  M.strikeFlag = true;

  setBusy(false);
}

async function dbInsertRecord() {
  const record = {
    mode: M.Buy.mode,
    timestamp: M.Buy.timestamp,
    index: M.Buy.index,
    type: M.Buy.type,
    call: M.BuyCall.symbol,
    put: M.BuyPut.symbol,
    amount: M.Buy.amount,
    pnl: M.Buy.pnl,
    support: M.Buy.support,
    supportPer: M.Buy.supportPer,
    addonCount: M.Buy.addonCount,
    addonPer: M.Buy.addonPer,
    slippage: M.Buy.slippage,
    slippagePer: M.Buy.slippagePer,
    reverse: M.Buy.reverse,
  };

  try {
    await M.recordModel.insertOne(record);
    if (M.aTrn.length > 0) {
      await M.historyModel.insertMany(M.aTrn);
    }
    addMessage(C.success, "DB => Records Saved", C.P3);
  } catch (error) {
    addMessage(C.success, error.message, C.P3);
  }
}

async function dbInsertRecord_old() {
  const record = new M.recordModel({
    mode: M.Buy.mode,
    timestamp: M.Buy.timestamp,
    index: M.Buy.index,
    type: M.Buy.type,
    call: M.BuyCall.symbol,
    put: M.BuyPut.symbol,
    amount: M.Buy.amount,
    pnl: M.Buy.pnl,
    support: M.Buy.support,
    supportPer: M.Buy.supportPer,
    addonCount: M.Buy.addonCount,
    addonPer: M.Buy.addonPer,
    slippage: M.Buy.slippage,
    slippagePer: M.Buy.slippagePer,
    reverse: M.Buy.reverse,
  });

  // Save Record
  record
    .save()
    .then((doc) => addMessage(C.success, "DB => Record Saved", C.P3))
    .catch((err) => addMessage(C.error, "Error saving DB Record", C.P3));

  // Save History
  M.historyModel
    .insertMany(M.aTrn)
    .then((docs) => {
      addMessage(C.success, "DB => History Saved", C.P3);
    })
    .catch((err) => {
      addMessage(C.error, "Error saving DB History", C.P3);
    });
}
async function initMongoDb() {
  try {
    const uri = process.env.DB_URL;
    const client = new MongoClient(uri);
    const database = client.db("delta");
    M.recordModel = database.collection("record");
    M.historyModel = database.collection("history");
  } catch (error) {
    addMessage(C.error, error.message, C.P3);
  }
}

function initEmail() {
  // Declare
  M.transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.FROM,
      pass: process.env.PASS,
    },
  });

  // Compose
  M.mailOptions = {
    from: process.env.FROM,
    to: process.env.TO,
  };
}

async function notifyMe(tag, message, priority) {
  // Email
  if (M.P_Notify.email === true) {
    sendEmail(message);
  }

  // // Whatsapp
  // if (M.P_Notify.email === true) {
  //   sendWhatsapp(Message);
  // }

  // Notification
  if (M.P_Notify.notification === true) {
    sendNotification(tag, message, priority);
  }
}

async function sendNotification(tag, message, priority) {
  //  Title: message,
  await fetch(process.env.NOTIFY_URL, {
    method: "POST", // PUT works too
    body: "⠀",
    headers: { Tags: tag, Title: message, Priority: priority },
  });
}

async function sendEmail(Message) {
  M.mailOptions.subject = Message;
  // Send Mail
  M.transporter.sendMail(M.mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}

function addChartSymbol(chart) {
  if (chart.callSymbol === 0 || chart.putSymbol === 0) {
    return;
  }
  let find;
  let aSymbols = [];

  // Call
  find = M.aData.some((row) => row.symbol === chart.callSymbol);
  if (find === false) {
    aSymbols.push(chart.callSymbol);
  }
  // Put
  find = M.aData.some((row) => row.symbol === chart.putSymbol);
  if (find === false) {
    aSymbols.push(chart.putSymbol);
  }

  if (aSymbols.length > 0) {
    addSymbols(C.chart, aSymbols);
  }
}

////////////////////////////////////////////////////
//                Export Functions                //
////////////////////////////////////////////////////
module.exports = {
  addMessage,
  initPara,
  getWallet,
  initSymbols,
  setBusy,
  checkNewCandle,
  updateDataTickers,
  resetWithRef,
  findMsg,
  formatDecimal,
  getPercentage,
  addPercentage,
  getDelta,
  resetTrack,
  getInterval,
  getRange,
  initScalePara,
  sendBarStrikes,
  resetPnl,
  sendMessage,
  sendData,
  restartServer,
  historyToCandle,
  addSymbols,
  readLog,
  updateLog,
  deleteLog,
  updateCandle,
  isObject,
  getLiveData,
  validateBuySymbols,
  getCurrentTime,
  getCurrentTimeText,
  initDeltaWindow,
  updateDeltaWindow,
  getOpenPosition,
  checkVolumeTrigger,
  checkOiTrigger,
  checkAlarmTrigger,
  performAction,
  upadateSymbols,
  restartProcess,
  setChartTimelines,
  setExpiryPara,
  dbInsertRecord,
  initMongoDb,
  setDeltaWindow,
  captureBuy,
  initEmail,
  notifyMe,
  addChartSymbol,
  setAlert,
  initExpiryPara,
};
