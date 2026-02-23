sap.ui.define(function () {
  "use strict";

  var Formatter = {
    headerTitleDisplay: function (HeaderLeft) {
      if (HeaderLeft == this.display) {
        return true;
      } else {
        return false;
      }
    },
    headerTitleEdit: function (HeaderLeft) {
      if (HeaderLeft == this.edit) {
        return true;
      } else {
        return false;
      }
    },
    headerMessage: function (HeaderMiddle) {
      if (HeaderMiddle == this.message) {
        return true;
      } else {
        return false;
      }
    },
    headerBacktest: function (HeaderMiddle) {
      if (HeaderMiddle == this.backtest) {
        return true;
      } else {
        return false;
      }
    },
    headerZoom: function (HeaderRight) {
      if (HeaderRight == this.zoom) {
        return true;
      } else {
        return false;
      }
    },

    headerUpdate: function (HeaderRight) {
      if (HeaderRight == this.update) {
        return true;
      } else {
        return false;
      }
    },

    headerAskbid: function (HeaderRight) {
      if (HeaderRight == this.ask_gap) {
        return true;
      } else {
        return false;
      }
    },

    headerHistory: function (HeaderRight) {
      if (HeaderRight == this.history) {
        return true;
      } else {
        return false;
      }
    },
    pnlSupport: function (pnlType) {
      return pnlType;
    },
    pnlReverse: function (pnlType) {
      return !pnlType;
    },
    pnlDirection: function (Direction) {
      switch (Direction) {
        case this.up:
          return "sap-icon://back-to-top";
        case this.down:
          return "sap-icon://download";
        default:
          return "sap-icon://less";
      }
    },
    PnlDirectionVisible: function (flag) {
      // visible="{ path:'PnlModel>/flag', formatter: '.formatter.PnlDirectionVisible' }"
      if (flag === true) {
      } else {
      }
    },
    supportIcon: function (supportType) {
      switch (supportType) {
        case this.fixed:
          return "sap-icon://pushpin-off";
        case this.trail:
          return "sap-icon://increase-line-height";
      }
    },
    supportDeltaIcon: function (supportDeltaType) {
      switch (supportDeltaType) {
        case this.candle:
          return "sap-icon://bar-chart";
        case this.buy:
          return "sap-icon://cart";
      }
    },
    boxDpIcon: function (boxType) {
      switch (boxType) {
        case this.window:
          return "sap-icon://dimension";
        case this.buy:
          return "sap-icon://cart";
        case this.support:
          return "sap-icon://compare";
        case this.wallet:
          return "sap-icon://wallet";
        case this.alarm:
          return "sap-icon://away";
      }
    },

    pnlDirColor: function (Direction) {
      switch (Direction) {
        case this.up:
          return this.green;
        case this.down:
          return this.red;
        default:
          return "#edeff0";
      }
    },
    PercentageState: function (Percantage) {
      if (Percantage === undefined || Percantage === null) {
        return;
      }
      if (Percantage == 0) {
        return this.greyState;
      } else if (Percantage > 0) {
        return this.greenState;
      } else if (Percantage < 0) {
        return this.redState;
      }
    },
    amountPerStatus: function (Per) {
      if (Per < 35) {
        return this.success;
      } else if (Per < 70) {
        return this.warning;
      } else {
        return this.error;
      }
    },
    PnlActive: function (Status, Mode) {
      if (Status == undefined || Mode == undefined) {
        return false;
      }
      if (Mode == this.none) {
        return false;
      } else {
        return !Status;
      }
    },
    ltpState: function (Active, Pnl) {
      if (Pnl > 0 && Active == false) {
        return this.blueState;
      } else {
        return this.greyState;
      }
      // if (Pnl > 0) {
      //   if (Active == true) {
      //     return this.greyState;
      //   } else {
      //     return this.blueState;
      //   }
      // } else {
      //   return this.greyState;
      // }
    },
    ceMainFlag: function (flag, category) {
      if (flag === true && category === this.main) {
        return true;
      } else {
        return false;
      }
    },
    peMainFlag: function (flag, category) {
      if (flag === true && category === this.main) {
        return true;
      } else {
        return false;
      }
    },
    ceSupportFlag: function (flag, category) {
      if (flag === true && category === this.support) {
        return true;
      } else {
        return false;
      }
    },
    peSupportFlag: function (flag, category) {
      if (flag === true && category === this.support) {
        return true;
      } else {
        return false;
      }
    },
    displayWindowBox: function (InputType) {
      return InputType;
    },
    displayAccountBox: function (InputType) {
      return !InputType;
    },
    displayManageBox: function (ActionType) {
      return ActionType;
    },
    displayAlertBox: function (ActionType) {
      return !ActionType;
    },
    barStrikesDisplay: function (barType) {
      if (barType == this.book) {
        return false;
      } else {
        return true;
      }
    },
    barChartDisplay: function (barType) {
      if (
        barType == this.book ||
        barType == this.history ||
        barType == this.alert ||
        barType == this.message
      ) {
        return false;
      } else {
        return true;
      }
    },
    barHistoryDisplay: function (barType) {
      if (barType == this.history) {
        return true;
      } else {
        return false;
      }
    },
    barBookDisplay: function (barType) {
      if (barType == this.book) {
        return true;
      } else {
        return false;
      }
    },
    barAlertDisplay: function (barType) {
      if (barType == this.alert) {
        return true;
      } else {
        return false;
      }
    },
    barMessageDisplay: function (barType) {
      if (barType == this.message) {
        return true;
      } else {
        return false;
      }
    },
    historyToolbar: function (BarType) {
      if (BarType == this.history) {
        return true;
      } else {
        return false;
      }
    },
    flagType: function (Flag) {
      if (Flag == true) {
        return this.accept;
      } else {
        return this.transparent;
      }
    },
    greenFlagType: function (Flag) {
      if (Flag == true) {
        return this.accept;
      } else {
        return this.transparent;
      }
    },
    orangeFlagType: function (Flag) {
      if (Flag == true) {
        return "Attention";
      } else {
        return this.transparent;
      }
    },
    redFlagType: function (Flag) {
      if (Flag == true) {
        return this.reject;
      } else {
        return this.transparent;
      }
    },
    supportTrailFlag: function (CallActive, PutActive) {
      if (CallActive == true && PutActive == true) {
        return this.reject;
      } else {
        return this.transparent;
      }
    },
    addColon: function (Text) {
      return Text + " :";
    },
    historyTime: function (TimeText) {
      if (TimeText !== null && TimeText !== undefined) {
        var aTime = TimeText.split(" ");
        return aTime[0];
      }
    },
    trackFlagType: function (Flag, Time) {
      if (Flag == false) {
        this.getView().byId("idTrackTimeGap").setText("");
        return "Transparent";
      } else {
        if (Time > 0) {
          return "Accept";
        } else {
          return "Attention";
        }
      }
    },
    conditionType: function (Condition) {
      switch (Condition) {
        case "GT":
          return "Accept";
        case "LT":
          return "Reject";
        default:
          return "Transparent";
      }
    },
    switchType: function (fValue) {
      switch (fValue) {
        case "None":
          return "Reject";
        case "Active":
          return "Success";
        case "Test":
          return "Emphasized";
        default:
          return "Default";
      }
    },
    barTypeIcon: function (fValue) {
      switch (fValue) {
        case "Market":
          return "sap-icon://customer-and-supplier";
        case "Option":
          return "sap-icon://multiselect-none";
        case "Track":
          return "sap-icon://journey-change";
        case "Buy":
          return "sap-icon://cart";
        case "Book":
          return "sap-icon://course-book";
        case "History":
          return "sap-icon://alphabetical-order";
        case "Alert":
          return "sap-icon://bell";
        case "Message":
          return "sap-icon://email";
      }
    },
    perStatus: function (Value) {
      if (Value > 0) {
        return "Indication14";
      } else if (Value < 0) {
        return "Indication12";
      } else {
        return "Indication20";
      }
    },
    slpStatus: function (Value) {
      if (Value > 0) {
        return "Success";
      } else if (Value < 0) {
        return "Error";
      } else {
        return "None";
      }
    },
    alertTypeStatus: function (Type) {
      if (Type == this.call || Type === this.buy) {
        return "Indication14";
      } else if (Type === this.put || Type === "Switch" || Type === this.sell) {
        return "Indication12";
      } else if (Type === this.track) {
        return "Indication15";
      } else {
        return "Indication20";
      }
    },
    blankToolbar: function (
      BarType,
      BuyDeltaFlag,
      TrackFlag,
      BuyFlag,
      ChartType,
    ) {
      if (
        (BarType == this.option && BuyDeltaFlag == true) ||
        (BarType == this.track && TrackFlag == true) ||
        (BarType == this.buy && BuyFlag == true) ||
        (BarType == this.book && ChartType == this.option) ||
        (BarType == this.history && BuyFlag == true)
      ) {
        return false;
      } else {
        return true;
      }
    },
    BuyDeltaToolbar: function (BarType, BuyDeltaFlag) {
      if (BarType == this.option && BuyDeltaFlag == true) {
        return true;
      } else {
        return false;
      }
    },
    trackToolbar: function (BarType, TrackFlag) {
      if (BarType == this.track && TrackFlag == true) {
        return true;
      } else {
        return false;
      }
    },
    buyToolbar: function (BarType, BuyFlag) {
      if (BarType == this.buy && BuyFlag == true) {
        return true;
      } else {
        return false;
      }
    },
    buyDeltaNeg: function (BuyDeltaType) {
      if (BuyDeltaType == this.negative || BuyDeltaType == this.both) {
        return true;
      } else {
        return false;
      }
    },
    bookToolbar: function (BarType) {
      if (BarType == this.book) {
        return true;
      } else {
        return false;
      }
    },
    sellDeltaEdit: function (SellDeltaType) {
      if (SellDeltaType == this.none) {
        return false;
      } else {
        return true;
      }
    },
    calcAmt: function (Amount, Currency) {
      if (Currency == this.inr) {
        return Math.round(Amount * 85);
      } else {
        return Math.round(Amount);
      }
    },
    historyMainIconColor: function (aTrn) {
      if (aTrn == undefined) {
        return this.black;
      }
      var mainTrn = aTrn.find(
        (item) => item.flag == true && item.category == this.main,
      );
      if (mainTrn == undefined) {
        return this.black;
      }
      var symbolType = this.getSymbolType(mainTrn.symbol);
      if (symbolType == this.call) {
        return this.green;
      } else if (symbolType == this.put) {
        return this.red;
      } else {
        return this.black;
      }
    },
    historySupportIconColor: function (aTrn) {
      if (aTrn == undefined) {
        return this.black;
      }
      var supportTrn = aTrn.find(
        (item) => item.flag == true && item.category == this.support,
      );
      if (supportTrn == undefined) {
        return this.black;
      }
      var symbolType = this.getSymbolType(supportTrn.symbol);
      if (symbolType == this.call) {
        return this.green;
      } else if (symbolType == this.put) {
        return this.red;
      } else {
        return this.black;
      }
    },
    historyMainAddonIconColor: function (aTrn) {
      if (aTrn == undefined) {
        return this.black;
      }
      var mainTrn = aTrn.find(
        (item) => item.flag == true && item.category == this.mainAddon,
      );
      if (mainTrn == undefined) {
        return this.black;
      }
      return "blue";
    },
    historySupportAddonIconColor: function (aTrn) {
      if (aTrn == undefined) {
        return this.black;
      }
      var supportTrn = aTrn.find(
        (item) => item.flag == true && item.category == this.supportAddon,
      );
      if (supportTrn == undefined) {
        return this.black;
      }
      return "blue";
    },
    historyMainAddonVisible: function (aTrn) {
      if (aTrn == undefined) {
        return false;
      }
      var mainTrn = aTrn.find(
        (item) => item.flag == true && item.category == this.mainAddon,
      );
      if (mainTrn == undefined) {
        return false;
      }
      return true;
    },
    historySupportAddonVisible: function (aTrn) {
      if (aTrn == undefined) {
        return false;
      }
      var supportTrn = aTrn.find(
        (item) => item.flag == true && item.category == this.supportAddon,
      );
      if (supportTrn == undefined) {
        return false;
      }
      return true;
    },
    historyAddonVisible: function (aTrn) {
      if (aTrn == undefined) {
        return true;
      }
      var mainTrn = aTrn.find(
        (item) => item.flag == true && item.category == this.mainAddon,
      );

      var supportTrn = aTrn.find(
        (item) => item.flag == true && item.category == this.supportAddon,
      );

      if (mainTrn === undefined && supportTrn === undefined) {
        return true;
      } else {
        return false;
      }
    },
    historyMainIconColor_old: function (BuyType) {
      if (this.buyInfo == undefined) {
        return this.black;
      }
      if (BuyType == this.call) {
        if (this.buyInfo.call.active == true) {
          return this.green;
        } else {
          return this.black;
        }
      } else if (BuyType == this.put) {
        if (this.buyInfo.put.active == true) {
          return this.red;
        } else {
          return this.black;
        }
      } else {
        return this.black;
      }
    },
    historySupportIconColor_old: function (BuyType) {
      if (this.buyInfo == undefined) {
        return this.black;
      }
      if (BuyType == this.put) {
        if (this.buyInfo.put.active == true) {
          return this.red;
        } else {
          return this.black;
        }
      } else if (BuyType == this.call) {
        if (this.buyInfo.call.active == true) {
          return this.green;
        } else {
          return this.black;
        }
      } else {
        return this.black;
      }
    },
    currStatus: function (Per) {
      if (Per == 0) {
        return this.reject;
      } else if (Per < 35) {
        return this.accept;
      } else if (Per < 70) {
        return "Attention";
      } else {
        return this.reject;
      }
    },
    formatSlippage: function (Value) {
      var per = 0;
      if (Value > 99 || Value < -99) {
        per = Math.round(Value);
      } else {
        per = Math.round(Value * 10) / 10;
      }
      return per + " %";
    },
    formatBuy: function (Buy) {
      if (Buy < 0) {
        return 0;
      } else {
        return Buy;
      }
    },
    formatTime: function (Time) {
      if (Time === 0 || Time === null || Time === undefined) {
        return "";
      }

      let unit = "";
      let date = new Date(Time).getDate();
      let month = this.aMonth[new Date(Time).getMonth()];
      let min = new Date(Time).getMinutes();
      let hour = new Date(Time).getHours();
      if (hour > 12) {
        hour = hour - 12;
        unit = "PM";
      } else {
        unit = "AM";
      }
      return date + "  " + month + " ,  " + hour + ":" + min + " " + unit;
      // return new Date(Time).toTimeString().slice(0, 5);
    },
    trnStatus: function (Active) {
      if (Active == true) {
        return "Success";
      } else {
        return "Error";
      }
    },

    selectedTimeframe: function (Timeframe) {
      if (Timeframe != undefined) {
        var timeframe = this.aTimeframe.find((item) => item.key == Timeframe);
        if (timeframe == undefined) {
          return " ";
        } else {
          return timeframe.text;
        }
      }
    },
    selectedExpiry: function (ExpiryTime) {
      if (ExpiryTime != undefined) {
        var expiry = this.aExpiry.find((item) => item.key == ExpiryTime);
        if (expiry == undefined) {
          return " ";
        } else {
          return expiry.text;
        }
      }
    },
    backtestInc: function (Inc, Ltp) {
      return Math.round((Inc * Ltp) / 100);
    },
    trnIconColor: function (category, type) {
      if (category == undefined || type == undefined) {
        return;
      }

      if (category === this.mainAddon || category === this.supportAddon) {
        return "blue";
      } else if (
        category === this.mainAdjust ||
        category === this.supportAdjust
      ) {
        return "orange";
      } else {
        if (type === this.call) {
          return "Positive";
        } else if (type === this.put) {
          return "Negative";
        } else if (type === this.reverse) {
          return "Default";
        }
      }
    },
    msgSettingIcon: function (msgSetting) {
      switch (msgSetting) {
        case this.fixed:
          return "sap-icon://pushpin-off";
          break;
        case this.expand:
          return "sap-icon://pull-down";
          break;
        case this.auto:
          return "sap-icon://drop-down-list";
          break;
        default:
          return "sap-icon://less";
          break;
      }
    },
    headerMsgFixed: function (headerMsgType) {
      if (headerMsgType === this.fixed) {
        return this.emphasized;
      } else {
        return this.default;
      }
    },
    headerMsgExpand: function (headerMsgType) {
      if (headerMsgType === this.expand) {
        return this.emphasized;
      } else {
        return this.default;
      }
    },
    headerMsgAuto: function (headerMsgType) {
      if (headerMsgType === this.auto) {
        return this.emphasized;
      } else {
        return this.default;
      }
    },
    volumeTrackAlert: function (volTypeAction) {
      if (volTypeAction === this.alert) {
        return this.emphasized;
      } else {
        return this.default;
      }
    },
    volumeTrackBuy: function (volTypeAction) {
      if (volTypeAction === this.buy) {
        return this.emphasized;
      } else {
        return this.default;
      }
    },
    volumeTrackSell: function (volTypeAction) {
      if (volTypeAction === this.sell) {
        return this.emphasized;
      } else {
        return this.default;
      }
    },
    volumeTrackNone: function (volTypeAction) {
      if (volTypeAction === this.none) {
        return this.emphasized;
      } else {
        return this.default;
      }
    },

    buyDeltaDirUp: function (buyDeltaDir) {
      if (buyDeltaDir === this.up) {
        return this.emphasized;
      } else {
        return this.default;
      }
    },

    buyDeltaDirDown: function (buyDeltaDir) {
      if (buyDeltaDir === this.down) {
        return this.emphasized;
      } else {
        return this.default;
      }
    },

    buyDeltaDirNone: function (buyDeltaDir) {
      if (buyDeltaDir === this.none) {
        return this.emphasized;
      } else {
        return this.default;
      }
    },

    oiTrackAlert: function (oiTypeAction) {
      if (oiTypeAction === this.alert) {
        return this.emphasized;
      } else {
        return this.default;
      }
    },
    oiTrackBuy: function (oiTypeAction) {
      if (oiTypeAction === this.buy) {
        return this.emphasized;
      } else {
        return this.default;
      }
    },
    oiTrackSell: function (oiTypeAction) {
      if (oiTypeAction === this.sell) {
        return this.emphasized;
      } else {
        return this.default;
      }
    },
    oiTrackNone: function (oiTypeAction) {
      if (oiTypeAction === this.none) {
        return this.emphasized;
      } else {
        return this.default;
      }
    },
    trackIcon: function (action) {
      switch (action) {
        case this.none:
          return "sap-icon://less";
        case this.buy:
          return "sap-icon://cart";
        case this.sell:
          return "sap-icon://shipping-status";
        case this.alert:
          return "sap-icon://bell";
      }
    },
    trackType: function (flag, action) {
      if (flag === false) {
        return this.transparent;
      }
      switch (action) {
        case this.none:
          return this.transparent;
        case this.buy:
          return this.accept;
        case this.sell:
          return this.reject;
        case this.alert:
          return this.emphasized;
      }
    },
    volumeTrackIcon: function (type) {
      switch (type) {
        case this.average:
          return "sap-icon://chart-axis";
        case this.percentage:
          return "sap-icon://commission-check";
      }
    },
    oiTrackIcon: function (type) {
      switch (type) {
        case this.up:
          return "sap-icon://back-to-top";
        case this.down:
          return "sap-icon://download";
      }
    },
    buyDeltaIcon: function (type) {
      switch (type) {
        case this.up:
          return "sap-icon://back-to-top";
        case this.down:
          return "sap-icon://download";
        case this.none:
          return "sap-icon://less";
      }
    },
    buyDeltaType: function (type, flag) {
      if (flag == false) {
        return this.transparent;
      }
      switch (type) {
        case this.up:
          return this.accept;
        case this.down:
          return this.reject;
        case this.none:
          return this.transparent;
      }
    },
    clockTypeStopwatch: function (clockType) {
      if (clockType === this.stopwatch) {
        return this.emphasized;
      } else {
        return this.default;
      }
    },
    clockTypeClock: function (clockType) {
      if (clockType === this.clock) {
        return this.emphasized;
      } else {
        return this.default;
      }
    },
    clockTypeBuy: function (clockType) {
      if (clockType === this.buy) {
        return this.emphasized;
      } else {
        return this.default;
      }
    },
    notifyDevice: function (status) {
      if (status === true) {
        return this.accept;
      } else if (status === false) {
        return this.reject;
      } else {
        return this.default;
      }
    },
    trailPer: function (flag, trail) {
      if (trail === 0 || trail === undefined || flag === false) {
        return "";
      } else {
        return trail + " %";
      }
    },
    profitTrailType: function (flag) {
      if (flag === true) {
        return this.reject;
      } else {
        return this.transparent;
      }
    },
    lossTrailType: function (flag) {
      if (flag === true) {
        return this.accept;
      } else {
        return this.transparent;
      }
    },
    buyBoxVisible: function (id) {
      if (id === "idBuyInputButton") {
        return true;
      } else {
        return false;
      }
    },
    supportBoxVisible: function (id) {
      if (id === "idSupportInputButton") {
        return true;
      } else {
        return false;
      }
    },
    walletBoxVisible: function (id) {
      if (id === "idWalletInputButton") {
        return true;
      } else {
        return false;
      }
    },
    alarmBoxVisible: function (id) {
      if (id === "idAlarmInputButton") {
        return true;
      } else {
        return false;
      }
    },
    windowBoxVisible: function (id) {
      if (id === "idWindowInputButton") {
        return true;
      } else {
        return false;
      }
    },
    sellBoxVisible: function (id) {
      if (id === "idSellInputButton") {
        return true;
      } else {
        return false;
      }
    },
    trackBoxVisible: function (id) {
      if (id === "idTrackInputButton") {
        return true;
      } else {
        return false;
      }
    },

    actionBoxVisible: function (id) {
      if (id === "idActionInputButton") {
        return true;
      } else {
        return false;
      }
    },
    buyCallSymbol: function (trackFlag, buyFlag, symbol) {
      let type = this.transparent;
      if (trackFlag == true) {
        type = this.attention;
      }
      if (buyFlag === true && this.para?.buy?.callSymbol === symbol) {
        type = this.success;
        // type = this.emphasized;
      }
      return type;
    },
    buyPutSymbol: function (trackFlag, buyFlag, symbol) {
      let type = this.transparent;
      if (trackFlag == true) {
        type = this.attention;
      }
      if (buyFlag === true && this.para?.buy?.putSymbol === symbol) {
        type = this.success;
        // type = this.emphasized;
      }
      return type;
    },
    pnlTagPer: function (value) {
      if (value == undefined) {
        return 0;
      } else {
        return value;
      }
    },
    pnlTagStatus: function (value) {
      if (value > 0) {
        return this.success;
      } else if (value < 0) {
        return this.error;
      } else {
        return this.none;
      }
    },
    displayAddon: function (flag) {
      if (flag == false) {
        return true;
      } else {
        return false;
      }
    },
    displayAddonPnl: function (flag) {
      if (flag == true) {
        return true;
      } else {
        return false;
      }
    },
    addonIcon: function (value) {
      if (value == undefined) {
        return false;
      } else {
        return value;
      }
    },
    deltaWindowGapPer: function (gap) {
      if (gap === undefined) {
        return "0 %";
      } else {
        return gap + " %";
      }
    },
    addonMainIcon: function (flag, category) {
      let display = false;

      // Display Addon Bar
      this.handleAddonBar();

      if (flag === false) {
        return display;
      }

      if (category === this.mainAddon) {
        display = true;
      }

      return display;
    },
    addonSupportIcon: function (flag, category) {
      let display = false;
      if (flag === false) {
        return display;
      }

      if (category === this.supportAddon) {
        display = true;
      }

      return display;
    },
    addonActive: function (flag) {
      if (flag === undefined || flag === false) {
        return false;
      } else {
        return true;
      }
    },
    addonInactive: function (flag) {
      if (flag === undefined || flag === false) {
        return true;
      } else {
        return false;
      }
    },
    fragmentName: function (layout) {
      return "ns.deltaapphost.fragment." + layout;
    },
    horizontalRightVisible: function (layout) {
      if (layout === this.horizontalFull) {
        return false;
      } else {
        return true;
      }
    },
    verticalBottomVisible: function (layout) {
      if (layout === this.verticalFull) {
        return false;
      } else {
        return true;
      }
    },
    input1Title: function (id) {
      switch (id) {
        case "idBuyInputButton":
          return "Buy";
        case "idSupportInputButton":
          return "Support";
        case "idWalletInputButton":
          return "Wallet";
        case "idAlarmInputButton":
          return "Alarm";
        default:
          throw new Error("Invalid Input 1");
      }
    },
    input2Title: function (id) {
      switch (id) {
        case "idWindowInputButton":
          return "Window";
        case "idSellInputButton":
          return "Sell";
        case "idTrackInputButton":
          return "Track";
        case "idActionInputButton":
          return "Action";
        default:
          throw new Error("Invalid Input 1");
      }
    },
    sellActionIcon: function (action) {
      switch (action) {
        case this.alert:
          return "sap-icon://bell";
        case this.sell:
          return "sap-icon://shipping-status";
        default:
          return "sap-icon://less";
      }
    },
    sellActionType: function (flag, action) {
      if (flag === false) {
        return this.transparent;
      } else {
        switch (action) {
          case this.alert:
            return this.emphasized;
          case this.sell:
            return this.reject;
          default:
            return this.transparent;
        }
      }
    },

    sellDeltaActionIcon: function (action) {
      switch (action) {
        case this.alert:
          return "sap-icon://bell";
        case this.sell:
          return "sap-icon://shipping-status";
        default:
          return "sap-icon://less";
      }
    },
    sellDeltaActionType: function (flag, action) {
      if (flag === false) {
        return this.transparent;
      } else {
        switch (action) {
          case this.alert:
            return this.emphasized;
          case this.sell:
            return this.error;
          default:
            return this.transparent;
        }
      }
    },
    sellSupportActionIcon: function (action) {
      switch (action) {
        case this.alert:
          return "sap-icon://bell";
        case this.sell:
          return "sap-icon://shipping-status";
        default:
          return "sap-icon://less";
      }
    },
    sellSupportActionType: function (flag, action) {
      if (flag === false) {
        return this.transparent;
      } else {
        switch (action) {
          case this.alert:
            return this.emphasized;
          case this.sell:
            return this.error;
          default:
            return this.transparent;
        }
      }
    },
    sellAddonActionIcon: function (action) {
      switch (action) {
        case this.alert:
          return "sap-icon://bell";
        case this.sell:
          return "sap-icon://shipping-status";
        default:
          return "sap-icon://less";
      }
    },
    sellAddonActionType: function (flag, action) {
      if (flag === false) {
        return this.transparent;
      } else {
        switch (action) {
          case this.alert:
            return this.emphasized;
          case this.sell:
            return this.error;
          default:
            return this.transparent;
        }
      }
    },
    trackVolumeTypeIcon: function (type) {
      switch (type) {
        case this.average:
          return "sap-icon://chart-axis";
        case this.percentage:
          return "sap-icon://commission-check";
        default:
          return "sap-icon://less";
      }
    },
    trackOiTypeIcon: function (type) {
      switch (type) {
        case this.up:
          return "sap-icon://back-to-top";
        case this.down:
          return "sap-icon://download";
        default:
          return "sap-icon://less";
      }
    },
    alarmActionType: function (actionType) {
      if (actionType === true) {
        return this.accept;
      } else {
        return this.default;
      }
    },
    barHorizontalLayout: function (layout) {
      if (layout === this.horizontal) {
        return true;
      } else {
        return false;
      }
    },
    barVerticalLayout: function (layout) {
      if (layout === this.vertical) {
        return true;
      } else {
        return false;
      }
    },
    alertActionIcon: function (action) {
      switch (action) {
        case this.buy:
          return "sap-icon://cart";
        case this.sell:
          return "sap-icon://shipping-status";
        case this.alert:
          return "sap-icon://bell";
        default:
          return "sap-icon://less";
      }
    },
    alertActionColor: function (action) {
      switch (action) {
        case this.buy:
          return this.green;
        case this.sell:
          return this.red;
        case this.alert:
          return this.blue;
        default:
          return this.black;
      }
    },
    pnlAmount: function (amt) {
      if (amt === undefined) {
        return "0 $";
      } else {
        return amt + " $";
      }
    },
    orderTypeIcon: function (Type) {
      switch (Type) {
        case this.market:
          return "sap-icon://customer-and-supplier";
        case this.limit:
          return "sap-icon://collections-insight";
        default:
          return "";
      }
    },
    priceTypeIcon: function (Type) {
      switch (Type) {
        case this.maker:
          return "sap-icon://person-placeholder";
        case this.taker:
          return "sap-icon://family-care";
        default:
          return "";
      }
    },
    alarmText: function (time) {},
    historyDate: function (timestamp) {
      if (timestamp !== undefined && timestamp !== null) {
        return this.dateToTextFormat(new Date(timestamp));
      }
    },
    historicalTime: function (timestamp) {
      if (timestamp !== undefined && timestamp !== null) {
        let unit = "";
        let Text = new Date(timestamp).toTimeString();
        var aHour = Text.split(":");
        var hour = aHour[0];
        var min = aHour[1].slice(0, 2);

        if (hour > 12) {
          hour = hour - 12;
          unit = " PM";
        } else {
          unit = " AM";
        }

        return hour + " : " + min + unit;
      }
    },
    historyCoinName: function (index) {
      if (index === this.btc) {
        return this.bitcoin;
      }
      if (index === this.eth) {
        return this.ethereum;
      }
    },
    historyStrike: function (symbol) {
      if (symbol !== undefined && symbol !== null) {
        if (symbol?.split("-")[2] !== undefined) {
          return symbol.split("-")[2];
        } else {
          return "0";
        }
      } else {
        return "0";
      }
    },
    historyExpiry: function (symbol) {
      if (symbol !== undefined && symbol !== null) {
        if (symbol?.split("-")[3] !== undefined) {
          let day = symbol.split("-")[3].slice(0, 2);
          let month = this.aMonth[symbol.split("-")[3].slice(2, 4) - 1];
          return day + " " + month;
        } else {
          return "0";
        }
      } else {
        return "0";
      }
    },
    addDollar: function (amount) {
      if (amount === undefined || amount === null || Number.isNaN(amount)) {
        return "0 $";
      } else {
        return amount + " $";
      }
    },
    addPercentage: function (value) {
      if (value === undefined || value === null || Number.isNaN(value)) {
        return "0 %";
      } else {
        return value + " %";
      }
    },
    addSlpPercentage: function (value) {
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        Number.isNaN(value)
      ) {
        return " ";
      } else {
        return value + " %";
      }
    },
    statusColorFormatter: function (value) {
      if (value !== undefined && value !== null) {
        // 'this' in a formatter can refer to the control instance
        if (value === "Rejected") {
          this.addStyleClass("myCustomRed");
        } else if (value === "Approved") {
          this.addStyleClass("myCustomGreen");
        } else {
          this.removeStyleClass("myCustomRed");
          this.removeStyleClass("myCustomGreen");
        }
        return value; // Return the original value to be displayed in the cell
      }
    },
    historyPnlAmount: function (amount, pnl) {
      let pnlAmt = this.formatDecimal((amount * pnl) / 100);
      return pnlAmt + " $";
    },
    hitState: function (Percantage) {
      if (Percantage === undefined || Percantage === null) {
        return;
      }
      if (Percantage == 0) {
        return this.greyState;
      } else if (Percantage > 75) {
        return this.greenState;
      } else if (Percantage > 50) {
        return this.warning;
      } else if (Percantage < 50) {
        return this.redState;
      }
    },
    secondsToText: function (Seconds) {
      // return new Date(Seconds).toTimeString().slice(0, 5);
      let date = new Date(Seconds);
      let hour = date.getHours();
      let min = date.getMinutes();
      let unit = " ";
      if (hour > 12) {
        hour = hour - 12;
        unit = " PM";
      } else {
        unit = " AM";
      }
      return hour + ":" + min + unit;
    },
    profitTrailFlagType: function (flag) {
      if (flag === true) {
        return this.reject;
      } else {
        return this.default;
      }
    },
    lossTrailFlagType: function (flag) {
      if (flag === true) {
        return this.accept;
      } else {
        return this.default;
      }
    },
    actionMenuPosition: function (layout) {
      if (layout === this.vertical) {
        return "BeginTop";
      } else {
        return "BeginBottom";
      }
    },
    showSlippage: function (status) {
      return status;
    },
    hideSlippage: function (status) {
      return !status;
    },
    // alarmActionIcon: function (alarmAction) {
    //   switch (alarmAction) {
    //     case this.delta:
    //       return "sap-icon://back-to-top";
    //     case this.track:
    //       return "sap-icon://journey-change";
    //     case this.both:
    //       return "sap-icon://decision";
    //     case this.none:
    //       return "sap-icon://less";
    //     default:
    //       return "sap-icon://less";
    //   }
    // },
  };
  return Formatter;
}, /* bExport= */ true);
