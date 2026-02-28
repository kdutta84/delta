var M = require("../model/Model");
var C = require("../model/Constant");
var Helper = require("../utils/Helper");

async function initBuy() {
  // Validation
  if (M.Buy.flag) {
    Helper.addMessage(C.error, "Buy ==> Already Exists", C.P2);
    return;
  }

  try {
    // Set Buys Flag
    Helper.setBusy(true, "Init Buy");

    // Pre Buy Setup
    preBuySetup();

    // Init Buy Header
    initbuyHeader();

    // Init Addon
    Helper.resetWithRef(M.BuyAddon, M.I_Buy.addon);

    // Init Options
    if (M.P_Buy.type == C.call) {
      Helper.addMessage(C.info, "Init Buy ==> Call (Main)", C.P2);
      await initBuyCall();
    } else if (M.P_Buy.type == C.put) {
      Helper.addMessage(C.info, "Init Buy ==> Put (Main)", C.P2);
      await initBuyPut();
    } else {
      resetBuy();
      throw new Error("Invalid Buy Type");
    }

    // Init Support
    if (M.P_Support.flag === true) {
      initSupport();
    }

    // Init Delta
    if (M.P_SupportDelta.flag === true) {
      initDelta();
    }

    // Add Buy Data
    addBuyData();

    // Capture Buy
    Helper.captureBuy();

    // Flags
    M.paraFlag = true;
    M.strikeFlag = true;
    // M.chartFlag = true;

    // Update Buy Log
    Helper.updateLog(C.buy);

    // Reset Busy Flag
    Helper.setBusy(false);
  } catch (error) {
    resetBuy();
    Helper.setBusy(false);
    Helper.addMessage(C.error, Helper.findMsg(error));
  }
}

async function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function initBuyCall() {
  ///////////////  Main --> Call  ///////////////
  if (M.BuyCall.flag === true) {
    Helper.notifyMe(C.error + "Buy Error ==> Call (Main) Exists");
    throw new Error("Buy Error ==> Call (Main) Exists");
  }

  try {
    // Init Call
    M.BuyCall.symbol = M.P_Buy.callSymbol;
    M.BuyCall.type = C.call;
    M.BuyCall.category = C.main;

    // Buy Order with Addon
    var order = await buyMain(M.BuyCall, true);

    if (order == undefined) {
      throw new Error("No Order Processed");
    }
  } catch (error) {
    Helper.addMessage(C.error, "Buy Call ==> " + error);
  }
}

async function initBuyPut() {
  ////////////// Main --> Put  //////////////
  if (M.BuyPut.flag === true) {
    Helper.notifyMe(C.error + "Buy Error ==> Put (Main) Exists");
    Helper.addMessage(C.error, "Buy Error ==> Put (Main) Exists");
    return;
  }
  try {
    M.BuyPut.symbol = M.P_Buy.putSymbol;
    M.BuyPut.type = C.put;
    M.BuyPut.category = C.main;

    // Buy Put
    var order = await buyMain(M.BuyPut, true);

    if (order == undefined) {
      throw new Error("Buy => Put (Main)");
    }
  } catch (error) {
    throw new Error("Buy Put => " + error);
  }
}

function resetBuy() {
  Helper.resetWithRef(M.P_Buy, M.I_Para.buy);
  Helper.resetWithRef(M.Buy, M.I_Buy);
  Helper.resetWithRef(M.Buy.addon, M.I_Buy.addon);
}

function resetAddon() {
  Helper.resetWithRef(M.Buy.addon, M.I_Buy.addon);
}

function addBuyData() {
  if (M.P_Buy?.callSymbol === undefined || M.P_Buy?.callSymbol === undefined) {
    throw new Error("Invalid Buy Symbols");
  }
  let callTicker = M.aData.find((item) => item.symbol == M.P_Buy.callSymbol);
  let putTicker = M.aData.find((item) => item.symbol == M.P_Buy.putSymbol);
  if (callTicker === undefined || putTicker === undefined) {
    throw new Error("Cannot Add Ticker Data");
  }

  let call = JSON.parse(JSON.stringify(callTicker));
  let put = JSON.parse(JSON.stringify(putTicker));

  call.category = C.buy;
  M.aData.push(call);

  put.category = C.buy;
  M.aData.push(put);
}

function getBuyQty(Ticker) {
  if (
    Ticker?.pnl?.ltp == undefined ||
    M.Buy?.amount == undefined ||
    M.Buy?.lotsize == undefined ||
    Ticker?.pnl?.ltp == 0 ||
    M.Buy?.amount == 0 ||
    M.Buy?.lotsize == 0
  ) {
    return 0;
  }

  var qty = Math.round(M.Buy.amount / Ticker.pnl.ltp / M.Buy.lotsize) ?? 0;
  if (qty == undefined) {
    throw new Error("Invalid Buy Quantity");
  }
  return qty;
}

async function buyMain(Ticker, buyAddonFlag) {
  var order;

  if (Ticker?.flag === undefined) {
    throw new Error("Invalid Order Ticker");
  }

  if (Ticker.flag === true) {
    throw new Error(Ticker.type + " (Main) Exists");
  }

  // Place Buy Order
  order = await buyOrder(Ticker, buyAddonFlag);

  if (order == undefined) {
    Helper.notifyMe(C.error + " : Buy ==> " + Ticker.type + " (Main)");
    throw new Error("Buy ==> " + Ticker.type + " (Main)");
  }

  // Init Main
  initMain(Ticker, order);

  if (M.P_SupportDelta.flag === true && M.DeltaWindow.status === false) {
    Helper.initDeltaWindow();
  }

  // Init Addon
  if (M.BuyAddon.flag === true) {
    initAddon(Ticker, order);
  }

  // Slippage
  let slippagePer = Ticker.pnl.buySlp + M.AddonPnl.buySlp;
  if (slippagePer != 0) {
    M.Buy.slippage = M.Buy.slippage + 1;
    M.Buy.slippagePer = Helper.formatDecimal(M.Buy.slippagePer + slippagePer);
  }
  return order;
}

async function sellMain(Ticker) {
  // Validation
  if (Ticker.flag == false) {
    Helper.addMessage(C.error, "Cannot Sell Main, Dont Exists", C.P2);
    return;
  }

  // Sell Order
  var order = await sellOrder(Ticker);

  if (order == undefined) {
    throw new Error("Sell Main ==> " + Ticker.type + " Order Not Found");
  }

  // Update Ticker
  Ticker.flag = false;
  M.Buy.supportFlag = false;
  M.Buy.direction = C.up;

  updatePnl(Ticker, order);

  // Reset Window
  resetWindow(Ticker.window);

  // Start Support Trn
  updateTrn(C.sell, Ticker);

  // Support %
  M.Buy.supportPer = Helper.formatDecimal(M.Buy.supportPer + Ticker.pnl.per);

  // // Slippage
  // let slippagePer = Ticker.pnl.sellSlp + M.AddonPnl.sellSlp;
  // if (slippagePer < 0) {
  //   M.Buy.slippage = M.Buy.slippage + 1;
  //   M.Buy.slippagePer = Helper.formatDecimal(M.Buy.slippagePer + slippagePer);
  // }

  // Settle Addon
  if (M.BuyAddon.flag === true && Ticker.type === M.BuyAddon.type) {
    Ticker.addon = false;
    settleAddon(Ticker, order);
  }
  // Send Message
  Helper.addMessage(C.success, "Sell =>" + Ticker.type + " (Main)", C.P2);

  return order;
}

function initAddon(Ticker, order) {
  // Parent
  Ticker.addon = true;

  // Addon Header
  M.BuyAddon.flag = true;
  M.BuyAddon.parent = Ticker.flag;
  M.BuyAddon.symbol = Ticker.symbol;
  M.BuyAddon.type = Ticker.type;
  M.BuyAddon.category = Ticker.category + C.addon;

  // Count
  M.Buy.addonCount = M.Buy.addonCount + 1;

  // Init Addon Pnl
  initPnl(M.BuyAddon, order);

  // Trn
  updateTrn(C.buy, M.BuyAddon);

  // Send Message
  Helper.addMessage(C.success, "Buy => " + Ticker.type + " (Addon)", C.P2);
}

function initBuyInfo(Ticker) {
  initbuyHeader();
}

function initMain(Ticker, order) {
  // Header
  Ticker.flag = true;
  Ticker.category = C.main;

  // Pnl
  initPnl(Ticker, order);

  // Init Main Candle
  initCandle(Ticker.candle, order.average);

  // Window
  initMainWindow(Ticker.window, order.average);

  // Trn
  updateTrn(C.buy, Ticker);

  // Send Message
  Helper.addMessage(C.success, "Buy => " + Ticker.type + " (Main)", C.P2);
  Helper.notifyMe(C.success, " : Buy ==> " + Ticker.type + " (Main)");
}

function initPnl(Ticker, order) {
  Ticker.pnl.buySlp = Helper.formatDecimal(
    (Helper.getPercentage(Ticker.pnl.ltp, order.average) * Ticker.pnl.qty) /
      order.amount,
  );
  Ticker.pnl.ltp = Helper.formatDecimal(order.average);
  Ticker.pnl.buy = Helper.formatDecimal(order.average);
  Ticker.pnl.per = 0;
}

function initCandle(candle, ltp) {
  if (candle !== undefined && ltp > 0) {
    candle.open = ltp;
    candle.high = ltp;
    candle.low = ltp;
    candle.close = ltp;
  }
}

function initMainWindow(Window, Price) {
  if (Window === undefined || Price === undefined || Price === 0) {
    return;
  }

  Window.status = true;
  Window.buy = Helper.formatDecimal(Price);
  Window.green = Helper.formatDecimal(Price);
  Window.orange = Helper.addPercentage(Price, -M.Para.hold);
  Window.red = Helper.addPercentage(Price, -M.Para.exit);
  Window.topColor = C.greenWindow;
  Window.bottomColor = C.orangeWindow;
}

function initSupport() {
  if (M.Buy.type == C.call) {
    initPutSupport(false);
  } else if (M.Buy.type == C.put) {
    initCallSupport(false);
  } else {
    throw new Error("Invalid Buy Type");
  }
}

function initBuySupport(order) {
  if (M.Buy.type == C.call) {
    initPutSupport(true, order);
  } else if (M.Buy.type == C.put) {
    initCallSupport(true, order);
  } else {
    throw new Error("Invalid Buy Type");
  }
}

function initCallSupport(buyStatus, order) {
  if (M.P_Buy?.callSymbol === undefined) {
    return;
  }

  // Header
  M.BuyCall.symbol = M.P_Buy.callSymbol;
  M.BuyCall.type = C.call;
  M.BuyCall.category = C.support;

  let ticker = M.aData.find((item) => item.symbol === M.BuyCall.symbol);
  if (ticker === undefined) {
    throw new Error("Error in Call Candle");
  }

  // Candle
  initCandle(M.CallCandle, ticker.close);

  if (buyStatus === false) {
    M.BuyCall.flag = false;
  } else {
    M.BuyCall.flag = true;

    // Pnl
    initPnl(M.BuyCall, order);

    // Window
    if (M.P_Support.flag === true) {
      initSupportWindow(M.CallWindow, order.average);
    }
  }
}

function initPutSupport(buyStatus, order) {
  if (M.P_Buy?.putSymbol === undefined) {
    return;
  }

  // Header
  M.BuyPut.symbol = M.P_Buy.putSymbol;
  M.BuyPut.type = C.put;
  M.BuyPut.category = C.support;

  let ticker = M.aData.find((item) => item.symbol === M.BuyPut.symbol);
  if (ticker === undefined) {
    throw new Error("Error in Put Candle");
  }

  // Candle
  initCandle(M.PutCandle, ticker.close);

  if (buyStatus === false) {
    M.BuyPut.flag = false;
  } else {
    M.BuyPut.flag = true;

    // Pnl
    initPnl(M.BuyPut, order);

    // Window
    if (M.P_Support.flag === true) {
      initSupportWindow(M.PutWindow, order.average);
    }
  }
}

function initDelta() {
  // Init Delta Buy Candle
  initDeltaBuyCandle();

  // Init Delta Candle
  initDeltaCandle();

  // Init Delta Window
  if (M.P_SupportDelta.flag === true && M.DeltaWindow.status === false) {
    Helper.initDeltaWindow();
  }
}

function initDeltaBuyCandle() {
  let delta = getbuyDelta();
  initCandle(M.DeltaBuyCandle, delta);
}

function getbuyDelta() {
  if (
    M.Buy.flag === false ||
    M.Buy?.call?.symbol === undefined ||
    M.Buy?.put?.symbol === undefined
  ) {
    return 0;
  }
  // Tickers
  let callTicker = M.aData.find((item) => item.symbol === M.BuyCall.symbol);
  let putTicker = M.aData.find((item) => item.symbol === M.BuyPut.symbol);
  if (callTicker === undefined || putTicker === undefined) {
    return 0;
  }
  let delta = Helper.getDelta(
    Helper.getPercentage(callTicker.open, callTicker.close),
    Helper.getPercentage(putTicker.open, putTicker.close),
  );
  if (delta === undefined) {
    return 0;
  } else {
    return delta;
  }
}

function initDeltaCandle() {
  var candle = {};
  // Tickers
  let callTicker = M.aData.find((item) => item.symbol === M.BuyCall.symbol);
  let putTicker = M.aData.find((item) => item.symbol === M.BuyPut.symbol);

  var CeHigh = Helper.getPercentage(callTicker.open, callTicker.high);
  var PeLow = Helper.getPercentage(putTicker.open, putTicker.low);
  var side_1 = Helper.getDelta(CeHigh, PeLow);

  var CeLow = Helper.getPercentage(callTicker.open, callTicker.low);
  var PeHigh = Helper.getPercentage(putTicker.open, putTicker.high);
  var side_2 = Helper.getDelta(CeLow, PeHigh);

  var CeClose = Helper.getPercentage(callTicker.open, callTicker.close);
  var PeClose = Helper.getPercentage(putTicker.open, putTicker.close);
  var close = Helper.getDelta(CeClose, PeClose);

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

  if (candle === undefined) {
    throw new Error("Invalid Delta Candle");
  }

  // Assign Delta Candle
  M.DeltaCandle = candle;
}

async function buyOrder(Ticker, buyAddonFlag) {
  let order = {};
  let qty = 0;
  let share = 1;

  // Validation
  if (Ticker.flag == true) {
    throw new Error(Ticker.type + " Exists");
  }

  // Get Qty
  let data = M.aData.find(
    (item) => item.category === C.option && item.symbol === Ticker.symbol,
  );

  if (data?.close == undefined || data?.close == 0) {
    throw new Error("Invalid Ticker LTP - " + data.symbol);
  }

  // Set Buy Order Info
  Ticker.pnl.ltp = data.close;
  Ticker.pnl.qty = getBuyQty(Ticker);
  Ticker.pnl.usd = M.Buy.amount;
  qty = Ticker.pnl.qty;

  if (
    buyAddonFlag === true &&
    M.P_Addon.flag === true &&
    Ticker.addon === false &&
    M.BuyAddon.flag === false
  ) {
    getAddonQty(Ticker);
    qty = qty + M.AddonPnl.qty;
  }

  switch (M.Para.switch) {
    case C.active:
      switch (M.Para.orderType) {
        case C.market:
          order = await buyMarketOrder(Ticker, qty);
          break;
        case C.limit:
          order = await buyLimitOrder(Ticker, qty);
          break;
        default:
          throw new Error("Invalid Order Type");
      }
      break;
    case C.test:
      order = await buyTestOrder(Ticker, qty);
      break;
    case C.none:
      throw new Error("Switch Inactive");
    default:
      throw new Error("Invalid Switch");
  }

  // Addon
  if (M.BuyAddon.flag === true) {
    M.AddonPnl.buy = Helper.formatDecimal(order.average);
    share = share + M.P_Addon.value;
    M.AddonPnl.qty = Helper.formatDecimal(
      (order.amount / share) * M.P_Addon.value,
    );
    M.AddonPnl.usd = Helper.formatDecimal(
      (order.cost / share) * M.P_Addon.value,
    );
  }

  // Ticker
  Ticker.pnl.buy = Helper.formatDecimal(order.average);
  Ticker.pnl.qty = Helper.formatDecimal(order.amount / share);
  Ticker.pnl.usd = Helper.formatDecimal(order.cost / share);

  return order;
}

async function sellOrder(Ticker) {
  var order = {};

  // Validation
  if (Ticker.flag == false) {
    throw new Error("Sell ==> " + Ticker.type + " Dont Exists");
  }

  if (M.Para.switch == C.active) {
    if (M.Para.orderType == C.market) {
      order = await sellMarketOrder(Ticker);
    } else {
      order = await sellLimitOrder(Ticker);
    }
  } else {
    order = await sellTestOrder(Ticker);
  }

  return order;
}

async function buyMarketOrder(Ticker, Qty) {
  try {
    const order = await M.oDelta.createOrder(
      Ticker.symbol,
      C.marketOrder,
      C.buyOrder,
      Qty,
    );
    return order;
  } catch (error) {
    Helper.addMessage(C.error, Helper.findMsg(error), C.P1);
  }
}

function getSellQty(Ticker) {
  switch (Ticker.category) {
    case C.main:
    case C.support:
      qty = Ticker.pnl.qty;
      if (Ticker.addon === true && M.BuyAddon.flag === true) {
        qty = qty + M.AddonPnl.qty;
      }
      break;
    case C.mainAddon:
      let parent,
        parentQty = 0;

      if (Ticker.parent === true && M.BuyAddon.flag === true) {
        if (Ticker.type === C.call) {
          parent = M.BuyCall;
        } else {
          parent = M.BuyPut;
        }
        parentQty = getBuyQty(parent);
        qty = parent.pnl.qty + M.AddonPnl.qty - parentQty;
        parent.pnl.qty = parentQty;
      } else {
        qty = Ticker.pnl.qty;
      }
      break;
    case C.supportAddon:
      qty = Ticker.pnl.qty;
      break;
  }
  return qty;
}

async function sellMarketOrder(Ticker) {
  // Sell Qty
  let qty = getSellQty(Ticker);

  try {
    const order = await M.oDelta.createOrder(
      Ticker.symbol,
      C.marketOrder,
      C.sellOrder,
      qty,
    );
    return order;
  } catch (error) {
    Helper.addMessage(C.error, "Delta Exc :- " + error.message, C.P1);
  }
}

async function buyLimitOrder(Ticker, Qty) {
  try {
    const order = await M.oDelta.createOrder(
      Ticker.symbol,
      C.limitOrder,
      C.buyOrder,
      Qty,
      Ticker.pnl.ltp,
    );
    return order;
  } catch (error) {
    Helper.addMessage(C.error, "Delta Exc :- " + error.message, C.P1);
  }
}

async function sellLimitOrder(Ticker) {
  // Sell Qty
  let qty = getSellQty(Ticker);

  if (Ticker.addon === true) {
    Ticker.addon = false;
    qty = qty + M.AddonPnl.qty;
  }
  try {
    const order = await M.oDelta.createOrder(
      Ticker.symbol,
      C.limitOrder,
      C.sellOrder,
      qty,
      Ticker.pnl.ltp,
    );
    return order;
  } catch (error) {
    Helper.addMessage(C.error, "Delta Exc :- " + error.message, C.P1);
  }
}

async function buyTestOrder(Ticker, Qty) {
  let res = await delay(500);
  return (order = {
    average: Ticker.pnl.ltp,
    amount: Qty,
    cost: Helper.formatDecimal(Ticker.pnl.usd + M.AddonPnl.usd),
  });
}

async function sellTestOrder(Ticker) {
  // Sell Qty
  let qty = getSellQty(Ticker);

  let res = await delay(500);
  return (order = {
    average: Ticker.pnl.ltp,
    amount: qty,
    cost: qty * Ticker.pnl.ltp * M.Buy.lotsize,
  });
}

function getAddonQty(Ticker) {
  // Addon Qty
  if (M.P_Addon?.flag === true && M.BuyAddon?.flag === false) {
    M.BuyAddon.flag = true;
    M.AddonPnl.ltp = Ticker.pnl.ltp;
    M.AddonPnl.qty = Ticker.pnl.qty * M.P_Addon.value;
    M.AddonPnl.usd = M.Buy.amount * M.P_Addon.value;
  }
  // return M.AddonPnl.qty;
}

function preBuySetup() {
  // Reset Buy Delta
  M.P_BuyDelta.flag = false;

  // Reset Tracking
  Helper.resetTrack();

  // Reset Buy Info (Not Para Buy )
  Helper.resetWithRef(M.Buy, M.I_Buy);

  // Reset Trn
  M.aTrn = [];

  // Clear Old Logs
  Helper.deleteLog(C.buy);
  Helper.deleteLog(C.trn);
}

function initbuyHeader() {
  M.Buy.flag = true;
  M.Buy.mode = M.Para.switch;
  M.Buy.display = true;
  M.Buy.timestamp = new Date().getTime();
  M.Buy.index = M.P_Buy.index;
  M.Buy.type = M.P_Buy.type;
  M.Buy.supportFlag = false;
  M.Buy.direction = C.up;
  M.Buy.amount = M.P_Account.amount;
  M.Buy.lotsize = getLotsize(M.Buy.index);
}

function getTrnIcon(Type) {
  switch (Type) {
    case C.main:
    case C.mainAddon:
      return "sap-icon://cart";
    case C.support:
    case C.supportAddon:
      return "sap-icon://compare";
    case C.reverse:
      return "sap-icon://decrease-line-height";
  }
}

function updateTrn(action, ticker) {
  var record;
  if (ticker == undefined) {
    Helper.addMessage(C.error, "Error updating Trn History", C.P2);
    return;
  }

  switch (action) {
    case C.buy:
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
        buy: Helper.formatDecimal(ticker.pnl.buy),
        ltp: Helper.formatDecimal(ticker.pnl.ltp),
        per: Helper.formatDecimal(ticker.pnl.per),
        buySlp: Helper.formatDecimal(ticker.pnl.buySlp),
        sellSlp: "",
      };

      M.aTrn.push(trn);
      break;
    case C.sell:
      var record = M.aTrn.find(
        (item) =>
          item.flag == true &&
          item.category == ticker.category &&
          item.symbol == ticker.symbol,
      );
      if (record != undefined) {
        record.flag = false;
        record.sellTime = new Date().getTime();
        record.sellTimeText = Helper.getCurrentTimeText();
        record.ltp = Helper.formatDecimal(ticker.pnl.ltp);
        record.per = Helper.formatDecimal(ticker.pnl.per);
        record.sellSlp = Helper.formatDecimal(ticker.pnl.sellSlp);
      }
      break;
    case C.reverse:
      var record = M.aTrn.find(
        (item) =>
          item.flag == true &&
          item.category == ticker.category &&
          item.symbol == ticker.symbol,
      );

      // Reverse Category
      if (record != undefined) {
        if (record.category === C.main) {
          record.category = C.support;
        } else if (record.category === C.support) {
          record.category = C.main;
        } else if (record.category === C.mainAddon) {
          record.category = C.supportAddon;
        } else if (record.category === C.supportAddon) {
          record.category = C.mainAddon;
        }
        // Upadte Reverse Icon
        record.icon = getTrnIcon(ticker.category);
      }
      break;
    case C.update:
      var record = M.aTrn.find(
        (item) => item.flag == true && item.symbol == ticker.symbol,
      );
      if (record != undefined) {
        // Update Info
        record.category = ticker.category;
        record.icon = getTrnIcon(ticker.category);
        record.buy = Helper.formatDecimal(ticker.pnl.buy);
      }
      break;
    case C.adjust:
      record = M.aTrn.find(
        (item) =>
          item.flag == true &&
          item.category == ticker.category &&
          item.symbol == ticker.symbol,
      );
      // Adjust %
      if (record != undefined) {
        var trn = { ...record };
        trn.flag = false;
        trn.ltp = ticker.pnl.ltp;
        trn.category = record.category + C.adjust;
        trn.sellTime = new Date().getTime();
        trn.sellTimeText = Helper.getCurrentTimeText();
        trn.sellSlp = 0;
      }

      M.aTrn.push(trn);

      // Reset Parent
      record.buy = ticker.pnl.ltp;
      record.ltp = ticker.pnl.ltp;
      record.per = 0;
      record.buySlp = 0;
      break;
    default:
      throw new Error("Invalid Trn Action");
  }

  // Update Trn Log
  Helper.updateLog(C.trn);
}

function getLotsize(index) {
  switch (index) {
    case C.btc:
      return C.btcLotsize;
    case C.eth:
      return C.ethLotsize;
    default:
      throw new Error("Invalid Lotsize");
  }
}

async function processBuy() {
  // Update Buy Candle
  updateBuyCandle();

  // Update Buy Pnl
  updateBuyPnl();

  // Update Trn
  updateTrnLtp();

  // Update Capture
  updateCapture();

  // Validate Pnl
  await validateBuyPnl();

  // Check if Buy still exists
  if (M.Buy.flag === false) {
    return;
  }

  // Process Buy Type
  switch (M.Buy.type) {
    case C.call:
      await processCall();
      break;
    case C.put:
      await processPut();
      break;
    default:
      throw new Error("Invalid Buy Type");
  }

  // Process Addon
  if (M.P_SupportDelta.flag === true) {
    await processAdddon();
  }

  // Trail Windows
  trailWindows();
}

function updateCapture() {
  M.BuyCapture.callPer = Helper.getPercentage(
    M.BuyCapture.call,
    M.CallCandle.close,
  );
  M.BuyCapture.putPer = Helper.getPercentage(
    M.BuyCapture.put,
    M.PutCandle.close,
  );
  let delta = Helper.getDelta(M.CallCandle.candlePer, M.PutCandle.candlePer);
  M.BuyCapture.deltaChg = delta - M.BuyCapture.delta;
}

function updateBuyCandle() {
  // Update Call Candle
  updateCallCandle();

  // Update Put Candle
  updatePutCandle();

  // Update Delta Candle
  updateDeltaCandle();
}

function updateCallCandle() {
  let ticker = M.aData.find(
    (item) => item.category === C.buy && item.symbol === M.BuyCall.symbol,
  );

  if (ticker?.close == undefined || ticker?.close == 0) {
    return;
  }

  // Update Buy Call Candle
  Helper.updateCandle(M.CallCandle, ticker.close);

  // Update Buy Call %
  M.CallCandle.buyPer = Helper.getPercentage(
    M.CallCandle.open,
    M.CallCandle.close,
  );

  // Update Candle Call  %
  M.CallCandle.candlePer = ticker.per;
}

function updatePutCandle() {
  let ticker = M.aData.find(
    (item) => item.category === C.buy && item.symbol === M.BuyPut.symbol,
  );

  if (ticker?.close == undefined || ticker?.close == 0) {
    return;
  }

  // Update Put Buy Candle
  Helper.updateCandle(M.PutCandle, ticker.close);

  // Update Put Buy %
  M.PutCandle.buyPer = Helper.getPercentage(
    M.PutCandle.open,
    M.PutCandle.close,
  );

  // Update Put Candle %
  M.PutCandle.candlePer = ticker.per;
}

function updateDeltaCandle() {
  if (
    M.CallCandle?.candlePer === undefined ||
    M.PutCandle?.candlePer === undefined
  ) {
    return;
  }

  let delta = Helper.getDelta(M.CallCandle.candlePer, M.PutCandle.candlePer);

  // Update Delta Candle
  Helper.updateCandle(M.DeltaCandle, delta);

  // Update Buy Delta Candle
  Helper.updateCandle(M.DeltaBuyCandle, delta);

  // Validate Sell Condition
  if (
    M.P_SellDelta.flag === true &&
    M.DeltaCandle.close < M.P_SellDelta.count
  ) {
    Helper.performAction(C.delta, M.P_SellDelta.action, M.Buy.index, C.both);
    M.P_SellDelta.flag = false;
    M.paraFlag = true;
  }
}

function updateBuyPnl() {
  // Update Call Pnl
  updateCallPnl();

  // Update Put Pnl
  updatePutPnl();

  // Update Addon Pnl
  updateAddonPnl();

  // Update Final Pnl
  updateFinalPnl();
}

function updateCallPnl() {
  // Buy Call Pnl
  if (M.BuyCall.flag == true && M.CallPnl.buy > 0) {
    M.CallPnl.ltp = M.CallCandle.close;
    M.CallPnl.per = Helper.getPercentage(M.CallPnl.buy, M.CallPnl.ltp) ?? 0;
  }
}

function updatePutPnl() {
  if (M.BuyPut.flag == true && M.PutPnl.buy > 0) {
    M.PutPnl.ltp = M.PutCandle.close;
    M.PutPnl.per = Helper.getPercentage(M.PutPnl.buy, M.PutPnl.ltp) ?? 0;
  }
}

function updateAddonPnl() {
  if (M.BuyAddon.flag == true && M.AddonPnl.buy > 0) {
    if (M.BuyAddon.type == C.call) {
      M.AddonPnl.ltp = M.CallCandle.close;
    } else {
      M.AddonPnl.ltp = M.PutCandle.close;
    }

    M.AddonPnl.per = Helper.getPercentage(M.AddonPnl.buy, M.AddonPnl.ltp) ?? 0;

    // Consider the Addon Count
    if (M.P_Addon.value > 1) {
      M.AddonPnl.per = Helper.formatDecimal(M.AddonPnl.per * M.P_Addon.value);
    }
  }
}

function updateFinalPnl() {
  let callPnl = 0,
    putPnl = 0,
    addonPnl = 0;

  if (M.BuyCall.flag === true) {
    callPnl = M.CallPnl.per;
  }

  if (M.BuyPut.flag === true) {
    putPnl = M.PutPnl.per;
  }

  if (M.BuyAddon.flag === true) {
    addonPnl = M.AddonPnl.per;
  }

  M.Buy.pnl = Helper.formatDecimal(
    callPnl + putPnl + addonPnl + M.Buy.supportPer + M.Buy.addonPer,
  );
}

function updateTrnLtp() {
  for (let i = 0; i < M.aTrn.length; i++) {
    let row = M.aTrn[i];
    if (row.flag === false) {
      continue;
    }

    // Update Call Ltp
    if (row.symbol == M.BuyCall.symbol) {
      row.ltp = M.CallCandle.close;
      row.per = Helper.getPercentage(row.buy, row.ltp);
    }

    // Update Put Ltp
    if (row.symbol == M.BuyPut.symbol) {
      row.ltp = M.PutCandle.close;
      row.per = Helper.getPercentage(row.buy, row.ltp);
    }

    // Update Addon Per / Count
    if (
      M.P_Addon.value > 1 &&
      (row.category === C.mainAddon || row.category === C.supportAddon)
    ) {
      row.per = Helper.formatDecimal(row.per * M.P_Addon.value);
    }
  }
}

async function validateBuyPnl() {
  // Validate Profit & Loss
  if (M.Buy.pnl > M.Para.profit || M.Buy.pnl < M.Para.loss) {
    // Trigger Message

    Helper.addMessage(C.info, "Sell Both ==> Pnl Target Reached", C.P2);
    await sellBoth();
    return;
  }

  // Trail Pnl
  if (M.Buy.pnl > M.Buy.max) {
    M.Buy.max = Helper.formatDecimal(M.Buy.pnl, 0);
  }

  if (M.Buy.pnl < M.Buy.min) {
    M.Buy.min = Helper.formatDecimal(M.Buy.pnl, 0);
  }

  // From Buy
  M.Buy.fromMax = Helper.formatDecimal(M.Buy.pnl - M.Buy.max, 0);
  M.Buy.fromMin = Helper.formatDecimal(M.Buy.pnl - M.Buy.min, 0);

  // Profit Trail
  if (M.P_ProfitTrail.flag === true && M.Buy.fromMax < -M.P_ProfitTrail.per) {
    Helper.addMessage(C.info, "Profit Trail Hit", C.P2);
    await sellBoth();
    return;
  }

  // Loss Trail
  if (M.P_LossTrail.flag === true && M.Buy.fromMin > M.P_LossTrail.per) {
    Helper.addMessage(C.info, "Loss Trail Hit", C.P2);
    await sellBoth();
    return;
  }
}

async function manageBuy() {
  let buyType = C.none;

  if (
    M.BuyCapture?.callPer >= M.BuyCapture?.putPer &&
    M.BuyCapture?.callPer >= 0
  ) {
    buyType = C.call;
  }

  if (
    M.BuyCapture?.putPer >= M.BuyCapture?.callPer &&
    M.BuyCapture?.putPer >= 0
  ) {
    buyType = C.put;
  }

  if (buyType === C.none) {
    // Update Delta Window
    Helper.updateDeltaWindow();
    return;
  }

  switch (buyType) {
    case C.call:
      switch (M.BuyCall.category) {
        case C.main:
          // Sell Put Support
          if (M.BuyPut.flag === true) {
            await sellPutSupport();
          }

          // Buy Call Addon
          if (
            M.P_Addon.flag === true &&
            M.BuyCall.addon === false &&
            M.BuyAddon.flag === false
          ) {
            Helper.addMessage(C.info, "Delta Trigger ==> Call (Main)", C.P2);
            await buyAddon(M.BuyCall);
          }
          break;
        case C.support:
          // Sell Put (Main) Addon
          if (M.BuyPut.addon === true && M.BuyAddon.type === C.put) {
            await sellAddon(M.BuyPut);
          }

          // Trigger Message
          Helper.addMessage(C.info, "Delta Trigger ==> Call (Support)", C.P2);

          // Manage Call Support
          if (M.Buy.supportFlag === true) {
            // Buy Call Addon
            if (M.BuyCall.addon === false && M.P_Addon.flag === true) {
              await buyAddon(M.BuyCall);
            } else {
              // Reverse, if Already in Support with Addon
              await reversePutWithoutSupport();
            }
          } else {
            // Buy Call Support
            await buyCallSupport();
          }

          break;
      }
      break;
    case C.put:
      switch (M.BuyPut.category) {
        case C.main:
          // Sell Call Support
          if (M.BuyCall.flag === true) {
            await sellCallSupport();
          }
          // Buy Put Addon
          if (M.BuyPut.addon === false && M.P_Addon.flag === true) {
            // Trigger Message
            Helper.addMessage(C.info, "Delta Trigger ==> Put (Main)", C.P2);
            await buyAddon(M.BuyPut);
          }
          break;
        case C.support:
          // Sell Put Addon
          if (M.BuyCall.addon === true && M.BuyAddon.type === C.call) {
            await sellAddon(M.BuyCall);
          }

          // Trigger Message
          Helper.addMessage(C.info, "Delta Trigger ==> Put (Support)", C.P2);
          // Manage Put Support
          if (M.Buy.supportFlag === true) {
            // Buy Put Addon
            if (M.BuyPut.addon === false && M.P_Addon.flag === true) {
              await buyAddon(M.BuyPut);
            } else {
              // Reverse, if Already in Support with Addon
              await reverseCallWithoutSupport();
            }
          } else {
            // Buy Call Support
            await buyPutSupport();
          }
          break;
      }
      break;
  }

  // Update Delta Window
  Helper.updateDeltaWindow();
}

async function processBuyCallSupport() {
  if (M.BuyCall.flag === true) {
    return;
  }

  if (
    M.BuyCapture?.callPer > M.BuyCapture?.putPer &&
    M.BuyCapture?.callPer >= 0
  ) {
    Helper.addMessage(C.info, "Buy Support ==> Put > 0", C.P2);
    // Buy Call Support
    await buyCallSupport();

    // Update Delta Window
    Helper.updateDeltaWindow();
  }
}

async function processBuyPutSupport(condition) {
  if (M.BuyPut.flag === true) {
    return;
  }
  //  condition === true ||
  if (
    M.BuyCapture?.putPer > M.BuyCapture?.callPer &&
    M.BuyCapture?.putPer > 0
  ) {
    Helper.addMessage(C.info, "Buy Support ==> Put > 0", C.P2);

    // Buy Put Support
    await buyPutSupport();

    // Set Delta Window
    Helper.updateDeltaWindow();
  }
}
async function processBuyCallAddon(condition) {
  if (M.BuyCall.flag === false) {
    return;
  }

  if (
    condition === true ||
    (M.BuyCapture?.callPer > M.BuyCapture?.putPer && M.BuyCapture?.callPer > 0)
  ) {
    // Buy Put Addon
    order = await buyAddon(M.BuyCall);
    if (order === undefined) {
      throw new Error("Buy ==> Call (Addon)");
    }

    // Set Delta Window
    Helper.updateDeltaWindow();

    // Trigger Message
    if (M.BuyAddon.flag == true) {
      Helper.addMessage(C.info, "Support Trigger ==> Call > 0", C.P2);
    }
  }
}

async function processBuyPutAddon(condition) {
  if (M.BuyPut.flag === false) {
    return;
  }

  if (
    condition === true ||
    (M.BuyCapture?.putPer > M.BuyCapture?.callPer && M.BuyCapture?.putPer > 0)
  ) {
    // Buy Put Addon
    order = await buyAddon(M.BuyPut);
    if (order === undefined) {
      throw new Error("Buy ==> Put (Addon)");
    }

    // Set Delta Window
    Helper.updateDeltaWindow();

    // Trigger Message
    if (M.BuyAddon.flag === true) {
      Helper.addMessage(C.info, "Support Trigger ==> Put > 0", C.P2);
    }
  }
}

async function buyCallAddon() {
  let order = false;

  if (M.P_Addon.flag === false || M.BuyAddon.flag === true) {
    return order;
  }

  if (
    M.CallCandle.candlePer > M.PutCandle.candlePer &&
    M.CallCandle.candlePer > 0
  ) {
    order = await buyAddon(M.BuyCall);
  }
  return order;
}

async function processCall() {
  try {
    //////////////    LTP Below Red   ////////////////
    if (M.CallCandle.close < M.CallWindow.red) {
      if (
        M.P_SellReversal.flag == true &&
        M.P_SellReversal.count >= M.Buy.reverse + 1
      ) {
        // Max Reversal Reached
        Helper.addMessage(C.info, "Sell Both ==> Max Reversal Reached", C.P2);
        Helper.performAction(
          C.reverse,
          M.P_SellReversal.action,
          M.Buy.index,
          C.call,
        );
        M.P_SellReversal.flag = false;
        M.paraFlag = true;
        return;
      }

      // Else Reverse Options
      Helper.addMessage(C.info, "Reversal ==> Call (Main) < Red", C.P2);
      await reverseCallWithoutSupport();
      return;
    }

    //////////////    LTP Below Orange ////////////////
    if (M.CallCandle.close < M.CallWindow.orange) {
      let putCond = false;

      // Sell Call Addon
      if (M.BuyCall.addon === true) {
        // Put Condition
        putCond =
          M.BuyCapture?.putPer >= M.BuyCapture?.callPer &&
          M.BuyCapture?.putPer >= 0;

        Helper.addMessage(C.info, "Sell Addon ==> Call (Main) < Orange", C.P2);
        await sellAddon(M.BuyCall);
      }

      switch (M.BuyPut.flag) {
        case true:
          // Sell Put Support Validation
          if (M.PutCandle.close < M.PutWindow.red) {
            Helper.addMessage(C.info, "Sell ==> Put (Support) < Red", C.P2);
            await sellPutSupport();
          }
          break;
        case false:
          // Buy Put Support
          await processBuyPutSupport(putCond);
          break;
      }
    }

    //////////////    LTP Above Orange   ////////////////
    if (M.CallCandle.close > M.CallWindow.orange) {
      // Since the capture is overwritten in Put Support
      let callCond = false;

      // Sell Put Support
      if (M.BuyPut.flag === true) {
        // Call Condition
        callCond =
          M.BuyCapture?.callPer >= M.BuyCapture?.putPer &&
          M.BuyCapture?.callPer >= 0;

        Helper.addMessage(C.info, "Sell Put Support => Call > Orange", C.P2);
        await sellPutSupport();
      }

      // Buy Call Addon
      if (
        M.P_Addon.flag === true &&
        M.BuyCall.addon === false &&
        M.BuyAddon.flag === false
      ) {
        await processBuyCallAddon(callCond);
        if (M.BuyCall.addon === true && M.BuyPut.flag === false) {
          moveOrangeDown(M.BuyCall);
        }
      }
    }
  } catch (error) {
    throw new Error("Process Call ==> " + error);
  }
}

async function processPut() {
  try {
    //////////////    LTP Below Red   ////////////////
    if (M.PutCandle.close < M.PutWindow.red) {
      // "Sell : Max Reversal Reached"
      if (
        M.P_SellReversal.flag == true &&
        M.P_SellReversal.count >= M.Buy.reverse + 1
      ) {
        // Trigger Message
        Helper.addMessage(C.info, "Support Trigger => Call (Main) < Red", C.P2);

        Helper.performAction(
          C.reverse,
          M.P_SellReversal.action,
          M.Buy.index,
          C.put,
        );
        M.P_SellReversal.flag = false;
        M.paraFlag = true;
        return;
      }

      // Else Reverse Options
      Helper.addMessage(C.info, "Reversal => Put (Main) < Red ", C.P2);
      await reversePutWithoutSupport();
      return;
    }

    //////////////    LTP Below Orange ////////////////
    if (M.PutCandle.close < M.PutWindow.orange) {
      let callCond = false;

      // Sell Put Addon
      if (M.BuyPut.addon === true) {
        // Call Condition
        callCond =
          M.BuyCapture?.callPer >= M.BuyCapture?.putPer &&
          M.BuyCapture?.callPer >= 0;

        Helper.addMessage(C.info, "Sell Addon ==> Put (Main) < Orange", C.P2);
        await sellAddon(M.BuyPut);
      }

      switch (M.BuyCall.flag) {
        case true:
          // Sell Call Support Validation
          if (M.CallCandle.close < M.CallWindow.red) {
            // Trigger Message
            Helper.addMessage(C.info, "Sell ==> Call (Support) < Red", C.P2);
            await sellCallSupport(callCond);
          }
          break;
        case false:
          // Buy Call Support
          await processBuyCallSupport();
          break;
      }
    }

    //////////////    LTP Above Orange   ////////////////
    if (M.PutCandle.close > M.PutWindow.orange) {
      // Since the capture is overwritten in Call Support
      let putCond = false;

      // Sell Call Support
      if (M.BuyCall.flag === true) {
        // Put Condition
        putCond =
          M.BuyCapture?.putPer >= M.BuyCapture?.callPer &&
          M.BuyCapture?.putPer >= 0;

        Helper.addMessage(C.info, "Sell Call Support ==> Put > Orange", C.P2);
        await sellCallSupport();
      }

      // Buy Put Addon
      if (
        M.P_Addon.flag === true &&
        M.BuyPut.addon === false &&
        M.BuyAddon.flag === false
      ) {
        await processBuyPutAddon(putCond);
        if (M.BuyPut.addon === true && M.BuyCall.flag === false) {
          moveOrangeDown(M.BuyPut);
        }
      }
    }
  } catch (error) {
    throw new Error("Process Put ==> " + error);
  }
}

async function processAdddon() {
  if (
    M.DeltaCandle.close > M.DeltaWindow.target ||
    M.DeltaCandle.close < M.DeltaWindow.low
  ) {
    await manageBuy();
  }
}

async function reverseWithoutSupport() {
  try {
    // if (M.busyFlag) {
    //   Helper.addMessage(C.error, "Cannot Reverese, is Busy", C.P2);
    //   return;
    // }

    // Set Busy Flag
    // Helper.setBusy(true, "Process Data");

    if (M.Buy.type == C.call) {
      await reverseCallWithoutSupport();
    } else {
      await reversePutWithoutSupport();
    }

    // Reset Busy Flag
    // Helper.setBusy(false);
  } catch (error) {
    Helper.setBusy(false);
    Helper.addMessage(C.error, Helper.findMsg(error), C.P1);
  }
}

function reverseTrn() {
  for (let i = 0; i < M.aTrn.length; i++) {
    const trn = M.aTrn[i];
    if (trn.flag === false) {
      continue;
    }

    switch (trn.category) {
      case C.main:
        trn.category = C.support;
        trn.icon = "sap-icon://compare";
        break;
      case C.support:
        trn.category = C.main;
        trn.icon = "sap-icon://cart";
        break;
      case C.mainAddon:
        trn.category = C.supportAddon;
        trn.icon = "sap-icon://compare";
        break;
      case C.supportAddon:
        trn.category = C.mainAddon;
        trn.icon = "sap-icon://cart";
        break;
    }
  }
}

async function reverseCallWithoutSupport() {
  var order;
  let buyAddonFlag = false;

  try {
    // Sell Call
    if (M.BuyCall.flag == true) {
      order = await sellMain(M.BuyCall);
      if (order == undefined) {
        throw new Error("Sell => Call (Main)");
      }
    } else {
      throw new Error("Call Buy Not Found");
    }

    // Reverse Category
    M.BuyPut.category = C.main;
    M.BuyCall.category = C.support;

    // Buy Addon Validation
    if (
      M.P_Addon.flag === true &&
      M.BuyPut.addon === false &&
      M.BuyAddon.flag === false
    ) {
      if (
        M.BuyCapture?.putPer >= M.BuyCapture?.callPer &&
        M.BuyCapture?.putPer >= 0
      ) {
        buyAddonFlag = true;
      }
    }

    // Check Put
    if (M.BuyPut.flag == true) {
      // Init Main Window
      initMainWindow(M.PutWindow, M.PutCandle.close);

      if (buyAddonFlag === true) {
        // Buy Addon
        await buyAddon(M.BuyPut);
      } else if (
        M.BuyAddon.flag === true &&
        M.BuyAddon.symbol === M.BuyPut.symbol
      ) {
        // Reverse Category
        M.BuyAddon.category = C.mainAddon;
      }

      // Reverse Trn
      reverseTrn();
    } else {
      order = await buyMain(M.BuyPut, buyAddonFlag);
      if (order == undefined) {
        throw new Error("Buy => Put (Main)");
      }
      Helper.addMessage(C.success, "Buy => Put (Main)", C.P2);
    }

    // Update Buy Info
    M.Buy.reverse = M.Buy.reverse + 1;
    M.Buy.supportFlag = false;
    M.Buy.direction = C.up;
    M.Buy.type = C.put;

    // Update Buy Para
    M.P_Buy.type = C.put;

    // Update Para Flag
    M.paraFlag = true;

    // Capture Buy
    Helper.captureBuy();

    // Update Buy Log
    Helper.updateLog(C.buy);
  } catch (error) {
    Helper.addMessage(C.error, "Call reversal ==> " + error);
    Helper.notifyMe(C.error + "Call reversal ==> " + error);
  }
}

async function reversePutWithoutSupport() {
  var order;
  let buyAddonFlag = false;

  try {
    // Sell Put
    if (M.BuyPut.flag == true) {
      order = await sellMain(M.BuyPut);
      if (order == undefined) {
        throw new Error("Sell => Put (Main)");
      }
    } else {
      throw new Error("Put Buy Not Found");
    }

    // Reverse Category
    M.BuyCall.category = C.main;
    M.BuyPut.category = C.support;

    if (
      M.P_Addon.flag === true &&
      M.BuyCall.addon === false &&
      M.BuyAddon.flag === false
    ) {
      if (
        M.BuyCapture?.callPer >= M.BuyCapture?.putPer &&
        M.BuyCapture?.callPer >= 0
      ) {
        buyAddonFlag = true;
      }
    }

    // Check Call
    if (M.BuyCall.flag == true) {
      initMainWindow(M.CallWindow, M.CallCandle.close);

      if (buyAddonFlag === true) {
        // Buy Addon
        await buyAddon(M.BuyCall);
      } else if (
        M.BuyAddon.flag === true &&
        M.BuyAddon.symbol === M.BuyCall.symbol
      ) {
        // Reverse Category
        M.BuyAddon.category = C.mainAddon;
      }

      // Reverse Trn
      reverseTrn();
    } else {
      order = await buyMain(M.BuyCall, buyAddonFlag);
      if (order == undefined) {
        throw new Error("Buy => Call (Main)");
      }
      Helper.addMessage(C.success, "Buy => Call (Main)", C.P2);
    }

    // Update Buy Info
    M.Buy.reverse = M.Buy.reverse + 1;
    M.Buy.supportFlag = false;
    M.Buy.direction = C.up;
    M.Buy.type = C.call;

    // Update Buy Para
    M.P_Buy.type = C.call;

    // Update Para Flag
    M.paraFlag = true;

    // Capture Buy
    Helper.captureBuy();

    // Update Buy Log
    Helper.updateLog(C.buy);
  } catch (error) {
    Helper.addMessage(C.error, "Put reversal ==> " + error);
    Helper.notifyMe(C.error + "Put reversal ==> " + error);
  }
}

async function reverseWithSupport() {
  try {
    if (M.Buy.type == C.call) {
      await reverseCallWithSupport();
    } else {
      await reversePutWithSupport();
    }
  } catch (error) {
    Helper.setBusy(false);
    Helper.addMessage(C.error, Helper.findMsg(error), C.P1);
  }
}

async function reverseCallWithSupport() {
  let order;

  try {
    // Convert Call to Support
    if (M.BuyCall.flag == true) {
      // Init Support Window
      initSupportWindow(M.CallWindow, M.CallCandle.close);

      // Update Category
      M.BuyCall.category = C.support;

      // Reverse Trn Record
      updateTrn(C.update, M.BuyCall);

      // Sell Call Addon
      if (M.BuyAddon.flag === true && M.BuyAddon.symbol === M.BuyCall.symbol) {
        await sellAddon(M.BuyCall);
      }
    } else {
      throw new Error("Call Order Not Found");
    }

    // Main Put
    if (M.BuyPut.flag == true) {
      // Init Main Window
      initMainWindow(M.PutWindow, M.PutCandle.close);

      // Update Category
      M.BuyPut.category = C.main;

      // Reverse Trn Record
      updateTrn(C.update, M.BuyPut);

      // Sell Put Addon
      if (M.BuyAddon.flag === true && M.BuyAddon.symbol === M.BuyPut.symbol) {
        await sellAddon(M.BuyPut);
      }
    } else {
      // Buy Put Main
      order = await buyMain(M.BuyPut, false);

      if (order == undefined) {
        throw new Error("Buy Put (Main)");
      }
      Helper.addMessage(C.success, "Buy Put (Main)", C.P2);
    }

    // Move Put Main Orange Up
    moveOrangeUp(M.BuyPut);

    // Update Buy Info
    M.Buy.reverse = M.Buy.reverse + 1;
    M.Buy.supportFlag = true;
    M.Buy.direction = C.up;
    M.Buy.type = C.put;

    // Update Buy Para
    M.P_Buy.type = C.put;

    // Capture Buy
    Helper.captureBuy();

    // Update Buy Log
    Helper.updateLog(C.buy);

    // Update Para Flag
    M.paraFlag = true;
  } catch (error) {
    Helper.setBusy(false);
    Helper.addMessage(C.error, Helper.findMsg(error), C.P1);
  }
}

async function reversePutWithSupport() {
  let order;

  try {
    // Convert Put to Support
    if (M.BuyPut.flag == true) {
      // Init Support Window
      initSupportWindow(M.PutWindow, M.PutCandle.close);

      // Update Category
      M.BuyPut.category = C.support;

      // Reverse Trn Record
      updateTrn(C.update, M.BuyPut);

      // Sell Put Addon
      if (M.BuyAddon.flag === true && M.BuyAddon.flag === true) {
        await sellAddon(M.BuyPut);
      }
    } else {
      throw new Error("Put Buy Not Found");
    }

    // Main Call
    if (M.BuyCall.flag == true) {
      // Init Main Window
      initMainWindow(M.CallWindow, M.CallCandle.close);

      // Update Category
      M.BuyCall.category = C.main;

      // Reverse Trn Record
      updateTrn(C.update, M.BuyCall);

      // Sell Put Addon
      if (M.BuyAddon.flag === true && M.BuyAddon.symbol === M.BuyCall.symbol) {
        await sellAddon(M.BuyCall);
      }
    } else {
      // Buy Call Main
      order = await buyMain(M.BuyCall, false);

      if (order == undefined) {
        throw new Error("Buy Call (Main)");
      }
      Helper.addMessage(C.success, "Buy Call (Main)", C.P2);
    }

    // Move Main Orange Up
    moveOrangeUp(M.BuyCall);

    // Update Buy Info
    M.Buy.reverse = M.Buy.reverse + 1;
    M.Buy.supportFlag = true;
    M.Buy.direction = C.up;
    M.Buy.type = C.call;

    // Update Buy Para
    M.P_Buy.type = C.call;

    // Capture Buy
    Helper.captureBuy();

    // Update Buy Log
    Helper.updateLog(C.buy);

    // Update Para Flag
    M.paraFlag = true;
  } catch (error) {
    Helper.setBusy(false);
    Helper.addMessage(C.error, Helper.findMsg(error), C.P1);
  }
}

function trailWindows() {
  // Trail Main Window
  trailMainWindow();

  // Trail Support Window
  trailSupportWindow();

  // Trail Addon Window
  trailAddonWindow();
}

function trailMainWindow() {
  let window, candle;
  if (M.Buy.flag === false) {
    return;
  }

  if (M.Buy.type === C.call) {
    window = M.CallWindow;
    candle = M.CallCandle;
  } else if (M.Buy.type === C.put) {
    window = M.PutWindow;
    candle = M.PutCandle;
  } else {
    throw new Error("Invalid buy Type");
  }
  if (window === undefined || candle === undefined) {
    return;
  }

  // Trail Green Up
  trailGreenUp(window, candle);

  // Trail Orange Up, Ltp > Orange
  trailMainOrangeUp(window, candle);

  // Trail Orange Down, Ltp < Orange
  trailMainOrangeDown(window, candle);
}

function trailMainOrangeDown(window, candle) {
  let orange = 0;
  if (window.status === false) {
    return;
  }
  if (candle.close < window.orange) {
    if (M.Buy.supportFlag === false) {
      orange = Helper.addPercentage(candle.close, M.Para.hold / 2);
    } else {
      orange = Helper.addPercentage(candle.close, M.Para.hold);
    }
    if (orange < window.orange) {
      window.orange = orange;
      // Update Buy Log
      Helper.updateLog(C.buy);
    }
  }
}

function trailSupportOrangeDown(window, candle) {
  if (window.status === false) {
    return;
  }
  if (candle.close < window.red) {
    window.orange = Helper.addPercentage(candle.close, M.Para.hold);
    window.red = candle.close;
    // Update Buy Log
    Helper.updateLog(C.buy);
  }
}

function trailDeltaOrangeDown(window, candle) {
  if (window.status === false) {
    return;
  }
  if (candle.close < window.red) {
    window.orange = Helper.formatDecimal(candle.close + M.P_SupportDelta.value);
    window.red = candle.close;
    // Update Buy Log
    Helper.updateLog(C.buy);
  }
}

function trailMainOrangeUp(window, candle) {
  if (window.status === false) {
    return;
  }
  if (candle.close > window.orange) {
    var orange = Helper.addPercentage(candle.close, -M.Para.hold);
    if (orange > window.orange) {
      window.orange = orange;
      // Update Buy Log
      Helper.updateLog(C.buy);
    }
  }
}

function trailSupportOrangeUp(window, candle) {
  if (window.status === false) {
    return;
  }
  if (candle.close > window.orange) {
    window.orange = candle.close;
    window.red = Helper.addPercentage(candle.close, -M.Para.hold);
    // Update Buy Log
    Helper.updateLog(C.buy);
  }
}

function trailDeltaOrangeUp(window, candle) {
  if (window.status === false) {
    return;
  }
  if (candle.close > window.orange) {
    window.orange = candle.close;
    window.red = Helper.formatDecimal(candle.close - M.P_SupportDelta.value);
    // Update Buy Log
    Helper.updateLog(C.buy);
  }
}

function trailGreenUp(window, candle) {
  if (window.status === true) {
    if (candle.close > window.green) {
      window.green = candle.close;
      window.orange = Helper.addPercentage(window.green, -M.Para.hold);
      window.red = Helper.addPercentage(window.green, -M.Para.exit);
      // Update Buy Log
      Helper.updateLog(C.buy);
    }
  }
}

function trailSupportWindow() {
  let window, candle;
  if (
    M.Buy.flag === false ||
    M.Buy.supportFlag == false ||
    M.P_Support.type !== C.trail
  ) {
    return;
  }

  if (M.Buy.type === C.call) {
    window = M.PutWindow;
    candle = M.PutCandle;
  } else if (M.Buy.type === C.put) {
    window = M.CallWindow;
    candle = M.CallCandle;
  } else {
    throw new Error("Invalid buy Type");
  }

  if (window === undefined || candle === undefined) {
    return;
  }
  // Trail Orange Down, Ltp < Orange
  // trailSupportOrangeDown(window, candle);

  // Trail Orange Up, Ltp > Orange
  trailSupportOrangeUp(window, candle);
}

function trailAddonWindow() {
  if (M.DeltaWindow.status === false) {
    return;
  }
  if (M.DeltaCandle.close > M.DeltaWindow.high) {
    M.DeltaWindow.high = M.DeltaCandle.close;
    M.DeltaWindow.low = M.DeltaWindow.high - M.DeltaWindow.gap;
  }

  if (M.DeltaCandle.close < M.DeltaWindow.low) {
    M.DeltaWindow.low = M.DeltaCandle.close;
    M.DeltaWindow.high = M.DeltaWindow.low + M.DeltaWindow.gap;
    M.DeltaWindow.target = M.DeltaWindow.high + M.DeltaWindow.gap;
  }
}

async function sellAll() {
  const order = await M.oDelta.closeAllPositions();
  return order;
}

async function sellBoth() {
  var order;

  // Sell Call
  if (M.BuyCall.flag === true) {
    if (M.BuyCall.category === C.main) {
      var order = await sellMain(M.BuyCall);
      if (order == undefined) {
        throw new Error("Sell => Call (Main)");
      }
    } else {
      var order = await sellSupport(M.BuyCall);
      if (order == undefined) {
        throw new Error("Sell => Call (Support)");
      }
    }
  }

  // Sell Put
  if (M.BuyPut.flag === true) {
    if (M.BuyPut.category === C.main) {
      var order = await sellMain(M.BuyPut);
      if (order == undefined) {
        throw new Error("Sell => Put (Main)");
      }
    } else {
      var order = await sellSupport(M.BuyPut);
      if (order == undefined) {
        throw new Error("Sell => Put (Support)");
      }
    }
  }

  // Buy Header
  M.Buy.flag = false;

  // Reset Flags
  M.P_ProfitTrail.flag = false;
  M.P_LossTrail.flag = false;

  // Buy Para
  Helper.resetWithRef(M.Para.buy, M.I_Para.buy);

  // Update Final Pnl
  updateFinalPnl();

  // Insert DB Record
  await Helper.dbInsertRecord();

  // Reset Delta Window
  resetDeltaWindow();

  M.Para.switch = C.none;

  // Flags
  M.paraFlag = true;
  // M.strikeFlag = true;
  M.buyFlag = true;

  // Update Buy Log
  Helper.updateLog(C.buy);

  // Update Buy Log
  Helper.updateLog(C.sell);
}

function resetWindow(Window) {
  // CallWindow used just for reference
  Helper.resetWithRef(Window, M.I_Buy.call.window);
}

function resetDeltaWindow() {
  Helper.resetWithRef(M.DeltaWindow, M.I_Buy.delta.window);
}

function updateMainWindow() {
  if (M.Buy.type == C.call) {
    if (M.CallCandle.close > M.CallWindow.orange) {
      moveOrangeDown(M.BuyCall);
    } else {
      moveOrangeUp(M.BuyCall);
    }
    M.CallWindow.red = Helper.addPercentage(M.CallWindow.green, -M.Para.exit);
  } else {
    if (M.PutCandle.close > M.PutWindow.orange) {
      moveOrangeDown(M.BuyPut);
    } else {
      moveOrangeUp(M.BuyPut);
    }
    M.PutWindow.red = Helper.addPercentage(M.PutWindow.green, -M.Para.exit);
  }
}

function updateSupportWindow() {
  if (M.P_Support.flag == false) {
    return;
  }

  if (M.Buy.type == C.call) {
    M.PutWindow.red = Helper.addPercentage(
      M.PutWindow.orange,
      -M.P_Support.per,
    );
  } else {
    M.CallWindow.red = Helper.addPercentage(
      M.CallWindow.orange,
      -M.P_Support.per,
    );
  }
}

function updateWindow() {
  if (M.Buy.flag === false) {
    return;
  }

  updateMainWindow();

  updateSupportWindow();

  Helper.updateDeltaWindow();
}

function refreshBuyInfo() {
  // Main
  if (M.Buy.flag == false) {
    Helper.resetWithRef(M.Buy, M.I_Buy);
    M.aTrn = [];
    return;
  }

  // Reset Call Pnl
  if (M.BuyCall.flag == false) {
    Helper.resetPnl(M.CallPnl);
  }

  // Reset Put Pnl
  if (M.BuyPut.flag == false) {
    Helper.resetPnl(M.PutPnl);
  }
}

async function buyCallSupport() {
  if (M.BuyCall.flag === true) {
    Helper.addMessage(C.error, "Cannot Buy Call Support, Exists");
    return;
  }

  // Sell Put Addon
  if (M.BuyAddon.flag === true && M.BuyAddon.symbol === M.BuyPut.symbol) {
    await sellAddon(M.BuyPut);
  }

  var order = await buySupport(M.BuyCall);
  if (order == undefined) {
    Helper.addMessage(C.error, "Buy => Call (Support)", C.P2);
    return;
  }

  // Move Put Orange Up
  moveOrangeUp(M.BuyPut);

  // Capture Buy
  Helper.captureBuy();

  // Update Buy Log
  Helper.updateLog(C.buy);
}

async function buySupport(Ticker) {
  var order = false;
  if (Ticker == undefined) {
    throw new Error("Order Undefined");
  }

  // Validate Sell Condition
  if (
    M.P_SellSupport.flag === true &&
    M.Buy.support === M.P_SellSupport.count - 1
  ) {
    Helper.performAction(
      C.support,
      M.P_SellSupport.action,
      M.Buy.index,
      Ticker.type,
    );
    // if (M.P_SellSupport.action === C.sell) {
    //   await sellBoth();
    // }
    M.P_SellSupport.flag = false;
    M.paraFlag = true;
    return order;
  }

  // Buy Support with addon always
  order = await buyOrder(Ticker, M.P_Addon.flag);

  if (order == undefined) {
    Helper.notifyMe("Error in Buy Support Order");
    throw new Error("Error in Buy Support Order");
  }

  // Message
  Helper.addMessage(C.success, "Buy => " + Ticker.type + " (Support)", C.P2);
  Helper.notifyMe(C.success + " : Buy => " + Ticker.type + " (Support)");

  // Ticker
  Ticker.flag = true;

  // Parent
  M.Buy.supportFlag = true;
  M.Buy.support = M.Buy.support + 1;
  M.Buy.direction = C.down;

  // Init Support
  initBuySupport(order);

  // Trn
  updateTrn(C.buy, Ticker);

  // Init Addon
  if (M.P_Addon.flag === true) {
    initAddon(Ticker, order);
  }

  // Slippage
  let slippagePer = Ticker.pnl.buySlp + M.AddonPnl.buySlp;
  if (slippagePer != 0) {
    M.Buy.slippage = M.Buy.slippage + 1;
    M.Buy.slippagePer = Helper.formatDecimal(M.Buy.slippagePer + slippagePer);
  }

  return order;
}

function initSupportWindow(Window, Price) {
  if (Price == undefined || Price == 0) {
    return;
  }

  Window.status = true;
  Window.buy = Helper.formatDecimal(Price);
  Window.green = 0;
  Window.orange = Helper.formatDecimal(Price);
  Window.red = Helper.addPercentage(Price, -M.P_Support.per);
  Window.topColor = C.none;
  Window.bottomColor = C.orangeWindow;
}

async function sellSupport(Ticker) {
  // Validation
  if (Ticker.flag == false) {
    Helper.addMessage(C.error, "Cannot Sell Support, Dont Exists", C.P2);
    return;
  }

  var order = await sellOrder(Ticker);

  if (order == undefined) {
    Helper.notifyMe("Error in Sell Support");
    throw new Error("Error in Sell Support");
  }

  // Buy
  M.Buy.supportFlag = false;
  M.Buy.direction = C.up;

  // Ticker
  Ticker.flag = false;
  Ticker.addon = false;

  // Pnl
  updatePnl(Ticker, order);

  // Trn
  updateTrn(C.sell, Ticker);

  // Reset Window
  resetWindow(Ticker.window);

  // Set Delta Window
  Helper.updateDeltaWindow();

  // Support %
  M.Buy.supportPer = Helper.formatDecimal(M.Buy.supportPer + Ticker.pnl.per);

  // // Slippage
  // let slippagePer = Ticker.pnl.sellSlp + M.AddonPnl.sellSlp;
  // if (slippagePer < 0) {
  //   M.Buy.slippage = M.Buy.slippage + 1;
  //   M.Buy.slippagePer = Helper.formatDecimal(M.Buy.slippagePer + slippagePer);
  // }

  // Reset Addon
  if (M.BuyAddon.flag === true && Ticker.type === M.BuyAddon.type) {
    Ticker.addon = false;
    settleAddon(Ticker, order);
  }

  // Message
  Helper.addMessage(C.success, "Sell => " + Ticker.type + " (Support)", C.P2);
  Helper.notifyMe(C.success + " : Sell => " + Ticker.type + " (Support)");

  return order;
}

async function sellCallSupport() {
  if (M.BuyCall.flag === false) {
    Helper.addMessage(C.error, "Cannot Sell Call Support, Dont Exists");
    return;
  }

  // Sell Call Support
  var order = await sellSupport(M.BuyCall);

  if (order == undefined) {
    throw new Error("Sell => Call (Support)");
  }

  // Move Put Orange Down
  moveOrangeDown(M.BuyPut);

  // Update Buy Log
  Helper.updateLog(C.buy);
}

async function buyPutSupport() {
  if (M.BuyPut.flag === true) {
    Helper.addMessage(C.error, "Cannot Buy Put Support, Exists");
    return;
  }

  // Sell Call Addon
  if (M.BuyAddon.flag === true && M.BuyAddon.symbol === M.BuyCall.symbol) {
    await sellAddon(M.BuyCall);
  }

  // Buy Support
  var order = await buySupport(M.BuyPut);
  if (order == undefined) {
    Helper.addMessage(C.error, "Buy => Put (Support)");
    return;
  }

  // Move Call Orange Up
  moveOrangeUp(M.BuyCall);

  // Capture Buy
  Helper.captureBuy();

  // Update Buy Log
  Helper.updateLog(C.buy);
}

function moveOrangeHalfUp(Ticker) {
  let gap = 0;
  // if (M.Buy.supportFlag === false) {
  gap = Helper.formatDecimal(M.Para.hold / 2);
  // } else {
  // gap = M.Para.hold;

  // }
  // Move Orange Up
  Ticker.window.orange = Helper.addPercentage(Ticker.pnl.ltp, gap);
  // Extend Green, If required
  if (Ticker.window.orange > Ticker.window.green) {
    Ticker.window.green = Ticker.window.orange;
  }
}

function moveOrangeUp(Ticker) {
  let gap = 0;
  // if (M.Buy.supportFlag === false) {
  //   gap = Helper.formatDecimal(M.Para.hold / 2);
  // } else {
  gap = M.Para.hold;

  // }
  // Move Orange Up
  Ticker.window.orange = Helper.addPercentage(Ticker.pnl.ltp, gap);
  // Extend Green, If required
  if (Ticker.window.orange > Ticker.window.green) {
    Ticker.window.green = Ticker.window.orange;
  }
}

function moveOrangeDown(Ticker) {
  // Move Orange Down
  Ticker.window.orange = Helper.addPercentage(
    Ticker.window.green,
    -M.Para.hold,
  );
  // Donot Extend Red
  if (Ticker.window.orange < Ticker.window.red) {
    Ticker.window.orange = Ticker.window.red;
  }
}

async function sellPutSupport() {
  if (M.BuyPut.flag === false) {
    throw new Error("Cannot Sell Put Support, Dont Exists");
  }

  // Sell Put Support
  var order = await sellSupport(M.BuyPut);
  if (order == undefined) {
    throw new Error("Sell => Put (Support), Order Not Found");
  }

  // Move Call Orange Down
  moveOrangeDown(M.BuyCall);

  // Update Buy Log
  Helper.updateLog(C.buy);
}

async function buyAddon(Ticker) {
  let order = false;
  if (Ticker.addon === true) {
    return order;
  }

  if (Ticker?.candle?.close == undefined) {
    throw new Error("Candle Ltp not found");
  }

  // Exit, if Delta less than both Options
  if (
    M.DeltaCandle.close < M.CallCandle.per &&
    M.DeltaCandle.close < M.PutCandle.per
  ) {
    Helper.addMessage(C.error, "Cannot Buy Addon, Condition not met", C.P1);
    return order;
  }

  try {
    M.BuyAddon.symbol = Ticker.symbol;
    M.AddonPnl.ltp = Ticker.candle.close;

    order = await buyAddonOrder();

    if (order == undefined) {
      Helper.notifyMe("Error : Sell => " + Ticker.type + " (Addon)");
      throw new Error("Buy ==> " + Ticker.type + "  (Addon) ");
    }

    Ticker.addon = true;
    M.Buy.addonCount = M.Buy.addonCount + 1;

    M.BuyAddon.flag = true;
    M.BuyAddon.parent = Ticker.flag;
    M.BuyAddon.type = Ticker.type;
    M.BuyAddon.category = Ticker.category + "Addon";
    M.AddonPnl.buy = order.average;

    // Init Addon Pnl
    initPnl(M.BuyAddon, order);

    // Slippage
    let slippagePer = Ticker.pnl.buySlp;
    if (slippagePer < 0) {
      M.Buy.slippage = M.Buy.slippage + 1;
      M.Buy.slippagePer = Helper.formatDecimal(M.Buy.slippagePer + slippagePer);
    }

    // Trn
    updateTrn(C.buy, M.Buy.addon);

    // Message
    Helper.addMessage(C.success, "Buy ==> " + Ticker.type + " (Addon)", C.P2);
    Helper.notifyMe(C.success + " : Buy => " + Ticker.type + " (Addon)");

    return order;
  } catch (error) {
    Helper.addMessage(C.error, Helper.findMsg(error));
  }
}

function initAddonCandle() {
  if (M.BuyAddon.type === C.call) {
    initCandle(M.BuyDelta.candle, M.CallCandle.close);
  } else if (M.BuyAddon.type === C.put) {
    initCandle(M.BuyDelta.candle, M.PutCandle.close);
  }
}

async function buyAddonOrder() {
  let order = {};

  // Validation
  if (M.P_Addon.flag === false) {
    throw new Error("Cannot Buy Addon, Flag Inactive");
  }

  if (M.BuyAddon.flag == true) {
    throw new Error("Cannot Buy, Already Exists");
  }

  // Get Qty
  let data = M.aData.find(
    (item) => item.category === C.option && item.symbol === M.BuyAddon.symbol,
  );

  if (data?.close == undefined || data?.close == 0) {
    throw new Error("Invalid Ticker LTP");
  }

  M.BuyAddon.pnl.ltp = data.close;
  M.BuyAddon.pnl.qty = getBuyQty(M.BuyAddon) * M.P_Addon.value;
  M.BuyAddon.pnl.usd = M.Buy.amount;

  if (M.Para.switch == C.active) {
    if (M.Para.orderType == C.market) {
      order = await buyMarketOrder(M.BuyAddon, M.BuyAddon.pnl.qty);
    } else {
      order = await buyLimitOrder(M.BuyAddon, M.BuyAddon.pnl.qty);
    }
  } else if (M.Para.switch == C.test) {
    order = await buyTestOrder(M.BuyAddon, M.BuyAddon.pnl.qty);
  } else {
    throw new Error("Inactive Switch");
  }

  return order;
}

async function sellAddon(Ticker) {
  if (M.BuyAddon.flag === false) {
    throw new Error("Sell Addon ==> " + Ticker.type + "  Not Found");
  }

  if (Ticker.symbol !== M.BuyAddon.symbol) {
    throw new Error("Sell Addon ==> " + Ticker.type + "  Invalid Symbol");
  }

  try {
    // Sell Addon
    var order = await sellOrder(M.BuyAddon);

    if (order == undefined) {
      // Helper.notifyMe("Error ==> Sell Addon (" + Ticker.type + " )");
      throw new Error("Sell Addon ==> (" + Ticker.type + " ) Order Not Found");
    }

    // Parent
    Ticker.addon = false;

    // Adjust Main % -> Trn
    if (Ticker.category === C.main) {
      // Settle Main
      M.Buy.supportPer = Helper.formatDecimal(
        M.Buy.supportPer + Helper.getPercentage(Ticker.pnl.buy, order.average),
      );
      // Adjust Main Till here
      Ticker.pnl.ltp = Helper.formatDecimal(order.average);
      updateTrn(C.adjust, Ticker);

      // Continue Main from here
      Ticker.pnl.buy = order.average;

      // Allign Main Window
      moveOrangeHalfUp(Ticker);
    }

    // // Slippage
    // let slippagePer = M.AddonPnl.sellSlp;
    // if (slippagePer < 0) {
    //   M.Buy.slippage = M.Buy.slippage + 1;
    //   M.Buy.slippagePer = Helper.formatDecimal(M.Buy.slippagePer + slippagePer);
    // }

    // Settle Addon
    settleAddon(M.BuyAddon, order);

    // Validate Sell Addon Condition
    if (
      M.P_SellAddon.flag === true &&
      M.P_SellAddon.count === M.P_SellAddon.count
    ) {
      Helper.performAction(
        C.addon,
        M.P_SellAddon.action,
        M.Buy.index,
        Ticker.type,
      );
      M.P_SellAddon.flag = false;
      M.paraFlag = true;
      return order;
    }

    // Message
    // Helper.addMessage(C.success, "Sell => " + Ticker.type + " (Addon)", C.P2);
    // Helper.notifyMe(C.success + " : Sell => " + Ticker.type + " (Addon)");

    return order;
  } catch (error) {
    Helper.addMessage(C.error, Helper.findMsg(error));
  }
}

function settleAddon(Ticker, order) {
  let slippagePer = 0;

  if (Ticker.category === C.main || Ticker.category === C.support) {
    // Parent Slippage
    slippagePer = Ticker.pnl.sellSlp;
    // Parent Pnl
    updateParentPnl(Ticker, order);
  }

  // Flag
  M.BuyAddon.flag = false;

  // Slippage
  slippagePer = slippagePer + M.AddonPnl.sellSlp;
  if (slippagePer < 0) {
    M.Buy.slippage = M.Buy.slippage + 1;
    M.Buy.slippagePer = Helper.formatDecimal(M.Buy.slippagePer + slippagePer);
  }

  // Addon Pnl
  updatePnl(M.BuyAddon, order);

  // Trn
  updateTrn(C.sell, M.BuyAddon);

  // Update Buy -> Addon Per
  M.Buy.addonPer = Helper.formatDecimal(M.Buy.addonPer + M.AddonPnl.per);

  // Message
  Helper.addMessage(C.success, "Sell => " + M.BuyAddon.type + " (Addon)", C.P2);
  Helper.notifyMe(C.success + " + Sell => " + M.BuyAddon.type + " (Addon)");

  Helper.updateDeltaWindow();

  Helper.resetWithRef(M.BuyAddon, M.I_Buy.addon);
}

function updatePnl(Ticker, Order) {
  Ticker.pnl.sellSlp = Helper.formatDecimal(
    (Helper.getPercentage(Order.average, Ticker.pnl.ltp) * Ticker.pnl.qty) /
      Order.amount,
  );
  Ticker.pnl.ltp = Helper.formatDecimal(Order.average);
  Ticker.pnl.per = Helper.getPercentage(Ticker.pnl.buy, Ticker.pnl.ltp);
}

function updateParentPnl(Ticker, Order) {
  let addonQty = 0;
  if (M.BuyAddon.flag === true && M.BuyAddon.symbol === Ticker.symbol) {
    addonQty = M.AddonPnl.qty;
  }
  let leftQty = Order.amount - Ticker.pnl.qty - addonQty;
  if (leftQty === 0) {
    Ticker.pnl.qty = 0;
    Ticker.pnl.usd = 0;
  } else {
    Ticker.pnl.qty = leftQty;
    Ticker.pnl.usd = Helper.formatDecimal(
      leftQty * Ticker.pnl.ltp * M.Buy.lotsize,
    );
    Helper.addMessage(
      "Error Sell ==> " + Ticker.type + " (" + Ticker.category + ")",
    );
  }

  // Update Addon Per / Count
  if (M.P_Addon.value > 1) {
    Ticker.pnl.per = Helper.formatDecimal(Ticker.pnl.per * M.P_Addon.value);
  }
}

module.exports = {
  initBuy,
  processBuy,
  updateMainWindow,
  updateSupportWindow,
  updateWindow,
  refreshBuyInfo,
  resetBuy,
  sellBoth,
  sellAll,
  reverseWithSupport,
  reverseWithoutSupport,
  manageBuy,
  buyAddon,
  sellAddon,
  buyCallSupport,
  buyPutSupport,
  sellCallSupport,
  sellPutSupport,
  updateTrn,
  processBuyCallAddon,
  processBuyPutAddon,
};
