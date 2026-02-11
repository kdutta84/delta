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

    // Init Options
    if (M.P_Buy.type == C.call) {
      await initBuyCall();
    } else if (M.P_Buy.type == C.put) {
      await initBuyPut();
    } else {
      resetBuy();
      throw new Error("Invalid Buy Type");
    }

    // Init Support
    initSupport();

    // Init Delta
    if (M.P_SupportDelta.flag === true) {
      initDelta();
    }

    // Add Buy Data
    addBuyData();

    // Capture Buy
    Helper.captureBuy();

    // // Trail Loss
    // M.P_LossTrail.flag = true;

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
    Helper.notifyMe(C.error + "Buy ==> Call ( Main ), Exists");
    throw new Error("Buy ==> Call ( Main ), Exists");
  }

  // Init Call
  M.BuyCall.symbol = M.P_Buy.callSymbol;
  M.BuyCall.type = C.call;
  M.BuyCall.category = C.main;

  // Buy Order
  var order = await buyMain(M.BuyCall, true);

  if (order == undefined) {
    throw new Error("Buy => Call ( Main )");
  }
}

async function initBuyPut() {
  ////////////// Main --> Put  //////////////
  if (M.BuyPut.flag === true) {
    Helper.notifyMe(C.error + "Buy ==> Put ( Main ), Exists");
    Helper.addMessage(C.error, "Buy ==> Put ( Main ), Exists");
    return;
  }

  M.BuyPut.symbol = M.P_Buy.putSymbol;
  M.BuyPut.type = C.put;
  M.BuyPut.category = C.main;

  // Buy Put
  var order = await buyMain(M.BuyPut, true);

  if (order == undefined) {
    throw new Error("Buy => Put ( Main )");
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

async function buyMain(Ticker, buyAddon) {
  var order;

  if (Ticker?.flag === undefined) {
    throw new Error("Order Undefined");
  }

  if (Ticker.flag === true) {
    Helper.addMessage(
      C.error,
      "Buy ==> " + Ticker.type + " (Main), Already Exists",
    );
    return;
  }

  // Place Buy Order
  order = await buyOrder(Ticker, buyAddon);

  if (order == undefined) {
    Helper.notifyMe(C.error + " : Buy ==> " + Ticker.type + " (Main)");
    throw new Error("Buy ==> " + Ticker.type + " (Main)");
  }

  // Init Main
  initMain(Ticker, order);

  if (M.P_SupportDelta.flag === true) {
    Helper.initDeltaWindow();
  }

  // Init Addon
  if (buyAddon === true) {
    initAddon(Ticker, order);
  }

  let slippagePer = Helper.getPercentage(Ticker.candle.close, order.average);
  if (slippagePer < 0) {
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

  var order = await sellOrder(Ticker);

  if (order == undefined) {
    return order;
  }

  // Update Ticker
  Ticker.flag = false;
  M.Buy.supportFlag = false;
  M.Buy.direction = C.up;

  updatePnl(Ticker, order);

  // Update Parent
  M.Buy.supportPer = Helper.formatDecimal(M.Buy.supportPer + Ticker.pnl.per);

  let slippagePer = Helper.getPercentage(Ticker.candle.close, order.average);
  if (slippagePer < 0) {
    M.Buy.slippage = M.Buy.slippage + 1;
    M.Buy.slippagePer = Helper.formatDecimal(M.Buy.slippagePer + slippagePer);
  }

  // Reset Window
  resetWindow(Ticker.window);

  // Start Support Trn
  updateTrn(C.sell, Ticker);

  // Settle Addon
  if (M.BuyAddon.flag === true && Ticker.type === M.BuyAddon.type) {
    settleAddon(order, false);
  }

  // Send Message
  Helper.addMessage(C.success, "Sell =>" + Ticker.type + " ( Main )", C.P2);

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
  Helper.addMessage(C.success, "Buy => " + Ticker.type + " ( Addon )", C.P2);
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
  Helper.addMessage(C.success, "Buy => " + Ticker.type + " ( Main )", C.P2);
  Helper.notifyMe(C.success, " : Buy ==> " + Ticker.type + " (Main)");
}

function initPnl(Ticker, order) {
  Ticker.pnl.ltp = order.average;
  Ticker.pnl.per = 0;
  Ticker.pnl.buy = Helper.formatDecimal(order.average);

  // switch (Ticker.category) {
  //   case C.main:
  //   case C.support:
  //     Ticker.pnl.qty = order.amount;
  //     Ticker.pnl.usd = Helper.formatDecimal(
  //       Ticker.pnl.qty * order.average * M.Buy.lotsize,
  //     ); // Helper.formatDecimal(order.cost);
  //     break;
  //   case C.mainAddon:
  //   case C.supportAddon:
  //     Ticker.pnl.qty = order.amount * M.P_Addon.value;
  //     Ticker.pnl.usd = Helper.formatDecimal(order.cost * M.P_Addon.value);
  //     break;
  //   default:
  //     throw new Error("Invalid Buy Category");
  // }
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

  // Update Delta Window
  // Helper.updateDeltaWindow();

  // Init Delta Window
  if (M.P_SupportDelta.flag === true) {
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

async function buyOrder(Ticker, buyAddon) {
  let order = {};

  // Validation
  if (Ticker.flag == true) {
    throw new Error("Buy ==> " + Ticker.type + " Already Exists");
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

  if (buyAddon === true && M.P_Addon.flag === true && Ticker.addon === false) {
    M.BuyAddon.pnl.qty = getAddonQty(Ticker);
  }

  let qty = Ticker.pnl.qty + M.BuyAddon.pnl.qty;

  switch (M.Para.switch) {
    case C.active:
      if (M.Para.orderType == C.market) {
        order = await buyMarketOrder(Ticker, qty);
      } else {
        order = await buyLimitOrder(Ticker, qty);
      }
      break;
    case C.test:
      order = await buyTestOrder(Ticker, qty);
      break;
    default:
      throw new Error("Inactive Switch");
  }

  if (buyAddon === false) {
    // Ticker
    Ticker.pnl.qty = Helper.formatDecimal(order.amount);
    Ticker.pnl.usd = Helper.formatDecimal(order.cost);
  } else {
    // Flags
    Ticker.addon = true;
    M.BuyAddon.flag = true;

    // Update Buy Qty & Cost
    let parts = M.P_Addon.value + 1; // Including Parent
    let qtyShare = Helper.formatDecimal(order.amount / parts);
    let costShare = Helper.formatDecimal(order.cost / parts);

    // Ticker
    Ticker.pnl.qty = Helper.formatDecimal(qtyShare);
    Ticker.pnl.usd = Helper.formatDecimal(costShare);

    // Addon
    M.AddonPnl.qty = Helper.formatDecimal(qtyShare * M.P_Addon.value);
    M.AddonPnl.usd = Helper.formatDecimal(costShare * M.P_Addon.value);
  }

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
      if (Ticker.addon === true) {
        qty = qty + M.AddonPnl.qty;
      }
      break;
    case C.mainAddon:
      let parent,
        parentQty = 0;

      if (Ticker.parent === true) {
        if (Ticker.type === C.call) {
          parent = M.BuyCall;
        } else {
          parent = M.BuyPut;
        }

        parentQty = getBuyQty(parent);
        qty = Ticker.pnl.qty + parent.pnl.qty - parentQty;
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
  // let qty = Qty;
  // let cost = Helper.formatDecimal(Ticker.pnl.usd + M.AddonPnl.usd);

  // if (M.P_Addon.flag === true && Ticker.addon === false) {
  //   Ticker.addon = true;
  //   qty = qty + getAddonQty(Ticker);
  //   cost = cost * 2;
  // }

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

  if (Ticker.addon === true) {
    Ticker.addon = false;
    qty = qty + M.AddonPnl.qty;
  }

  let res = await delay(500);
  return (order = {
    average: Ticker.pnl.ltp,
    amount: Ticker.pnl.qty,
    cost: Ticker.pnl.ltp,
  });
}

function getAddonQty(Ticker) {
  // Addon Qty
  if (M.P_Addon?.flag === true && M.BuyAddon?.flag === false) {
    M.AddonPnl.ltp = Ticker.pnl.ltp;
    M.AddonPnl.qty = Ticker.pnl.qty * M.P_Addon.value;
    M.AddonPnl.usd = M.Buy.amount * M.P_Addon.value;
  }
  return M.AddonPnl.qty;
}

function preBuySetup() {
  // Reset Buy Delta
  M.P_BuyDelta.flag = false;

  // Reset Tracking
  Helper.resetTrack();

  // Reset Buy Info ( Not Para Buy )
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
        buy: ticker.pnl.buy,
        ltp: ticker.pnl.ltp,
        per: Helper.formatDecimal(ticker.pnl.per),
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
        record.ltp = ticker.pnl.ltp;
        record.per = Helper.formatDecimal(ticker.pnl.per);
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
        record.buy = ticker.pnl.buy;
      }
      break;
    case C.adjust:
      record = M.aTrn.find(
        (item) =>
          item.flag == true &&
          item.category == ticker.category &&
          item.symbol == ticker.symbol,
      );
      if (record != undefined) {
        var trn = { ...record };
        trn.flag = false;
        trn.category = record.category + C.adjust;
        trn.sellTime = new Date().getTime();
        trn.sellTimeText = Helper.getCurrentTimeText();
      }

      M.aTrn.push(trn);
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
      M.AddonPnl.per = M.AddonPnl.per * M.P_Addon.value;
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
      row.per = row.per * M.P_Addon.value;
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
    M.Buy.max = M.Buy.pnl;
  }

  if (M.Buy.pnl < M.Buy.min) {
    M.Buy.min = M.Buy.pnl;
  }

  // From Buy
  M.Buy.fromMax = Helper.formatDecimal(M.Buy.pnl - M.Buy.max);
  M.Buy.fromMin = Helper.formatDecimal(M.Buy.pnl - M.Buy.min);

  // Profit Trail
  if (M.P_ProfitTrail.flag === true && M.Buy.fromMax < -M.P_ProfitTrail.per) {
    Helper.addMessage(C.info, "Profit Trail Hit", C.P2);
    await sellBoth();
    return;
  }

  // Loss Trail
  if (M.P_LossTrail.flag === true && M.Buy.fromMin > M.P_LossTrail.per) {
    await sellBoth();
    Helper.addMessage(C.info, "Loss Trail Hit", C.P2);
    return;
  }
}

async function manageBuy() {
  let callPer = M.BuyCapture?.callPer,
    putPer = M.BuyCapture?.putPer,
    buyType = C.none;

  if (callPer === undefined || putPer === undefined) {
    return;
  }

  if (callPer > putPer && callPer > 0) {
    buyType = C.call;
  }

  if (putPer > callPer && putPer > 0) {
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
          if (M.P_Addon.flag === true && M.BuyCall.addon === false) {
            // Trigger Message
            Helper.addMessage(C.info, "Delta Trigger ==> Call ( Main )", C.P2);
            await buyAddon(M.BuyCall);
          }
          break;
        case C.support:
          // Sell Put (Main) Addon
          if (M.BuyPut.addon === true && M.BuyAddon.type === C.put) {
            await sellAddon(M.BuyPut);
          }

          // Trigger Message
          Helper.addMessage(C.info, "Delta Trigger ==> Call ( Support )", C.P2);

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
            Helper.addMessage(C.info, "Delta Trigger ==> Put ( Main )", C.P2);
            await buyAddon(M.BuyPut);
          }
          break;
        case C.support:
          // Sell Put Addon
          if (M.BuyCall.addon === true && M.BuyAddon.type === C.call) {
            await sellAddon(M.BuyCall);
          }

          // Trigger Message
          Helper.addMessage(C.info, "Delta Trigger ==> Put ( Support )", C.P2);
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
  if (M.BuyCall.flag === true || M.P_Support.flag === false) {
    return;
  }

  // Capture Top Validation
  let callPer = Helper.getPercentage(M.BuyCapture.call, M.CallCandle.close);
  let putPer = Helper.getPercentage(M.BuyCapture.put, M.PutCandle.close);

  if (callPer > putPer && callPer > 0) {
    // Buy Call Support
    await buyCallSupport();

    // Update Delta Window
    Helper.updateDeltaWindow();
  }
}

async function processBuyPutSupport() {
  if (M.BuyPut.flag === true) {
    return;
  }

  // Capture Top Validation
  let callPer = Helper.getPercentage(M.BuyCapture.call, M.CallCandle.close);
  let putPer = Helper.getPercentage(M.BuyCapture.put, M.PutCandle.close);

  if (putPer > callPer && putPer > 0) {
    // Trigger Message
    Helper.addMessage(C.info, "Support Trigger ==> Put % > Min %", C.P2);

    // Buy Put Support
    await buyPutSupport();

    // Set Delta Window
    Helper.updateDeltaWindow();
  }
}
async function processBuyCallAddon() {
  if (M.BuyCall.flag === false) {
    return;
  }

  // Capture Top Validation
  let callPer = Helper.getPercentage(M.BuyCapture.call, M.CallCandle.close);
  let putPer = Helper.getPercentage(M.BuyCapture.put, M.PutCandle.close);

  if (callPer > putPer && callPer > 0) {
    // Buy Put Addon
    order = await buyAddon(M.BuyCall);
    if (order === undefined) {
      throw new Error("Buy ==> Call ( Addon )");
    }

    // Set Delta Window
    Helper.updateDeltaWindow();

    // Trigger Message
    if (M.BuyAddon.flag == true) {
      Helper.addMessage(C.info, "Support Trigger ==> Call % > Min %", C.P2);
    }
  }
}

async function processBuyPutAddon() {
  if (M.BuyPut.flag === false) {
    return;
  }

  // Capture Top Validation
  let callPer = Helper.getPercentage(M.BuyCapture.call, M.CallCandle.close);
  let putPer = Helper.getPercentage(M.BuyCapture.put, M.PutCandle.close);

  if (putPer > callPer && putPer > 0) {
    // Buy Put Addon
    order = await buyAddon(M.BuyPut);
    if (order === undefined) {
      throw new Error("Buy ==> Put ( Addon )");
    }

    // Set Delta Window
    Helper.updateDeltaWindow();

    // Trigger Message
    if (M.BuyAddon.flag === true) {
      Helper.addMessage(C.info, "Support Trigger ==> Put % > Min %", C.P2);
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

async function buyPutAddon() {
  let order = false;

  if (M.P_Addon.flag === false || M.BuyAddon.flag === true) {
    return order;
  }

  if (
    M.PutCandle.candlePer > M.CallCandle.candlePer &&
    M.PutCandle.candlePer > 0
  ) {
    order = await buyAddon(M.BuyPut);
  }
  return order;
}

async function processCall() {
  //////////////    LTP Below Red   ////////////////
  if (M.CallCandle.close < M.CallWindow.red) {
    // "Sell : Max Reversal Reached"
    if (
      M.P_SellReversal.flag == true &&
      M.P_SellReversal.count >= M.Buy.reverse - 1
    ) {
      // Trigger Message
      Helper.addMessage(
        C.info,
        "Support Trigger ==> Call ( Main ) < Red ",
        C.P2,
      );

      Helper.performAction(
        C.reverse,
        M.P_SellReversal.action,
        M.Buy.index,
        C.call,
      );

      M.P_SellReversal.flag = false;
      M.paraFlag = true;

      return;
      // if (M.P_SellReversal.action === C.sell) {
      //   await sellBoth();
      // }
    }

    // Trigger Message
    Helper.addMessage(
      C.info,
      "Support Trigger ==> Reverse, Call ( Main ) < Red ",
      C.P2,
    );

    // Else Reverse Options
    await reverseCallWithoutSupport();
    return;
  }

  //////////////    LTP Below Orange ////////////////
  if (M.CallCandle.close < M.CallWindow.orange) {
    // Sell Call Addon
    if (M.BuyCall.addon === true) {
      // Trigger Message
      Helper.addMessage(
        C.info,
        "Support Trigger ==> Call ( Main ) < Orange ",
        C.P2,
      );

      await sellAddon(M.BuyCall);
    }

    switch (M.BuyPut.flag) {
      case true:
        // Sell Put Support
        if (M.PutCandle.close < M.PutWindow.red) {
          // Trigger Message
          Helper.addMessage(
            C.info,
            "Support Trigger ==> Put ( Support ) < Red ",
            C.P2,
          );

          await sellPutSupport();
        }
        break;
      case false:
        // Buy Put Support
        await processBuyPutSupport();
        break;
    }
  }

  //////////////    LTP Above Orange   ////////////////
  if (M.CallCandle.close > M.CallWindow.orange) {
    // Sell Put & Addon
    if (M.BuyPut.flag === true) {
      // Trigger Message
      Helper.addMessage(
        C.info,
        "Support Trigger ==> Call ( Main ) > Orange ",
        C.P2,
      );

      // Sell Put Support
      await sellPutSupport();
    }

    if (M.BuyCall.addon === false && M.BuyAddon.flag === false) {
      await processBuyCallAddon();
      moveOrangeDown(M.BuyCall);
    }
    //   // Buy Call Addon
    //   if (
    //     M.P_Addon.flag === true &&
    //     M.BuyCall.flag === true &&
    //     M.BuyCall.addon === false
    //   ) {
    //     await processBuyCallAddon();
    //   }
    // } else if (M.BuyCall.addon === false) {
    //   await buyAddon(M.BuyCall);
    //   moveOrangeDown(M.BuyCall);
    // }
  }
}

async function processPut() {
  //////////////    LTP Below Red   ////////////////
  if (M.PutCandle.close < M.PutWindow.red) {
    // "Sell : Max Reversal Reached"
    if (
      M.P_SellReversal.flag == true &&
      M.P_SellReversal.count >= M.Buy.reverse - 1
    ) {
      // Trigger Message
      Helper.addMessage(
        C.info,
        "Support Trigger ==> Call ( Main ) < Red ",
        C.P2,
      );

      Helper.performAction(
        C.reverse,
        M.P_SellReversal.action,
        M.Buy.index,
        C.put,
      );
      M.P_SellReversal.flag = false;
      M.paraFlag = true;

      return;
      // if (M.P_SellReversal.action === C.sell) {
      //   await sellBoth();
      //   return;
      // }
    }

    // Trigger Message
    Helper.addMessage(
      C.info,
      "Support Trigger ==> Reverse, Put ( Main ) < Red ",
      C.P2,
    );

    // Else Reverse Options
    await reversePutWithoutSupport();
    return;
  }

  //////////////    LTP Below Orange ////////////////
  if (M.PutCandle.close < M.PutWindow.orange) {
    // Sell Put Addon
    if (M.BuyPut.addon === true) {
      // Trigger Message
      Helper.addMessage(
        C.info,
        "Support Trigger ==> Put ( Main ) < Orange ",
        C.P2,
      );

      await sellAddon(M.BuyPut);
    }

    switch (M.BuyCall.flag) {
      case true:
        // Sell Call Support
        if (M.CallCandle.close < M.CallWindow.red) {
          // Trigger Message
          Helper.addMessage(
            C.info,
            "Support Trigger ==> Call ( Support ) < Red ",
            C.P2,
          );

          await sellCallSupport();
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
    // Sell Call & Addon
    if (M.BuyCall.flag === true) {
      // Trigger Message
      Helper.addMessage(
        C.info,
        "Support Trigger ==> Put ( Main ) > Orange ",
        C.P2,
      );

      // Sell Put Support
      await sellCallSupport();
    }

    if (M.BuyPut.addon === false && M.BuyAddon.flag === false) {
      await processBuyPutAddon();
      moveOrangeDown(M.BuyPut);
    }
    //     // Buy Call Addon
    //     if (
    //       M.P_Addon.flag === true &&
    //       M.BuyPut.flag === true &&
    //       M.BuyPut.addon === false
    //     ) {
    //       await processBuyPutAddon();
    //     }
    //   } else if (M.BuyPut.addon === false) {
    //     await buyAddon(M.BuyPut);
    //     moveOrangeDown(M.BuyPut);
    //   }
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
  let buyAddon = false;

  // Sell Call
  if (M.BuyCall.flag == true) {
    order = await sellMain(M.BuyCall);
    if (order == undefined) {
      throw new Error("Sell => Call ( Main )");
    }
  } else {
    throw new Error("Call Buy Not Found");
  }

  // Reverse Category
  M.BuyPut.category = C.main;
  M.BuyCall.category = C.support;

  // Buy Addon
  if (M.P_Addon.flag === true && M.BuyAddon.flag === false) {
    let callPer = Helper.getPercentage(M.BuyCapture.call, M.CallCandle.close);
    let putPer = Helper.getPercentage(M.BuyCapture.put, M.PutCandle.close);
    if (putPer > callPer && putPer > 0) {
      buyAddon = true;
    }
  }

  // Check Put
  if (M.BuyPut.flag == true) {
    // Init Main Window
    initMainWindow(M.PutWindow, M.PutCandle.close);

    if (buyAddon === true) {
      // Buy Addon
      await buyAddon(M.BuyPut);
    } else {
      // Reverse Category
      M.BuyAddon.category = C.mainAddon;
    }

    // Reverse Trn
    reverseTrn();
  } else {
    order = await buyMain(M.BuyPut, buyAddon);
    if (order == undefined) {
      throw new Error("Buy => Put ( Main )");
    }
    Helper.addMessage(C.success, "Buy => Put ( Main )", C.P2);
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
}

async function reversePutWithoutSupport() {
  var order;
  let buyAddon = false;

  // Sell Put
  if (M.BuyPut.flag == true) {
    order = await sellMain(M.BuyPut);
    if (order == undefined) {
      throw new Error("Sell => Put ( Main )");
    }
  } else {
    throw new Error("Put Buy Not Found");
  }

  // Reverse Category
  M.BuyCall.category = C.main;
  M.BuyPut.category = C.support;

  if (M.P_Addon.flag === true && M.BuyAddon.flag === false) {
    // Capture Top Validation
    let callPer = Helper.getPercentage(M.BuyCapture.call, M.CallCandle.close);
    let putPer = Helper.getPercentage(M.BuyCapture.put, M.PutCandle.close);
    if (callPer > putPer && callPer > M.P_SupportDelta.value) {
      buyAddon = true;
    }
  }

  // Check Call
  if (M.BuyCall.flag == true) {
    initMainWindow(M.CallWindow, M.CallCandle.close);

    if (buyAddon === true) {
      // Buy Addon
      await buyAddon(M.BuyCall);
    } else {
      // Reverse Category
      M.BuyAddon.category = C.mainAddon;
    }

    // Reverse Trn
    reverseTrn();
  } else {
    order = await buyMain(M.BuyCall, buyAddon);
    if (order == undefined) {
      throw new Error("Buy => Call ( Main )");
    }
    Helper.addMessage(C.success, "Buy => Call ( Main )", C.P2);
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
  var order;
  let buyAddon = false;

  try {
    // Support Call
    if (M.BuyCall.flag == true) {
      // Init Support Window
      initSupportWindow(M.CallWindow, M.CallCandle.close);

      // Update Buy Log
      Helper.updateLog(C.buy);

      // Update Category
      M.BuyCall.category = C.support;

      // Reverse Trn Record
      updateTrn(C.update, M.BuyCall);

      // Sell Addon
      if (M.BuyCall.addon === true) {
        await sellAddon(M.BuyCall);
      }
    } else {
      throw new Error("Call Order Not Found");
    }

    // Main Put
    if (M.BuyPut.flag == true) {
      // Init Main Window
      initMainWindow(M.PutWindow, M.PutCandle.close);

      // Update Buy Log
      Helper.updateLog(C.buy);

      // Reverse Trn Record
      updateTrn(C.reverse, M.BuyPut);

      // Update Category
      M.BuyPut.category = C.main;
    } else {
      // Buy Main Without Support, to Keep Support Alive
      let addonFlag = M.P_Addon.flag;
      M.P_Addon.flag = false;

      // Buy Addon
      if (M.P_Addon.flag === true && M.BuyAddon.flag === false) {
        let callPer = Helper.getPercentage(
          M.BuyCapture.call,
          M.CallCandle.close,
        );
        let putPer = Helper.getPercentage(M.BuyCapture.put, M.PutCandle.close);
        if (putPer > callPer && putPer > 0) {
          buyAddon = true;
        }
      }

      // Buy Put Main
      order = await buyMain(M.BuyPut, buyAddon);

      // // Resume Addon flag
      // M.P_Addon.flag = addonFlag;

      if (order == undefined) {
        throw new Error("Buy Put ( Main )");
      }
      Helper.addMessage(C.success, "Buy Put ( Main )", C.P2);
    }

    // Move Main Orange Up
    moveOrangeUp(M.BuyPut);

    // Update Buy Info
    M.Buy.reverse = M.Buy.reverse + 1;
    M.Buy.support = M.Buy.support + 1;
    M.Buy.supportFlag = true;
    M.Buy.direction = C.down;
    M.Buy.type = C.put;

    // Update Buy Para
    M.P_Buy.type = C.put;

    // Capture Buy
    Helper.captureBuy();

    // Update Para Flag
    M.paraFlag = true;
  } catch (error) {
    Helper.setBusy(false);
    Helper.addMessage(C.error, Helper.findMsg(error), C.P1);
  }
}

async function reversePutWithSupport() {
  var order;
  let buyAddon = false;

  try {
    // Support Put
    if (M.BuyPut.flag == true) {
      initSupportWindow(M.PutWindow, M.PutCandle.close);

      // Update Buy Log
      Helper.updateLog(C.buy);

      // Update Category
      M.BuyPut.category = C.support;

      // Reverse Trn Record
      updateTrn(C.update, M.BuyPut);

      // Sell Addon
      if (M.BuyAddon.flag === true) {
        await sellAddon(M.BuyPut);
      }
    } else {
      throw new Error("Put Buy Not Found");
    }

    // Main Call
    if (M.BuyCall.flag == true) {
      // Init Main Window
      initMainWindow(M.CallWindow, M.CallCandle.close);

      // Update Buy Log
      Helper.updateLog(C.buy);

      // Reverse Trn Record
      updateTrn(C.reverse, M.BuyCall);

      // Update Category
      M.BuyCall.category = C.main;
    } else {
      // Buy Main Without Support, to Keep Support Alive
      let addonFlag = M.P_Addon.flag;
      M.P_Addon.flag = false;

      // Buy Addon
      if (M.P_Addon.flag === true && M.BuyAddon.flag === false) {
        let callPer = Helper.getPercentage(
          M.BuyCapture.call,
          M.CallCandle.close,
        );
        let putPer = Helper.getPercentage(M.BuyCapture.put, M.PutCandle.close);
        if (callPer > putPer && callPer > 0) {
          buyAddon = true;
        }
      }

      order = await buyMain(M.BuyCall, buyAddon);

      // // Resume Addon flag
      // M.P_Addon.flag = addonFlag;

      if (order == undefined) {
        throw new Error("Buy Call ( Main )");
      }
      Helper.addMessage(C.success, "Buy Call ( Main )", C.P2);
    }

    // Move Main Orange Up
    moveOrangeUp(M.BuyCall);

    // Update Buy Info
    M.Buy.reverse = M.Buy.reverse + 1;
    M.Buy.support = M.Buy.support + 1;
    M.Buy.supportFlag = true;
    M.Buy.direction = C.down;
    M.Buy.type = C.call;

    // Update Buy Para
    M.P_Buy.type = C.call;

    // Capture Buy
    Helper.captureBuy();

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

async function sellBoth() {
  var order;

  // Sell Call
  if (M.BuyCall.flag === true) {
    if (M.BuyCall.category === C.main) {
      var order = await sellMain(M.BuyCall);
      if (order == undefined) {
        throw new Error("Sell => Call ( Main )");
      }
    } else {
      var order = await sellSupport(M.BuyCall);
      if (order == undefined) {
        throw new Error("Sell => Call ( Support )");
      }
    }
  }

  // Sell Put
  if (M.BuyPut.flag === true) {
    if (M.BuyPut.category === C.main) {
      var order = await sellMain(M.BuyPut);
      if (order == undefined) {
        throw new Error("Sell => Put ( Main )");
      }
    } else {
      var order = await sellSupport(M.BuyPut);
      if (order == undefined) {
        throw new Error("Sell => Put ( Support )");
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
  var order = await buySupport(M.BuyCall);
  if (order == undefined) {
    Helper.addMessage(C.error, "Buy => Call ( Support )", C.P2);
    return;
  }

  moveOrangeUp(M.BuyPut);

  // Update Buy Log
  Helper.updateLog(C.buy);
}

async function buySupport(Ticker) {
  var order = false;
  if (Ticker == undefined) {
    throw new Error("Order Undefined");
  }

  // Validate Sell Condition
  if (M.P_SellSupport.flag === true && M.Buy.support == M.P_SellSupport.count) {
    Helper.performAction(
      C.support,
      M.P_SellSupport.action,
      M.Buy.index,
      Ticker.type,
    );
    if (M.P_SellSupport.action === C.sell) {
      await sellBoth();
    }
    M.P_SellSupport.flag = false;
    M.paraFlag = true;
    return order;
  }

  order = await buyOrder(Ticker);

  if (order == undefined) {
    Helper.notifyMe("Error in Buy Support Order");
    throw new Error("Error in Buy Support Order");
  }

  // Ticker
  Ticker.flag = true;

  // Parent
  M.Buy.supportFlag = true;
  M.Buy.support = M.Buy.support + 1;
  M.Buy.direction = C.down;

  let slippagePer = Helper.getPercentage(Ticker.candle.close, order.average);
  if (slippagePer < 0) {
    M.Buy.slippage = M.Buy.slippage + 1;
    M.Buy.slippagePer = Helper.formatDecimal(M.Buy.slippagePer + slippagePer);
  }

  // Init Support
  initBuySupport(order);

  // Message
  Helper.addMessage(C.success, "Buy => " + Ticker.type + " ( Support )", C.P2);
  Helper.notifyMe(C.success + " : Buy => " + Ticker.type + " ( Support )");

  // Trn
  updateTrn(C.buy, Ticker);

  // Init Addon, Addon Trn after Parent
  initAddon(Ticker, order);

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

  M.Buy.supportPer = Helper.formatDecimal(M.Buy.supportPer + Ticker.pnl.per);

  let slippagePer = Helper.getPercentage(Ticker.candle.close, order.average);
  if (slippagePer < 0) {
    M.Buy.slippage = M.Buy.slippage + 1;
    M.Buy.slippagePer = Helper.formatDecimal(M.Buy.slippagePer + slippagePer);
  }

  // Ticker
  Ticker.flag = false;
  Ticker.addon = false;

  // Pnl
  updatePnl(Ticker, order);

  // Reset Window
  resetWindow(Ticker.window);

  // Trn
  updateTrn(C.sell, Ticker);

  // Message
  Helper.addMessage(C.success, "Sell => " + Ticker.type + " ( Support )", C.P2);
  Helper.notifyMe(C.success + " : Sell => " + Ticker.type + " ( Support )");

  // Reset Addon
  if (M.BuyAddon.flag === true && Ticker.type === M.BuyAddon.type) {
    settleAddon(order, false);
  }

  // Set Delta Window
  Helper.updateDeltaWindow();

  return order;
}

async function sellCallSupport() {
  if (M.BuyCall.flag === false) {
    Helper.addMessage(C.error, "Cannot Sell Call Support, Dont Exists");
    return;
  }
  var order = await sellSupport(M.BuyCall, false);

  if (order == undefined) {
    throw new Error("Sell => Call ( Support )");
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

  var order = await buySupport(M.BuyPut);
  if (order == undefined) {
    Helper.addMessage(C.error, "Buy => Put ( Support )");
    return;
  }

  moveOrangeUp(M.BuyCall);

  // Update Buy Log
  Helper.updateLog(C.buy);
}

function moveOrangeUp(Ticker) {
  let gap = 0;
  if (M.Buy.supportFlag === false) {
    gap = Helper.formatDecimal(M.Para.hold / 2);
  } else {
    gap = M.Para.hold;
    Helper.captureBuy();
  }
  // Extend Green, If required
  Ticker.window.orange = Helper.addPercentage(Ticker.pnl.ltp, gap);
  if (Ticker.window.orange > Ticker.window.green) {
    Ticker.window.green = Ticker.window.orange;
  }
}

function moveOrangeDown(Ticker) {
  // Donot Extend Red, if Required
  Ticker.window.orange = Helper.addPercentage(Ticker.pnl.ltp, -M.Para.hold);
  if (Ticker.window.orange < Ticker.window.red) {
    Ticker.window.orange = Ticker.window.red;
  }
  Helper.captureBuy();
}

async function sellPutSupport() {
  if (M.BuyPut.flag === false) {
    Helper.addMessage(C.error, "Cannot Sell Put Support, Dont Exists");
    return;
  }

  var order = await sellSupport(M.BuyPut);
  if (order == undefined) {
    throw new Error("Sell => Put ( Support )");
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

  // Validate Sell Condition
  if (M.P_SellAddon.flag === true && M.Para.addonCount == M.P_SellAddon.count) {
    Helper.performAction(
      C.addon,
      M.P_SellAddon.action,
      M.Buy.index,
      Ticker.type,
    );
    if (M.P_SellAddon.action === C.sell) {
      await sellBoth();
    }
    M.P_SellAddon.flag = false;
    M.paraFlag = true;
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

    order = await buyAddonOrder(M.Buy.addon);

    if (order == undefined) {
      Helper.notifyMe("Error : Sell => " + Ticker.type + " ( Addon )");
      throw new Error("Buy ==> " + Ticker.type + "  ( Addon ) ");
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

    // Parent
    let slippagePer = Helper.getPercentage(M.AddonPnl.ltp, order.average);
    if (slippagePer < 0) {
      M.Buy.slippage = M.Buy.slippage + 1;
      M.Buy.slippagePer = Helper.formatDecimal(M.Buy.slippagePer + slippagePer);
    }

    // Trn
    updateTrn(C.buy, M.Buy.addon);

    // Message
    Helper.addMessage(C.success, "Buy ==> " + Ticker.type + " ( Addon )", C.P2);
    Helper.notifyMe(C.success + " : Buy => " + Ticker.type + " ( Addon )");

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

async function buyAddonOrder(Ticker) {
  let order = {};

  // Validation
  if (Ticker.flag == true) {
    throw new Error("Cannot Buy, Already Exists");
  }

  // Get Qty
  let data = M.aData.find(
    (item) => item.category === C.option && item.symbol === Ticker.symbol,
  );

  if (data?.close == undefined || data?.close == 0) {
    throw new Error("Invalid Ticker LTP");
  }

  Ticker.pnl.ltp = data.close;
  Ticker.pnl.qty = getBuyQty(Ticker);

  Ticker.pnl.qty = Ticker.pnl.qty * M.P_Addon.value;

  if (M.Para.switch == C.active) {
    if (M.Para.orderType == C.market) {
      order = await buyMarketOrder(Ticker, Ticker.pnl.qty);
    } else {
      order = await buyLimitOrder(Ticker, Ticker.pnl.qty);
    }
  } else if (M.Para.switch == C.test) {
    order = await buyTestOrder(Ticker);
  } else {
    throw new Error("Inactive Switch");
  }

  return order;
}

async function sellAddon(Ticker) {
  if (M.BuyAddon.flag === false) {
    Helper.addMessage(
      C.error,
      "Cannot Sell " + Ticker.type + " ==> Addon Not Found",
    );
    return;
  }

  if (Ticker.symbol !== M.BuyAddon.symbol) {
    Helper.addMessage(
      C.error,
      "Cannot Sell " + Ticker.type + " ==> Invalid Addon Symbol",
    );
    return;
  }

  try {
    // Sell Addon
    var order = await sellOrder(M.BuyAddon);

    if (order == undefined) {
      Helper.notifyMe("Error ==> Sell Addon ( " + Ticker.type + " )");
      throw new Error("Error ==> Sell Addon ( " + Ticker.type + " )");
    }

    // Parent
    Ticker.addon = false;

    // Settle Addon
    settleAddon(order, true);

    // Allign Main Window
    if (Ticker.category === C.main) {
      moveOrangeUp(Ticker);
    }

    return order;
  } catch (error) {
    Helper.addMessage(C.error, Helper.findMsg(error));
  }
}

function settleAddon(order, parentFlag) {
  // Pnl

  if (parentFlag === true) {
    closeAddonPnl(order);
  } else {
    updatePnl(M.BuyAddon, order);
  }

  // Trn
  updateTrn(C.sell, M.BuyAddon);

  // Update Buy -> Addon Per
  M.Buy.addonPer = Helper.formatDecimal(M.Buy.addonPer + M.AddonPnl.per);

  // Slippage
  let slippagePer = Helper.getPercentage(M.AddonPnl.ltp, order.average);
  if (slippagePer < 0) {
    M.Buy.slippage = M.Buy.slippage + 1;
    M.Buy.slippagePer = Helper.formatDecimal(M.Buy.slippagePer + slippagePer);
  }

  // Message
  Helper.addMessage(
    C.success,
    "Sell ==> " + M.BuyAddon.type + " ( Addon )",
    C.P2,
  );
  Helper.notifyMe(C.success + " + Sell ==> " + M.BuyAddon.type + " ( Addon )");

  // Header
  M.BuyAddon.flag = false;
  M.BuyAddon.parent = false;
  M.BuyAddon.symbol = C.none;
  M.BuyAddon.type = C.none;
  M.BuyAddon.category = C.none;

  Helper.updateDeltaWindow();
}

function updatePnl(Ticker, Order) {
  Ticker.pnl.ltp = Order.average;
  Ticker.pnl.per = Helper.getPercentage(Ticker.pnl.buy, Ticker.pnl.ltp);

  // Update Addon Per / Count
  if (
    M.P_Addon.value > 1 &&
    (Ticker.category === C.mainAddon || Ticker.category === C.supportAddon)
  ) {
    Ticker.pnl.per = Helper.formatDecimal(Ticker.pnl.per * M.P_Addon.value);
  }
}

function closeAddonPnl(Order) {
  let Parent;
  if (M.Buy.type === C.call) {
    Parent = M.BuyCall;
  } else {
    Parent = M.BuyPut;
  }

  // Set the Loss to Support %
  M.Buy.supportPer = Helper.formatDecimal(
    M.Buy.supportPer + Helper.getPercentage(Parent.pnl.buy, Order.average),
  );

  // Add Trn Record
  updateTrn(C.adjust, Parent);

  // Set Main to 100 %, Adjusted in Addon
  Parent.pnl.ltp = Order.average;
  Parent.pnl.buy = Order.average;
  Parent.pnl.per = 0;
  Parent.pnl.usd = Helper.formatDecimal(
    Parent.pnl.qty * Parent.pnl.ltp * M.Buy.lotsize,
  );

  // Update Trn Parent Record
  updateTrn(C.update, Parent);

  updatePnl(M.BuyAddon, Order);
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
};
