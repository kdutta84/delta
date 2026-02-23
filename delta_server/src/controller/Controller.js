////////////////////////////////////////////////////
//                  Init Files                    //
////////////////////////////////////////////////////
const M = require("../model/Model");
const C = require("../model/Constant");
const Helper = require("../utils/Helper");
const Track = require("../utils/Track");
const Buy = require("../utils/Buy");
const env = require("dotenv").config();
const mongoose = require("mongoose");

// Objects
const ccxt = require("ccxt");
const socket = require("websocket-heart-beat");

////////////////////////////////////////////////////
//                 Process Server                 //
////////////////////////////////////////////////////
async function initServer() {
  try {
    // Server Start
    M.serverStart = +new Date();
    await initDelta();
    await Helper.getOpenPosition();
    await initSocket();
    Helper.initMongoDb();
    Helper.initEmail();
  } catch (error) {
    Helper.addMessage(C.error, Helper.findMsg(error), C.P1);
  }
}

////////////////////////////////////////////////////
//               Init Delta Exchange              //
////////////////////////////////////////////////////
async function initDelta() {
  // Create an instance of the Delta exchange
  M.oDelta = new ccxt.delta({
    apiKey: process.env.API_KEY,
    secret: process.env.API_SECRET,
  });

  // Override the Base API URLs
  M.oDelta.urls.api = {
    public: process.env.API,
    private: process.env.API,
  };

  // Load markets asynchronously
  await M.oDelta.loadMarkets();
}

////////////////////////////////////////////////////
//                   Init Socket                  //
////////////////////////////////////////////////////
async function initSocket(req, res) {
  try {
    oSocket = new socket("wss://socket.india.delta.exchange", {
      pingMessage: "ping",
      connectionLimit: 10, // max reconnect attempts
      connectionTimeout: 30000, // ms before retry connection
      pingTimeout: 5000, // ms to send next ping
      pongTimeout: 5000, // ms to wait for pong

      onConnect: () => {
        throw new Error("Trying to connect...");
      },

      onBeatStart: () => {
        // oSocket.send("Heartbeat started");
      },

      onConnectTimesLimit: () => {
        throw new Error("Reached Connection Retry Limit");
      },
    });

    oSocket.addEventListener("open", async (event) => {
      await initProcess();
    });

    oSocket.addEventListener("message", async (event) => {
      await processData(JSON.parse(event.data));
    });

    oSocket.addEventListener("close", () => {
      throw new Error("Connection Closed");
    });

    oSocket.addEventListener("error", () => {
      throw new Error("WebSocket Error");
    });
  } catch (error) {
    Helper.addMessage(C.error, Helper.findMsg(error), C.P1);
  }
}

////////////////////////////////////////////////////
//               Init Socket Process              //
////////////////////////////////////////////////////
async function initProcess() {
  // Initialize Para
  await Helper.initPara();
  // Get Wallet
  await Helper.getWallet();
  // Update Symbols
  await Helper.initSymbols();
}

////////////////////////////////////////////////////
//               Process Socket Data              //
////////////////////////////////////////////////////
async function processData(data) {
  if (M.busyFlag === true) {
    return;
  }

  try {
    // Set Busy Flag
    Helper.setBusy(true, "Process Data");

    // Check New Candle
    await Helper.checkNewCandle();

    // Validate Candle Time
    if (data.candle_start_time / 1000 < M.Para.chart.startCandle) {
      Helper.setBusy(false);
      return;
    }

    // Process Channel Data
    if (data.type === C.tickerChannel || data.type === M.Para.channel) {
      // Update Data Tickers
      Helper.updateDataTickers(data);

      if (M.Buy.flag == true) {
        // Process Buy
        await Buy.processBuy();
      } else {
        // Process Buy Delta
        if (M.P_BuyDelta.flag == true) {
          await Track.processBuyDelta();
        }

        // Process Track
        if (M.P_Track.flag == true && M.P_Track.time > 0) {
          await Track.processTracking();
        }
      }
    }
    Helper.setBusy(false);
  } catch (error) {
    Helper.setBusy(false);
    Helper.addMessage(C.error, Helper.findMsg(error), C.P1);
  }
}

////////////////////////////////////////////////////
//              Handle Connection                 //
////////////////////////////////////////////////////
function handleConnection(req, res) {
  Helper.sendMessage(res, C.success, "Server Connected");
}

////////////////////////////////////////////////////
//              Handle Connection                 //
////////////////////////////////////////////////////
function handleLayout(req, res) {
  Helper.sendMessage(res, C.success, M.Para.layout);
}

////////////////////////////////////////////////////
//                   Handle Para                  //
////////////////////////////////////////////////////
function handlePara(req, res) {
  try {
    var key = Object.keys(req.body)[0];
    var value = Object.values(req.body)[0];

    if (Helper.isObject(value)) {
      Helper.resetWithRef(M.Para[key], value);
    } else {
      M.Para[key] = value;
    }

    // Take Action
    switch (key) {
      case "chart":
        Helper.addChartSymbol(value);
        break;
      case "hold":
        Buy.updateMainWindow();
        break;
      case "exit":
        Buy.updateMainWindow();
        break;
      case "support":
        Buy.updateSupportWindow();
        break;
      case "supportDelta":
        Helper.setDeltaWindow();
        break;
      case "addon":
        // if (M.P_Addon.flag == true) {
        //   Buy.manageBuy(C.addon);
        // }
        Helper.initScalePara();
        break;
      case "expiry":
        Helper.addMessage(C.info, "Manual Trigger ==> Change Expiry", C.P2);
        Helper.setExpiryPara(new Date(Number(value.time)));
        Helper.restartProcess();
        break;
      case "timeframe":
        Helper.addMessage(C.info, "Manual Trigger ==> Change Timeframe", C.P2);
        M.Para.channel = "candlestick_" + M.Para.timeframe;
        M.P_Chart.interval = Helper.getInterval();
        M.P_Chart.range = Helper.getRange();
        // Update Chart Start Candle
        Helper.setChartTimelines();
        // M.appAction = key;
        M.paraFlag = true;
        Helper.restartProcess();
        break;
      case "strikeGap":
        Helper.addMessage(C.info, "Manual Trigger ==> Change Strike Gap", C.P2);
        Helper.restartProcess();
        break;
      case "scale":
        Helper.initScalePara();
        Buy.updateWindow();
        break;
      case "buyDelta":
        if (M.Buy.flag == true && M.Para.buyDelta.flag === true) {
          M.Para.buyDelta.flag = false;
          Helper.addMessage(C.error, "Active Order Exists", C.P2);
        }
        break;
      case "track":
        if (M.P_Track.flag == true && M.aTrack.length == 0) {
          M.appAction = key;
          if (M.Para.switch == C.none) {
            Helper.addMessage(C.error, "Switch Inactive", C.P2);
          }
        }
        if (M.P_Track.flag == false && M.aTrack.length > 0) {
          Track.stopTracking();
        }
        break;
      // case "volume":
      //   if (M.Para.volume.flag == false && value.flag == true) {
      //     // Track.addVolume();
      //   }
      //   M.Para.volume = value;
      //   break;
      // case "alarm":
      //   if (M.Para.alarm.flag == true && value.flag == true) {
      //   }
      //   M.Para.alarm = value;
      //   break;
    }

    // Update Para Log
    Helper.updateLog(C.para);

    // Return Updated Para
    Helper.sendData(res, M.Para);
  } catch (error) {
    Helper.addMessage(C.error, Helper.findMsg(error), C.P1);
  }
}

////////////////////////////////////////////////////
//                 Handle Action                  //
////////////////////////////////////////////////////
async function handleAction(req, res) {
  var key = Object.keys(req.body)[0];
  var value = Object.values(req.body)[0];

  switch (key) {
    case "StartApp":
      M.Para.barType = C.option;
      M.P_Chart.category = C.market;
      M.P_Chart.symbol = C.btcSymbol;
      M.P_Chart.callSymbol = C.none;
      M.P_Chart.putSymbol = C.none;
      M.P_Chart.callStrike = 0;
      M.P_Chart.putStrike = 0;
      Helper.sendData(res, M.Para);
      break;

    case "notify":
      Helper.addMessage(C.info, "Notification Modified", C.P3);
      break;

    case "RestartUsingLog":
      M.Para.initPara = C.log;
      initProcess();
      Helper.addMessage(
        C.info,
        "Manual Trigger ==> Restart Server Using Log",
        C.P1,
      );
      break;

    case "RestartUsingPara":
      M.Para.initPara = C.para;
      initProcess();
      Helper.addMessage(
        C.info,
        "Manual Trigger ==> Restart Server Using Para",
        C.P1,
      );
      break;

    case "RestartUsingDatabase":
      M.Para.initPara = C.database;
      initProcess();
      Helper.addMessage(
        C.info,
        "Manual Trigger ==> Restart Server Using Para",
        C.P1,
      );
      break;

    // case "RestartServer":
    // Helper.restartServer();
    // Helper.addMessage(C.info, "Manual Trigger ==> Server Restart", C.P1);
    // break;

    case "GetLayout":
      Helper.sendData(res, M.Para.layout);
      break;

    case "GetMessage":
      Helper.sendData(res, M.aAllMsg);
      break;

    case "ResetMessage":
      M.aAllMsg = [];
      Helper.sendData(res, M.aAllMsg);
      break;

    case "BarStrikes":
      Helper.sendBarStrikes(res);
      break;

    case "NewCandle":
      Helper.sendData(res, M.Para);
      break;

    case "RefreshBuy":
      // Helper.checkVolumeTrigger();
      // Helper.checkOiTrigger();
      // Helper.checkAlarmTrigger();
      // await Helper.dbInsertRecord();
      // await Helper.sendEmail();
      // Helper.initExpiryPara();
      // await Helper.restartProcess();
      // await Helper.checkNewCandle();
      // return;
      //////////////
      Buy.refreshBuyInfo();
      Helper.sendMessage(res, C.success, "Buy Refresh");
      break;

    case "ResetBuy":
      if (M.Buy.flag == true) {
        throw new Error("Cannot reset Buy, is Active");
      }
      Buy.resetBuy();
      Helper.sendData(res, M.Para);
      break;

    case "ResetBusy":
      M.busyFlag = false;
      M.busyTime = 0;
      M.busyProcess = C.none;
      break;

    case "BuyChart":
      var status = Helper.validateBuySymbols(value);
      if (status == C.error) {
        Helper.sendMessage(res, C.error, "Invalid Chart Symbols");
      } else {
        Helper.resetWithRef(M.P_Buy, value);
        M.appAction = key;
        Helper.sendMessage(res, C.info, "Manual Trigger ==>  Buy Chart");
      }
      break;

    case "BuySupport":
      M.appAction = key;
      Helper.sendMessage(res, C.info, "Manual Trigger ==> Buy Support");
      break;

    case "SellSupport":
      M.appAction = key;
      Helper.sendMessage(res, C.info, "Manual Trigger ==> Sell Support");
      break;

    case "BuyAddon":
      M.appAction = key;
      Helper.sendMessage(res, C.info, "Manual Trigger ==> Buy Addon");
      break;

    case "SellAddon":
      M.appAction = key;
      Helper.sendMessage(res, C.info, "Manual Trigger ==> Sell Addon");
      break;

    case "ReverseWithSupport":
      M.appAction = key;
      Helper.sendMessage(
        res,
        C.info,
        "Manual Trigger ==> Reverse With Support",
      );
      break;

    case "ReverseWithoutSupport":
      M.appAction = key;
      Helper.sendMessage(
        res,
        C.info,
        "Manual Trigger ==> Reverse Without Support",
      );
      break;

    case "SellBoth":
      M.appAction = key;
      Helper.sendMessage(res, C.info, "Manual Trigger ==> Both Sold");
      break;

    case "SellAll":
      M.appAction = key;
      Helper.sendMessage(res, C.info, "Manual Trigger ==> Sell All");
      break;

    case "Backtest":
      M.appAction = key;
      M.Para.backtest = value.flag;
      M.Backtest = value;
      Helper.sendData(res, M.Backtest);
      break;

    case "GetPara":
      Helper.sendData(res, M.Para);
      break;

    // case "setBuyDelta":
    //   Helper.sendData(res, M.Para.BuyDelta);
    //   break;

    // case "setTrack":
    //   Helper.sendData(res, M.Para.Track);
    //   break;

    case "ParaBuy":
      Helper.sendData(res, M.Para.buy);
      break;

    case "ParaTrack":
      Helper.sendData(res, M.Para.track);
      break;

    case "TrackInfo":
      Helper.sendData(res, M.P_Track);
      break;

    case "BuyInfo":
      // Helper.getPara(req, res);
      Helper.sendData(res, { buyInfo: M.Buy, aTrn: M.aTrn });
      break;

    case "OpenPosition":
      // Helper.getOpenPosition();
      M.appAction = key;
      Helper.sendMessage(res, C.info, "Check Open Position");
      break;

    case "ServerStart":
      Helper.sendData(res, M.serverStart);
      break;

    case "ResetParaLog":
      Helper.deleteLog(C.para);
      Helper.sendMessage(res, C.info, "Manual Trigger ==> Para Log Deleted");
      break;

    case "ResetTrackLog":
      Helper.deleteLog(C.track);
      Helper.sendMessage(res, C.info, "Manual Trigger ==> Track Log Deleted");
      break;

    case "ResetBuyLog":
      Helper.deleteLog(C.buy);
      Helper.deleteLog(C.trn);
      Helper.sendMessage(res, C.info, "Manual Trigger ==> Buy Log Deleted");
      break;

    case "Alerts":
      Helper.sendData(res, M.aAlert);
      break;

    case "Sell":
      Helper.resetWithRef(M.Para.sell, value);
      Helper.sendData(res, M.Para.sell);
      break;

    case "ResetAlert":
      M.aAlert = [];
      Helper.sendData(res, M.aAlert);
      break;

    case "Records":
      M.appAction = key;
      // const database = mongoose.db("delta");
      // const collection = database.collection("records");

      // // Query for all documents in the collection
      // const query = {};
      // const cursor = collection.find(query).limit(10); // Limit to 10 for example

      // let history = mongoose.records.find({});
      // Helper.sendData(res, M.Para);
      Helper.sendMessage(res, C.info, "DB Data Fetched");
      break;
  }
  // Helper.sendMessage(res, C.success, key + " Updated");
}

////////////////////////////////////////////////////
//                  Handle Data                   //
////////////////////////////////////////////////////
async function handleData(req, res) {
  if (M.busyFlag) {
    let serverData = JSON.parse(JSON.stringify(M.I_Data));
    serverData.flags.busy = true;
    serverData.flags.busyProcess = M.busyProcess;
    Helper.sendData(res, serverData);
    return;
  }
  try {
    // Process Action
    if (M.appAction != C.none) {
      await processAppAction();
    }
    await Helper.getLiveData(req, res);
  } catch (error) {
    Helper.addMessage(C.error, Helper.findMsg(error), C.P1);
  }
}

////////////////////////////////////////////////////
//               Process App Action               //
////////////////////////////////////////////////////
async function processAppAction() {
  if (M.busyFlag) {
    return;
  }
  Helper.setBusy(true, M.appAction);
  try {
    switch (M.appAction) {
      case "track":
        await Track.initTracking();
        break;

      case "OpenPosition":
        await Helper.getOpenPosition();
        break;

      case "BuyChart":
        await Buy.initBuy();
        break;

      case "SellBoth":
        await Buy.sellBoth();
        break;

      case "SellAll":
        await Buy.sellAll();
        break;

      case "BuySupport":
        if (M.Buy.type == C.call) {
          await Buy.buyPutSupport();
        } else if (M.Buy.type == C.put) {
          await Buy.buyCallSupport();
        } else {
          Helper.addMessage(C.error, "Sell => Invalid Support Type", C.P2);
        }
        break;

      case "SellSupport":
        if (M.Buy.type == C.call) {
          // Call Condition
          let callCond =
            M.BuyCapture?.callPer >= M.BuyCapture?.putPer &&
            M.BuyCapture?.callPer >= 0;
          // Sell Put Support
          await Buy.sellPutSupport(M.Buy.put, false);
          // Buy Call Addon
          await Buy.processBuyCallAddon(callCond);
        } else {
          let putCond =
            M.BuyCapture?.putPer >= M.BuyCapture?.callPer &&
            M.BuyCapture?.putPer >= 0;
          await Buy.sellCallSupport(M.Buy.call, false);
          // Buy Put Addon
          await Buy.processBuyPutAddon(putCond);
        }
        break;

      case "BuyAddon":
        if (M.Buy.supportFlag === false) {
          if (M.Buy.type == C.call) {
            await Buy.buyAddon(M.BuyCall);
          } else if (M.Buy.type == C.put) {
            await Buy.buyAddon(M.BuyPut);
          }
        } else {
          if (M.Buy.type == C.call) {
            await Buy.buyAddon(M.BuyPut);
          } else if (M.Buy.type == C.put) {
            await Buy.buyAddon(M.BuyCall);
          }
        }
        break;

      case "SellAddon":
        if (M.BuyAddon.flag === true) {
          if (M.BuyAddon.type == C.call) {
            await Buy.sellAddon(M.BuyCall);
          } else if (M.BuyAddon.type == C.put) {
            await Buy.sellAddon(M.BuyPut);
          }
        } else {
          Helper.addMessage(C.error, "Sell => No Active Addon", C.P2);
        }
        break;

      case "ReverseWithSupport":
        await Buy.reverseWithSupport();
        break;

      case "ReverseWithoutSupport":
        await Buy.reverseWithoutSupport();
        break;

      case "timeframe":
        await Helper.upadateSymbols();
        break;

      case "Records":

      // // const database = mongoose.db("delta");
      // const collection = mongoose.collection("records");

      // // Query for all documents in the collection
      // const query = {};
      // const cursor = collection.find(query).limit(10); // Limit to 10 for example

      // let history = mongoose.records.find({});
    }
    M.appAction = C.none;
    Helper.setBusy(false);
  } catch (error) {
    Helper.setBusy(false);
    Helper.addMessage(C.error, Helper.findMsg(error), C.P1);
  }
}

async function handleRecords(req, res) {
  // Set Busy Flag
  Helper.setBusy(true, "Fetch Records");

  let from = Object.values(req.body)[0];
  let to = Object.values(req.body)[1];

  let records = await M.recordModel.find({
    timestamp: { $gt: from, $lt: to },
  });
  Helper.sendData(res, records);

  // Reset Busy Flag
  Helper.setBusy(false);
}

async function handleItem(req, res) {
  let timestamp = Object.values(req.body)[0];
  let items = await M.historyModel.find({ parent: timestamp });
  Helper.sendData(res, items);
}

// Exports
module.exports = {
  initServer,
  handleLayout,
  handleConnection,
  handlePara,
  handleAction,
  handleData,
  handleRecords,
  handleItem,
};
