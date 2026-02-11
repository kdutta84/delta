var M = require("../model/Model");
var C = require("../model/Constant");
var Helper = require("../utils/Helper");
var Buy = require("../utils/Buy");

async function processBuyDelta() {
  // Process Buy delta for all Indexes
  for (let i = 0; i < M.aAllIndex.length; i++) {
    await checkBuyDelta(M.aAllIndex[i]);
  }
}

async function checkBuyDelta(index) {
  var call,
    put,
    delta = 0,
    buyStatus = false;

  call = M.aData.find((item) => item.index == index && item.type == C.call);
  put = M.aData.find((item) => item.index == index && item.type == C.put);
  if (call === undefined || put === undefined) {
    return;
  }

  delta = Helper.getDelta(call.per, put.per);

  switch (M.P_BuyDelta.type) {
    case C.up:
      buyStatus = delta > M.P_BuyDelta.value;
      break;
    case C.down:
      buyStatus = delta < M.P_BuyDelta.value;
      break;
    default:
      throw new Error("Invalid Buy Delta Type");
  }
  // Buy Triggered
  if (buyStatus) {
    if (M.Para.switch === C.none) {
      M.P_BuyDelta.flag = false;
      M.paraFlag = true;
      Helper.performAction(C.buyDelta, C.alert, index, "Switch");
      throw new Error("Buy Delta => Inactive Switch");
    }

    M.P_Buy.flag = true;
    M.P_Buy.index = index;
    M.P_Buy.type = call.per > put.per ? C.call : C.put;
    M.P_Buy.callSymbol = call.symbol;
    M.P_Buy.putSymbol = put.symbol;
    await Buy.initBuy();
  }
}

async function processTracking() {
  if (M.P_Track?.flag === false || M.aTrack?.length === 0) {
    return;
  }

  try {
    // Update Track Candle
    updateTrackData();

    // Buy Track Options
    await buyTrack();
  } catch (error) {
    Helper.addMessage(C.error, Helper.findMsg(error), C.P1);
  }
}

function updateTrackData() {
  for (let i = 0; i < M.aTrack.length; i++) {
    const track = M.aTrack[i];
    let ticker = M.aData.find(
      (item) => item.category === C.option && item.symbol === track.symbol,
    );
    if (ticker?.close != undefined && ticker?.close > 0) {
      Helper.updateCandle(track, ticker.close);
      track.fromHigh = Helper.getPercentage(track.high, track.close);
      track.fromLow = Helper.getPercentage(track.low, track.close);
    }
  }
}

async function buyTrack() {
  if (M.Buy.flag === true) {
    return;
  }

  for (let i = 0; i < M.aAllIndex.length; i++) {
    const index = M.aAllIndex[i];
    let callTicker = M.aTrack.find(
      (item) => item.index === index && item.type === C.call,
    );

    let putTicker = M.aTrack.find(
      (item) => item.index === index && item.type === C.put,
    );

    if (callTicker === undefined || putTicker === undefined) {
      return;
    }

    // Call high, Put Low
    if (
      callTicker.fromLow > M.P_Track.high &&
      putTicker.fromHigh < M.P_Track.low
    ) {
      if (M.Para.switch == C.none) {
        M.P_Track.flag = false;
        M.paraFlag = true;
        stopTracking();
        Helper.performAction(C.track, C.alert, index, "Switch");
        throw new Error("Cannot Buy Track, Inactive Switch");
      }
      M.P_Buy.flag = true;
      M.P_Buy.index = index;
      M.P_Buy.type = C.call;
      M.P_Buy.callSymbol = callTicker.symbol;
      M.P_Buy.putSymbol = putTicker.symbol;
      await Buy.initBuy();
      return;
    }

    // Put High, Call Low
    if (
      callTicker.fromHigh < M.P_Track.low &&
      putTicker.fromLow > M.P_Track.high
    ) {
      if (M.Para.switch == C.none) {
        M.P_Track.flag = false;
        M.paraFlag = true;
        stopTracking();
        Helper.performAction(C.track, C.alert, index, "Switch");
        throw new Error("Cannot Buy Track, Inactive Switch");
      }
      M.P_Buy.flag = true;
      M.P_Buy.index = index;
      M.P_Buy.type = C.put;
      M.P_Buy.callSymbol = callTicker.symbol;
      M.P_Buy.putSymbol = putTicker.symbol;
      await Buy.initBuy();
      return;
    }
  }
}

async function initTracking() {
  if (M.P_Track.flag === false) {
    Helper.addMessage(C.error, "Tracking Not Started, Flag is OFF", C.P2);
    return;
  }

  // Get Track History
  await getTrackHistory();

  M.strikeFlag = true;
}

async function getTrackHistory() {
  Helper.setBusy(true);
  M.aTrack = [];

  let history = [],
    aSymbols = [];

  try {
    for (let i = 0; i < M.aData.length; i++) {
      const data = M.aData[i];
      if (data.category != C.option) {
        continue;
      }
      // Get History
      history = await M.oDelta.fetchOHLCV(
        data.symbol,
        M.Para.timeframe,
        M.P_Track.time,
      );

      let track = JSON.parse(JSON.stringify(M.I_Track));

      // Fill Track Array
      track.index = data.index;
      track.type = data.type;
      track.symbol = data.symbol;
      track.strike = data.strike;

      if (history.length > 0) {
        let candle = Helper.historyToCandle(history);
        track.open = candle.open;
        track.high = candle.high;
        track.low = candle.low;
        track.close = candle.close;
      } else {
        track.open = data.open;
        track.high = data.high;
        track.low = data.low;
        track.close = data.close;
      }

      // Collect Symbol
      aSymbols.push(data.symbol);

      M.aTrack.push(track);
    }

    // Add Track record to Data Array
    Helper.addSymbols(C.track, aSymbols);
    Helper.setBusy(false);
  } catch (error) {
    Helper.addMessage(C.error, error.message, C.P1);
    Helper.setBusy(false);
  }
}

function stopTracking() {
  // Helper.resetWithRef(M.P_Track, M.I_Para.track);
  M.P_Track.flag = false;
  M.P_Track.time = 0;
  Helper.resetWithRef(M.Track, M.I_Track);
  M.aTrack = [];
  M.trackFlag = true;
}

module.exports = {
  processBuyDelta,
  processTracking,
  initTracking,
  stopTracking,
};
