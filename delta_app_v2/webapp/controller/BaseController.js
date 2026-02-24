sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/core/BusyIndicator",
    "sap/m/MessagePopover",
    "sap/ui/core/InvisibleMessage",
    "sap/m/library",
    "sap/ui/core/Theming",
    "highcharts/highstock",
    "ns/deltaapphost/model/formatter",
  ],
  function (
    Controller,
    MessageBox,
    JSONModel,
    MessageToast,
    Fragment,
    BusyIndicator,
    MessagePopover,
    InvisibleMessage,
    library,
    Theming,
    highcharts,
    formatter,
  ) {
    // Popup Message
    var oMessagePopover = new MessagePopover({
      items: {
        path: "MessageModel>/",
        template: new sap.m.MessagePopoverItem({
          type: "{MessageModel>type}",
          title: "{MessageModel>message}",
        }),
      },
    });

    var URLHelper = library.URLHelper;

    ("use strict");
    return Controller.extend("ns.deltaapphost.controller.BaseController", {
      initController: function () {
        // Add Msg Clear Button
        this.addMsgClearButton();

        // Hide Top Navigation Bar
        this.hideNavBar();

        // Set App Style
        this.getView().addStyleClass("sapUiSizeCompact");

        // Init Constants
        this.initConstants();

        // Init Variables
        this.initVaribles();

        // Check Connection Status
        this.checkInternetConn();

        // Set Theme
        this.setTheme();

        // Init Models
        this.initModels();

        // Init Addon Bar
        this.toggleAddonBar();

        // this.onBuyHistory();
        // return;

        // Get Dependent Modules
        var that = this;
        sap.ui.require(
          [
            "highcharts/modules/exporting",
            "highcharts/modules/price-indicator",
            "highcharts/modules/drag-panes",
            "highcharts/highcharts-more",
            "highcharts/indicators/indicators-all",
            "highcharts/modules/annotations-advanced",
            "highcharts/modules/full-screen",
            "highcharts/modules/stock-tools",
            "highcharts/themes/adaptive",
          ],
          function (
            // @ts-ignore
            exporting,
            // @ts-ignore
            priceInd,
            // @ts-ignore
            dragPanes,
            // @ts-ignore
            more,
            // @ts-ignore
            indicators,
            // @ts-ignore
            annotations,
            // @ts-ignore
            fullscreen,
            // @ts-ignore
            stockTools,
            // @ts-ignore
            theme,
          ) {
            // Init Charts
            that.initCharts();

            // Start Process
            that.startProcess();
          },
        );
      },
      setTheme: function () {
        sap.ui.getCore().applyTheme("sap_horizon");
      },
      onLayout: function () {
        if (this.screen.layout === this.horizontal) {
          this.setLayout(this.vertical);
        } else {
          this.setLayout(this.horizontal);
        }
      },
      setLayout: function (layout) {
        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        oRouter.navTo(layout, {});
      },
      onChartLayout: function () {
        switch (this.screen.layout) {
          case this.horizontal:
            switch (this.screen.chartLayout) {
              case this.horizontalHalf:
                this.screen.chartLayout = this.horizontalFull;
                break;
              case this.horizontalFull:
                this.screen.chartLayout = this.horizontalHalf;
                break;
              default:
                throw new Error("Invalid Layout");
            }
            break;
          case this.vertical:
            switch (this.screen.chartLayout) {
              case this.verticalHalf:
                this.screen.chartLayout = this.verticalFull;
                break;
              case this.verticalFull:
                this.screen.chartLayout = this.verticalHalf;
                break;
              default:
                throw new Error("Invalid Layout");
            }
            break;
        }
        this.updateModel("ScreenModel", this.screen);
        this.setChartLayout();
      },
      initScreenPara: function () {
        this.screen.headerMiddle = this.para.headerMiddle;
        this.screen.msgSetting = this.para.msgSetting;
        this.screen.layout = this.para.layout;
        this.screen.chartLayout = this.para.chartLayout;
        this.updateModel("ScreenModel", this.screen);
        this.setChartLayout();
      },
      setChartLayout: function () {
        switch (this.screen.chartLayout) {
          case this.horizontalHalf:
            this.stockChart.setSize(1380, 1030, false);
            break;
          case this.horizontalFull:
            this.stockChart.setSize(1910, 1030, false);
            break;
          case this.verticalHalf:
            this.stockChart.setSize(1070, 1300, false);
            break;
          case this.verticalFull:
            this.stockChart.setSize(1070, 1300, false);
            break;
          default:
            throw new Error("Invalid Layout");
        }
      },
      updateChartLayout: function () {
        if (this.screen.layout !== this.para.layout) {
          this.screen.layout = this.para.layout;
          this.onLayout();
        } else if (this.screen.chartLayout !== this.para.chartLayout) {
          this.onChartLayout();
        }
      },
      addMsgClearButton: function () {
        if (oMessagePopover.getHeaderButton() !== null) {
          return;
        }
        // Message Clear Button
        if (oMessagePopover.getHeaderButton() === null) {
          var that = this;
          var oClearMsg = new sap.m.Button({
            text: "Clear",
            icon: "sap-icon://delete",
            press: [that.onClearMessages, that],
          });
          oMessagePopover.setHeaderButton(oClearMsg);
          this.byId("idMessagePopoverButton").addDependent(oMessagePopover);
        }
      },
      startProcess: async function () {
        // Check Server Connection

        try {
          // await this.checkServerConn();
          // Get Server Para & Set Default Bar Type
          await this.updateServerPara("barType", this.option);
          // await this.serverAction("StartApp", true);
          // Set Chart Layout
          this.initScreenPara();
          this.setTimeArray();
          this.setBarClock();
          await this.getServerMessages();
          await this.getBarStrikes();
          await this.displayDefaultChart();
          await this.initPlotLines();
          await this.setBarType();
          this.setZoomPara();
          this.getLiveData();
          // Check Open Positions
          // this.onOpenPosition();
        } catch (error) {
          this.setMessage(this.error, error, this.P1);
        }
      },
      onClearMessages: function (para) {
        this.serverAction("ResetMessage", true);

        this.getView().byId("idBarMessageCountGenericTag").setText("Count : 0");
      },
      onHeaderMsgCancel: function () {
        this.getView().byId("idMessageButton").setText("No Messages");
        this.getView().byId("idMessageButton").setType(this.transparent);

        var oActionSheet = this.getView().byId("headerMessages");
        var aButtons = oActionSheet.mAggregations.buttons;

        if (aButtons == undefined) {
          return;
        }
        for (let i = aButtons.length - 1; i >= 0; i--) {
          var button = aButtons[i];
          oActionSheet.removeButton(button);
          button.destroy(); // Destroy the control to release resources
        }
        this.aHeaderMsg = [];
      },
      fetchServer: async function (route) {
        var url = this.apiPath + route;

        return new Promise(function (resolve, reject) {
          fetch(url)
            .then((response) => {
              if (!response.ok) {
                throw new Error(`Fetching: ${route}`);
              }
              return response.json();
            })
            .then((data) => {
              resolve(data);
            })
            .catch((error) => {
              reject(error);
            });
        });
      },
      displayBusyDialog: function () {
        var oView = this.getView();
        // Token Popup
        if (!this._BusyDialog) {
          this._BusyDialog = Fragment.load({
            id: oView.getId(),
            name: "ns.deltaapphost.fragment.BusyDialog",
            controller: this,
          }).then(
            function (oDialog) {
              oView.addDependent(oDialog);
              oDialog.setText(this.flags?.busyProcess ?? "");
              return oDialog;
            }.bind(this),
          );
        }

        var that = this;
        this._BusyDialog.then(function (oDialog) {
          oDialog.open();
        });
      },
      onBusyDialogClose: function () {
        this.serverAction("ResetBusy", true);
      },
      checkBusyFlag: function () {
        switch (this.flags.busy) {
          case true:
            if (this._BusyDialog === undefined) {
              this.isBusy = true;
            }
            break;
          case false:
            if (this.isBusy === true) {
              this.isBusy = false;
              this.serverAction("ResetBusy", true);
              // this.onBusyDialogClose();
            }
            // BusyIndicator.hide();
            break;
          case null:
            // Do Nothing
            break;
        }
        if (this.flags.buys == true) {
          return true;
        } else {
          return false;
        }
      },
      displayServerMsg: function () {
        if (this.aMessage?.length == undefined || this.aMessage?.length == 0) {
          return;
        }

        for (let i = 0; i < this.aMessage.length; i++) {
          const row = this.aMessage[i];
          this.displayMessage(row.type, row.message, row.priority);

          if (row.type == this.error) {
            this.errorBeepAlert();
          } else {
            this.infoBeepAlert();
          }
        }

        this.onBarMessageFilter();
      },
      onBuyDeltaFlag: function () {
        if (this.para.buyDelta.flag == true) {
          this.para.buyDelta.flag = false;
          this.para.buyDelta.type = this.up;
          this.updateServerPara("buyDelta", this.para.buyDelta);
        } else {
          if (this.para.buyDelta.type == this.none) {
            this.setMessage(this.error, "Invalid BuyDelta Direction", this.P3);
            return;
          }
          if (this.buyInfo?.flag == true) {
            this.setMessage(
              this.error,
              "Cannot Activate BuyDelta, Buy is Active",
              this.P3,
            );
            return;
          }
          this.para.buyDelta.flag = true;
          this.updateServerPara("buyDelta", this.para.buyDelta);
          if (this.para.switch == this.none) {
            this.setMessage(this.error, "Switch is Inactive", this.P3);
          }
        }
      },
      onBuyDelta: function () {
        this.updateServerPara("buyDelta", this.para.buyDelta);
      },
      onSupportDelta: function () {
        this.updateServerPara("supportDelta", this.para.supportDelta);
      },
      onAddon: function () {
        this.updateServerPara("addon", this.para.addon);
      },
      onBuyDeltaType: function (oEvent) {
        if (this.para.buyDelta.type == this.up) {
          this.para.buyDelta.type = this.down;
        } else {
          this.para.buyDelta.type = this.up;
        }
        this.para.buyDelta.value = this.para.buyDelta.value * -1;
        this.updateServerPara("buyDelta", this.para.buyDelta);
      },
      checkServerFLags: async function () {
        if (this.flags.para) {
          await this.serverAction("GetPara", true);
        }

        if (this.flags.strike) {
          await this.serverAction("BarStrikes", true);
        }

        if (this.flags.chart) {
          // await this.displayDefaultChart();
          if (this.para.chart.category === this.market) {
            this.displayMarketChart();
          } else {
            this.displayOptionChart();
          }
        }

        if (this.flags.candle) {
          await this.serverAction("NewCandle", true);
        }

        if (this.flags.buy) {
          await this.serverAction("BuyInfo", true);
        }

        if (this.flags.track === true) {
          await this.serverAction("ParaTrack", true);
        }

        if (this.flags.msg) {
          await this.serverAction("GetMessage", true);
        }

        if (this.flags.alert) {
          await this.serverAction("Alerts", true);
        }
      },
      getServerTime: function () {
        if (!this.openServer) {
          return;
        }
        // this.serverStart

        let gap = this.getCurrentTime() - this.serverStart;
        if (gap > 0) {
          let upTime = this.convertSecondsForClock(gap);
          this.getView().byId("idObjectStatus").setText(upTime);
        }
      },
      getLiveData: async function () {
        if (this.busyFlag == true) {
          this.resumeLiveData();
          return;
        }

        // Delete Exisiting Chart Messages in 10 secs
        if (
          this.aHeaderMsg.length > 0 &&
          this.getCurrentTime() > this.lastHeaderMsg + 10000
        ) {
          this.onHeaderMsgCancel();
        }

        var result = await this.fetchServer("/data");

        if (result.status != this.success || result.data == undefined) {
          MessageToast.show("Error Fetching Live Data");
          this.resumeLiveData();
          return;
        }

        // Assign Data
        this.result = result.data;
        this.marketTicker = result.data.chart.market;
        this.callTicker = result.data.chart.call;
        this.putTicker = result.data.chart.put;
        this.deltaTicker = result.data.chart.delta;
        this.buyInfo = result.data.buy;
        this.aTrn = result.data.aTrn;
        this.aMessage = result.data.aMessage;
        this.flags = result.data.flags;

        // Check Server Messages
        this.displayServerMsg();

        // Check Server Flags
        await this.checkServerFLags();

        // Server Time
        this.getServerTime();

        // Check Busy Flag
        let isBusy = this.checkBusyFlag();
        if (isBusy == true) {
          this.resumeLiveData();
          return;
        }

        // Buy Info
        if (this.buyInfo?.flag == true) {
          this.updateBuyPnl();
          this.updateBuyWindow();
          this.updateTrnHistory();
        }

        // // Update Stopwatch
        this.updateStopwatch();

        this.updateTrackTimeGap();

        // Update Stock Chart
        this.updateStockChart(this.result.chart);

        // // Update Bar Chart
        this.updateBarChart(this.result.bar);

        // Update OrderBook
        this.getOrderBook();

        // Update Delta %
        this.updateCurrDeltaPer();

        // Chart Header Data
        this.updateHeaderInfo();

        // Resume Live Data
        this.resumeLiveData();
      },
      getOrderBook: function () {
        if (
          this.para.chart.category == this.market ||
          this.para.barType != this.book
        ) {
          return;
        }

        var path = "/v2/l2orderbook/";

        // Book Type
        if (this.bookType == this.call) {
          path = path + this.para.chart.callSymbol;
        } else {
          path = path + this.para.chart.putSymbol;
        }

        // Fetch Order Book
        var that = this;
        this.fetchDelta(this.get, path)
          .then(function (Book) {
            var buyBook = [];
            var sellBook = [];
            var price = 0,
              size = 0,
              amount = 0;

            var buy = Book.result.buy;
            var sell = Book.result.sell;

            // Buy Book
            for (let i = 0; i < buy.length; i++) {
              if (i >= 10) {
                break;
              }

              var buyRow = {};
              buyRow.price = buy[i].price;
              buyRow.size = buy[i].size;
              buyRow.amount = Math.round(buyRow.price * buyRow.size);
              buyRow.amtText = that.convertAmtToText(buyRow.amount);
              buyBook.push(buyRow);
              if (i < 5) {
                price = +price + +buyRow.price;
                size = +size + +buyRow.size;
                amount = +amount + +buyRow.amount;
              }
            }

            var callPrice = Math.round(price / 5);
            var callSize = that.convertAmtToText(size);
            var callAmt = that.convertAmtToText(amount);

            price = 0;
            size = 0;
            amount = 0;

            // Sell Book
            for (let i = 0; i < sell.length; i++) {
              if (i >= 10) {
                break;
              }
              var sellRow = {};
              sellRow.price = sell[i].price;
              sellRow.size = sell[i].size;
              sellRow.amount = Math.round(sellRow.price * sellRow.size);
              sellRow.amtText = that.convertAmtToText(buyRow.amount);
              sellBook.push(sellRow);
              if (i < 5) {
                price = +price + +sellRow.price;
                size = +size + +sellRow.size;
                amount = +amount + +sellRow.amount;
              }
            }

            var putPrice = Math.round(price / 5);
            var putSize = that.convertAmtToText(size);
            var putAmt = that.convertAmtToText(amount);

            // Gap
            if (buyBook?.length > 0 && sellBook?.length > 0) {
              var gap,
                gapState = that.none;
              var buyGap = Number(buyBook[0].price);
              var sellGap = Number(sellBook[0].price);
              gap = Number(
                parseFloat(((buyGap - sellGap) / buyGap) * 100).toFixed(1),
              );
            }
            // set model
            var oBookModel = new JSONModel({
              buyBook: buyBook,
              sellBook: sellBook,
              callPrice: callPrice,
              callSize: callSize,
              callAmt: callAmt,
              putPrice: putPrice,
              putSize: putSize,
              putAmt: putAmt,
              gap: gap,
            });

            that.getView().setModel(oBookModel, "BookModel");
          })
          .catch((error) => {
            that.setMessage(that.error, this.getErrorMsg(error), this.P1);
          });
      },
      convertAmtToText: function (Amount) {
        var amtText;
        var length = Amount.toString().length;
        if (length > 6) {
          amtText = Math.round(Amount / 1000000);
          // amtText = Math.round(Amount / 100000);
          amtText = amtText + " M";
        } else if (length > 5) {
          amtText = Math.round(Amount / 100000);
          // amtText = Math.round(Amount / 100000);
          amtText = amtText + " L";
        } else if (length > 3) {
          // amtText = this.formatDecimal(Amount / 1000);
          amtText = Math.round(Amount / 1000);
          amtText = amtText + " K";
        } else {
          amtText = Amount;
        }

        return amtText;
      },
      updateHeaderInfo: function () {
        if (this.para.chart.category == this.market) {
          return;
        }
        if (this.screen.headerRight == this.update) {
          this.getHeaderUpdate();
        }
        if (this.screen.headerRight == this.ask_gap) {
          this.getHeaderAskbid();
        }
      },
      getHeaderUpdate: function () {
        var callText = 0,
          putText = 0;

        if (this.para.chart.category == this.option) {
          var callTime = this.getCurrentTime() - this.callTicker.lastUpdated;
          callText = this.convertSecondsToTime(callTime);

          var putTime = this.getCurrentTime() - this.putTicker.lastUpdated;
          putText = this.convertSecondsToTime(putTime);
        }

        this.getView().byId("idHeaderUpdateCallTitle").setText(callText);
        this.getView().byId("idHeaderUpdatePutTitle").setText(putText);
      },
      getHeaderAskbid: function () {
        var path = "/v2/l2orderbook/";

        // Book Type
        if (this.askGapType == this.call) {
          path = path + this.para.chart.callSymbol;
        } else {
          path = path + this.para.chart.putSymbol;
        }

        // Fetch Order Book
        var that = this;
        this.fetchDelta(this.get, path)
          .then(function (Book) {
            // @ts-ignore
            var buyBook = [];
            // @ts-ignore
            var sellBook = [];
            // @ts-ignore
            var price = 0,
              size = 0,
              amount = 0;

            var OptionLtp = 0;

            var buy = Book.result.buy;
            var sell = Book.result.sell;

            that.bestBuy = Number(buy[0].price);
            that.bestSell = Number(sell[0].price);

            if (that.askGapType == that.call) {
              OptionLtp = that.callTicker.close;
            } else {
              OptionLtp = that.putTicker.close;
            }

            if (that.bestBuy != undefined && that.bestBuy != 0) {
              var buyGap = that.getPercentage(OptionLtp, that.bestBuy);
              that
                .getView()
                .byId("idaskGapBuyObjectStatus")
                .setText(Math.round(buyGap) + " %");
              that
                .getView()
                .byId("idaskGapBuyObjectStatus")
                .setState(that.getState(buyGap));
            }

            if (that.bestSell != undefined && that.bestSell != 0) {
              var sellGap = that.getPercentage(OptionLtp, that.bestSell);
              that
                .getView()
                .byId("idaskGapSellObjectStatus")
                .setText(Math.round(sellGap) + " %");
              that
                .getView()
                .byId("idaskGapSellObjectStatus")
                .setState(that.getState(sellGap));
            }
          })
          .catch((error) => {
            that.setMessage(that.error, error, this.P1);
          });
      },
      getState: function (Value) {
        if (Value == 0) {
          return this.greyState;
        } else if (Value > 0) {
          return this.greenState;
        } else if (Value < 0) {
          return this.redState;
        }
      },
      getSymbolType: function (Symbol) {
        var aSymbol = Symbol.split("-");
        if (aSymbol[0] == "C") {
          return this.call;
        } else if (aSymbol[0] == "P") {
          return this.put;
        } else {
          return undefined;
        }
      },
      convertSecondsForClock: function (seconds) {
        seconds = Math.round(seconds / 1000);
        const days = Math.floor(seconds / (24 * 3600));
        seconds %= 24 * 3600;
        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        let result = [];
        // if (days > 0) result.push(`${days} day${days !== 1 ? "" : ""}`);
        // if (hours > 0) result.push(`${hours} ${hours !== 1 ? "" : ""}`);
        // if (minutes > 0) result.push(`${minutes} ${minutes !== 1 ? "" : ""}`);
        // if (remainingSeconds > 0 && result.length === 0)
        //   result.push(
        //     `${remainingSeconds} ${remainingSeconds !== 1 ? "" : ""}`
        //   );

        if (minutes < 0) {
          result.push(`${minutes} ${minutes !== 1 ? "" : ""}`);
          result.push(
            `${remainingSeconds} ${remainingSeconds !== 1 ? "" : ""}`,
          );
        } else {
          result.push(`${hours} ${hours !== 1 ? "" : ""}`);
          result.push(`${minutes} ${minutes !== 1 ? "" : ""}`);
        }
        return result.join(" : ");
      },
      convertSecondsToTime: function (seconds) {
        seconds = Math.round(seconds / 1000);
        const days = Math.floor(seconds / (24 * 3600));
        seconds %= 24 * 3600;
        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        let result = [];
        if (days > 0) result.push(`${days} day${days !== 1 ? "s" : ""}`);
        if (hours > 0) result.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
        if (minutes > 0) result.push(`${minutes} ${minutes !== 1 ? "m" : "m"}`);
        if (remainingSeconds > 0 || result.length === 0)
          result.push(
            `${remainingSeconds} ${remainingSeconds !== 1 ? "s" : "s"}`,
          );

        // this.getView().byId("trackTimeMsg").setText(result.join(", "));
        return result.join(", ");
      },
      convertSecondsForHistory: function (seconds) {
        seconds = Math.round(seconds / 1000);
        const days = Math.floor(seconds / (24 * 3600));
        seconds %= 24 * 3600;
        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        let result = [];
        if (days > 0) result.push(`${days} day${days !== 1 ? "s" : ""}`);
        if (hours > 0) result.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
        if (minutes > 0) result.push(`${minutes} ${minutes !== 1 ? "m" : "m"}`);

        if (days == 0 && hours == 0 && minutes == 0) {
          if (remainingSeconds > 0 || result.length === 0)
            result.push(
              `${remainingSeconds} ${remainingSeconds !== 1 ? "s" : "s"}`,
            );
        }

        // this.getView().byId("trackTimeMsg").setText(result.join(", "));
        return result.join(", ");
      },
      onTimeFrame: function (oEvent) {
        this.para.timeframe = oEvent.getParameters().item.getKey();
        this.updateServerPara("timeframe", this.para.timeframe);
      },
      updateCurrDeltaPer: function () {
        var per = 0;

        if (this.para?.chart?.category == this.option) {
          per = this.deltaTicker?.close ?? 0;
        }

        this.getView()
          .byId("idCurrDeltaObjectStatus")
          .setText(per + "%");
        this.getView()
          .byId("idCurrDeltaObjectStatus")
          .setState(this.getObjectState(per));
      },
      onExpiry: function (oEvent) {
        var item = oEvent.getParameters().item;
        if (item == undefined) {
          this.setMessage(this.error, "Invalid Expiry", this.P3);
        } else {
          this.para.expiry.time = item.getKey();
          this.updateServerPara("expiry", this.para.expiry);
        }
      },
      getDeltaLastPrice: function () {
        if (
          this.callTicker?.per != undefined &&
          this.putTicker?.per == undefined
        ) {
          return this.getDelta(this.callTicker.per, this.putTicker.per);
        }
      },
      onMarketTab: function () {
        URLHelper.redirect(window.location.href + "&/MarketTab", true);
      },
      onBuyHistory: function () {
        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        oRouter.navTo("History", {});
      },
      updateBuyPnl: function () {
        this.buyPnl = {
          flag: this.buyInfo.flag,
          mode: this.buyInfo.mode,
          display: this.buyInfo.display,
          type: this.buyInfo.type,
          direction: this.buyInfo.direction,
          pnl: this.buyInfo.pnl,
          max: this.buyInfo.max,
          min: this.buyInfo.min,
          fromMax: this.buyInfo.fromMax,
          fromMin: this.buyInfo.fromMin,
          supportFlag: this.buyInfo.supportFlag,
          support: this.buyInfo.support,
          supportPer: this.buyInfo.supportPer,
          slippage: this.buyInfo.slippage,
          slippagePer: this.buyInfo.slippagePer,
          addonCount: this.buyInfo.addonCount,
          addonPer: this.buyInfo.addonPer,
          reverse: this.buyInfo.reverse,
          call: {
            flag: this.buyInfo.call.flag,
            category: this.buyInfo.call.category,
            buy: this.buyInfo.call.pnl.buy,
            ltp: this.buyInfo.call.pnl.ltp,
            pnl: this.buyInfo.call.pnl.per,
            usd: this.buyInfo.call.pnl.usd,
          },
          put: {
            flag: this.buyInfo.put.flag,
            category: this.buyInfo.put.category,
            buy: this.buyInfo.put.pnl.buy,
            ltp: this.buyInfo.put.pnl.ltp,
            pnl: this.buyInfo.put.pnl.per,
            usd: this.buyInfo.put.pnl.usd,
          },
          addon: {
            flag: this.buyInfo.addon.flag,
            category: this.buyInfo.addon.category,
            buy: this.buyInfo.addon.pnl.buy,
            ltp: this.buyInfo.addon.pnl.ltp,
            pnl: this.buyInfo.addon.pnl.per,
            usd: this.buyInfo.addon.pnl.usd,
            count: this.buyInfo.delta.window.count,
            gap: this.buyInfo.delta.window.gap,
          },
        };

        this.updateModel("PnlModel", this.buyPnl);
      },
      getObjectState: function (Value) {
        if (Value == 0) {
          return this.greyState;
        } else if (Value > 0) {
          return this.greenState;
        } else if (Value < 0) {
          return this.redState;
        }
      },
      resetBuyWindow: function () {
        this.resetCallPlotLines();
        this.resetPutPlotLines();
        this.resetDeltaPlotlines();
        this.resetBarPlotlines();
      },
      updateBuyWindow: function () {
        if (this.buyInfo?.flag === undefined) {
          return;
        }
        if (
          this.para.chart.callSymbol == this.buyInfo.call.symbol &&
          this.para.chart.putSymbol == this.buyInfo.put.symbol
        ) {
          this.updateCallPlotLines(this.buyInfo.call.window);
          this.updatePutPlotLines(this.buyInfo.put.window);

          if (this.para.supportDelta.flag === true) {
            this.updateDeltaPlotLines(this.buyInfo.delta.window);
          }
        }
      },
      updateCallPlotLines: function (Window) {
        if (Window?.status === undefined) {
          // || Window?.status === false) {
          return;
        }

        if (this.screen.buyLine == true) {
          this.updatePlotLine("CALL_BUY", 0, Window.buy, Window.buy);
        }

        this.updatePlotLine("CALL_GREEN", 0, Window.green, Window.green);
        this.updatePlotLine("CALL_ORANGE", 0, Window.orange, Window.orange);
        this.updatePlotLine("CALL_RED", 0, Window.red, Window.red);
        this.updatePlotBand(
          "CALL_GREEN_WINDOW",
          0,
          Window.green,
          Window.orange,
          Window.topColor,
        );
        this.updatePlotBand(
          "CALL_ORANGE_WINDOW",
          0,
          Window.orange,
          Window.red,
          Window.bottomColor,
        );
      },
      updatePutPlotLines: function (Window) {
        if (Window?.status === undefined) {
          // || Window?.status === false) {
          return;
        }
        if (this.screen.buyLine == true) {
          this.updatePlotLine("PUT_BUY", 1, Window.buy, Window.buy);
        }
        this.updatePlotLine("PUT_GREEN", 1, Window.green, Window.green);
        this.updatePlotLine("PUT_ORANGE", 1, Window.orange, Window.orange);
        this.updatePlotLine("PUT_RED", 1, Window.red, Window.red);
        this.updatePlotBand(
          "PUT_GREEN_WINDOW",
          1,
          Window.green,
          Window.orange,
          Window.topColor,
        );
        this.updatePlotBand(
          "PUT_ORANGE_WINDOW",
          1,
          Window.orange,
          Window.red,
          Window.bottomColor,
        );
      },
      updateDeltaPlotLines: function (Window) {
        if (this.screen.buyLine == true) {
          this.updatePlotLine("ADDON_BUY", 2, Window.buy, Window.buy);
        }

        this.updatePlotLine("ADDON_TARGET", 2, Window.target, Window.target);
        this.updatePlotLine("ADDON_HIGH", 2, Window.high, Window.high);
        this.updatePlotLine("ADDON_LOW", 2, Window.low, Window.low);
        this.updatePlotBand(
          "ADDON_WINDOW",
          2,
          Window.high,
          Window.low,
          Window.color,
        );
      },
      updateTrnHistory: function () {
        var total = 0,
          avg = 0,
          per = 0;

        this.updateModel("TrnModel", this.aTrn);

        for (let i = 0; i < this.aTrn.length; i++) {
          total = total + this.aTrn[i].per;
        }

        // Trn Total
        total = this.formatDecimal(total);

        this.getView()
          .byId("idTrnTotalObjectStatus")
          .setText(total + " %");
        this.getView()
          .byId("idTrnTotalObjectStatus")
          .setState(this.getObjectState(total));

        // Trn Average
        avg = this.formatDecimal(total / this.aTrn.length);

        this.getView()
          .byId("idTrnAvgObjectStatus")
          .setText(avg + " %");
        this.getView()
          .byId("idTrnAvgObjectStatus")
          .setState(this.getObjectState(avg));
      },
      resetTrackPlotline: function () {
        var plotline = this.stockChart.xAxis[0].plotLinesAndBands.filter(
          (row) => row.id == "TRACK_TIME",
        )[0];
        if (plotline != undefined) {
          plotline.options.value = -1;
          plotline.options.label.text = "";
          this.stockChart.xAxis[0].update();
        }
      },
      resetCallPlotLines: function () {
        this.updatePlotLine("CALL_BUY", 0, 0, 0);
        this.updatePlotLine("CALL_GREEN", 0, 0, 0);
        this.updatePlotLine("CALL_ORANGE", 0, 0, 0);
        this.updatePlotLine("CALL_RED", 0, 0, 0);
        this.updatePlotBand("CALL_GREEN_WINDOW", 0, 0, 0, this.none);
        this.updatePlotBand("CALL_ORANGE_WINDOW", 0, 0, 0, this.none);
      },
      resetPutPlotLines: function () {
        this.updatePlotLine("PUT_BUY", 1, 0, 0);
        this.updatePlotLine("PUT_GREEN", 1, 0, 0);
        this.updatePlotLine("PUT_ORANGE", 1, 0, 0);
        this.updatePlotLine("PUT_RED", 1, 0, 0);
        this.updatePlotBand("PUT_GREEN_WINDOW", 1, 0, 0, this.none);
        this.updatePlotBand("PUT_ORANGE_WINDOW", 1, 0, 0, this.none);
      },
      resetDeltaPlotlines: function () {
        this.updatePlotLine("DELTA_HIGH", 2, 0, "");
        this.updatePlotLine("DELTA_LOW", 2, 0, "");
        this.updatePlotBand("DELTA_WINDOW", 2, 0, 0, this.none);
      },
      resetAddonPlotLines: function () {
        this.updatePlotLine("ADDON_TARGET", 2, 0, 0);
        this.updatePlotLine("ADDON_BUY", 2, 0, 0);
        this.updatePlotLine("ADDON_HIGH", 2, 0, 0);
        this.updatePlotLine("ADDON_LOW", 2, 0, 0);
        this.updatePlotBand("ADDON_WINDOW", 2, 0, 0, this.none);
      },
      resetBarPlotlines: function () {
        this.updateBarLine("BAR_HIGH", 1, 0, "");
        this.updateBarLine("BAR_LOW", 1, 0, "");
        this.updatePlotBand("BAR_WINDOW", 1, 0, 0, this.none);
      },
      resetAllPlotlines: function () {
        this.resetTrackPlotline();
        this.resetCallPlotLines();
        this.resetPutPlotLines();
        this.resetDeltaPlotlines();
        this.resetAddonPlotLines();
        this.resetBarPlotlines();
      },
      updateBarChart: function (BarData) {
        try {
          // Update Bar Chart
          this.barChart.series[0].setData(BarData.market);
          this.barChart.series[1].setData(BarData.call);
          this.barChart.series[2].setData(BarData.delta);
          this.barChart.series[3].setData(BarData.put);
        } catch (error) {
          this.setMessage(this.error, error, this.P1);
        }

        if (this.para.buy.flag == true && this.para.barType == this.history) {
          this.updateHistoryTime();
        }
      },
      updateStockChart: function (Tickers) {
        if (this.para.chart.category == this.market) {
          this.updateMarketChart(Tickers);
        } else {
          this.updateOptionChart(Tickers);
        }
      },
      onBtcMarket: function () {
        this.updateMarketChartInfo(this.btcSymbol);
        this.displayMarketChart();
      },
      onEthMarket: function () {
        this.updateMarketChartInfo(this.ethSymbol);
        this.displayMarketChart();
      },
      onBtcStrike: function () {
        this.updateOptionChartInfo(
          this.barStrikes.symbol.btcCall,
          this.barStrikes.symbol.btcPut,
        );
        this.displayOptionChart();
      },
      onEthStrike: function () {
        this.updateOptionChartInfo(
          this.barStrikes.symbol.ethCall,
          this.barStrikes.symbol.ethPut,
        );
        this.displayOptionChart();
      },
      displayOptionChart: async function () {
        var errorFound = false;
        try {
          // Set Chart Container
          this.setOptionContainer();

          // Set Chart Title
          this.setChartTitle();

          // Reset Data
          this.aCeData = [];
          this.aPeData = [];
          this.aCeOiData = [];
          this.aPeOiData = [];
          this.aVolume = [];

          var history = await this.getOptionOiHistory();
          errorFound = history.some((item) => item.status == this.error);
          if (errorFound == true) {
            throw new Error("Option Data Not Found");
          }

          // Call Candle
          this.setCallCandle(this.arrangeCandle(history[0].result));

          // Put Candle
          this.setPutCandle(this.arrangeCandle(history[1].result));

          // Call OI
          this.setCallOi(history[2].result);

          // Put OI
          this.setPutOi(history[3].result);

          // Delta
          this.initDeltaChart();

          // Volume
          if (this.optionVolType === this.market) {
            this.setMarketVolume();
          } else {
            this.setOptionVolume();
          }

          // Chart Delta Plotlines
          this.displayChartLines();

          // Bar Plotlines
          this.displayBarLines();

          // Update Buy Window
          // this.resetBuyWindow();
          // this.resetCallPlotLines();
          // this.resetPutPlotLines();

          //////////////// Backtest Start. //////////////////

          if (this.screen.headerMiddle == this.backtest) {
            this.backtestModel = {
              flag: true,
              inc: this.backtestInc,
              callSymbol: this.para.chart.callSymbol,
              putSymbol: this.para.chart.putSymbol,
              callLtp: this.aCeData[this.aCeData.length - 1][4],
              putLtp: this.aPeData[this.aPeData.length - 1][4],
            };

            this.serverAction("Backtest", this.backtestModel);
            // this.updateModel("BacktestModel", this.backtestModel);

            // this.getView().byId("backtestCall").setValue(this.testCallLtp);
            // this.getView().byId("backtestPut").setValue(this.testPutLtp);
          }
          //////////////// Backtest End //////////////////
          // this.setBusyOff();
        } catch (error) {
          this.setMessage(this.error, error, this.P1);
        }
      },
      getUpperRangePer: function (min, max, value) {
        const range = max - min;
        const progress = value - max;
        const percentage = (progress / range) * 100;
        return Math.round(percentage);
      },
      getLowerRangePer: function (min, max, value) {
        const range = max - min;
        const progress = value - min;
        const percentage = (progress / range) * 100;
        return Math.round(percentage);
      },
      arrangeDeltaCandleTime: function (CeData, PeData) {
        var close = 0,
          // @ts-ignore
          low = 0,
          // @ts-ignore
          high = 0,
          side_1 = 0,
          side_2 = 0;
        // @ts-ignore
        var Delta = 0,
          CeHigh = 0,
          CeLow = 0,
          PeHigh = 0,
          PeLow = 0,
          CeClose = 0,
          PeClose = 0,
          // @ts-ignore
          lowest = 0;
        var candle = [];

        if (CeData == undefined || PeData == undefined) {
          candle = [0, 0, 0, 0];
          return candle;
        }

        CeHigh = this.getPercentage(CeData[1], CeData[2]);
        PeLow = this.getPercentage(PeData[1], PeData[3]);
        side_1 = this.getDelta(CeHigh, PeLow);

        CeLow = this.getPercentage(CeData[1], CeData[3]);
        PeHigh = this.getPercentage(PeData[1], PeData[2]);
        side_2 = this.getDelta(CeLow, PeHigh);

        CeClose = this.getPercentage(CeData[1], CeData[4]);
        PeClose = this.getPercentage(PeData[1], PeData[4]);
        close = this.getDelta(CeClose, PeClose);

        // Time
        candle[0] = CeData[0];
        // Open
        candle[1] = 0;

        // Low
        candle[3] = Math.min(side_1, side_2, close);
        if (candle[3] > 0) {
          candle[3] = 0;
        }
        // High
        candle[2] = Math.max(side_1, side_2, close);
        if (candle[2] < 0) {
          candle[2] = 0;
        }
        candle[4] = close;
        return candle;
      },
      getDelta: function (CePer, PePer) {
        var Delta = this.formatDecimal(CePer + PePer);
        return Delta;
      },
      updateCallOiLtp: function () {
        var highPer = 0,
          lowPer = 0,
          ltp = 0;

        if (
          this.callTicker != undefined &&
          this.callOiHigh != undefined &&
          this.callOiLow != undefined
        ) {
          ltp = this.formatDecimal(this.callTicker.oi) ?? 0;
          highPer =
            this.getUpperRangePer(this.callOiLow, this.callOiHigh, ltp) ?? 0;
          lowPer =
            this.getLowerRangePer(this.callOiLow, this.callOiHigh, ltp) ?? 0;
        }
        var highLine =
          `<p style="color:` + this.ltpRed + `;">${highPer} %</p><br>`;
        var ltpLine = `${ltp} <br>`;
        var lowLine =
          `<p style="color:` + this.ltpGreen + `;">${lowPer} %</p><br>`;

        return highLine + ltpLine + lowLine;
      },
      updatePutOiLtp: function () {
        var highPer = 0,
          lowPer = 0,
          ltp = 0;

        if (
          this.putTicker != undefined &&
          this.putOiHigh != undefined &&
          this.putOiLow != undefined
        ) {
          ltp = this.putTicker.oi ?? 0;
          highPer =
            this.getUpperRangePer(this.putOiLow, this.putOiHigh, ltp) ?? 0;
          lowPer =
            this.getLowerRangePer(this.putOiLow, this.putOiHigh, ltp) ?? 0;
        }
        var highLine =
          `<p style="color:` + this.ltpRed + `;">${highPer} %</p><br>`;
        var ltpLine = `${ltp} <br>`;
        var lowLine =
          `<p style="color:` + this.ltpGreen + `;">${lowPer} %</p><br>`;

        return highLine + ltpLine + lowLine;
      },
      displayChartLines: function () {
        // Hide All Delta Plotlines
        this.resetAllPlotlines();

        if (this.para.chart.category == this.market) {
          return;
        }
        // Track Time
        this.displayTrackTime();
        // Buy Delta
        this.displayChartBuyDeltaLines();
        // Upadte Window
        this.updateBuyWindow();
        // Sell Delta
        // this.displayChartSupportDeltaLines();
      },
      displayBarLines: function () {
        this.resetBarPlotlines();
        switch (this.para.barType) {
          case this.option:
            this.setBarDeltaLines();
            break;
          case this.track:
            this.setBarTrackLines();
            break;
          case this.buy:
            this.setBarBuyLines();
            break;
        }
      },
      onTrackHigh: function (oEvent) {
        this.updateServerPara("track", this.para.track);
      },
      onTrackLow: function (oEvent) {
        this.updateServerPara("track", this.para.track);
      },
      setOptionVolume: async function () {
        if (this.para.priceType == this.maker) {
          var volHistory = await this.getOptionVolHistory();
          var errorFound = volHistory.some((item) => item.status == this.error);
          if (errorFound == true) {
            throw new Error("Market Data Not Found");
          } else {
            this.aVolume = this.getCombinedVol(
              volHistory[0].result,
              volHistory[1].result,
            );
          }
        } else {
          this.aVolume = this.getCombinedVol(
            history[0].result,
            history[1].result,
          );
        }

        this.setVolume();
      },
      getCombinedVol: function (aCallVol, aPutVol) {
        var candle = [];
        var aVolumeData = [];
        var lastVolume = 0;

        for (let i = 0; i < this.aTimeAxis.length; i++) {
          // Ignore Out of Scope Data
          if (this.aTimeAxis[i] < this.para.chart.startChart) {
            continue;
          }
          if (this.aTimeAxis[i] >= this.para.chart.endCandle) {
            break;
          }
          var callVol = aCallVol.find(
            (row) => row.time * 1000 == this.aTimeAxis[i],
          );

          var putVol = aPutVol.find(
            (row) => row.time * 1000 == this.aTimeAxis[i],
          );

          // @ts-ignore
          var time = Math.floor(this.aTimeAxis[i] / 1000);
          if (callVol == undefined || putVol == undefined) {
            candle.push(this.aTimeAxis[i]);
            candle.push(this.formatDecimal(lastVolume));
          } else {
            candle.push(this.aTimeAxis[i]);
            candle.push(
              this.formatDecimal((callVol.volume + putVol.volume) / 2),
            );

            // Capture last Volume
            lastVolume = this.formatDecimal(
              (callVol.volume + putVol.volume) / 2,
            );
          }
          aVolumeData.push(candle);
          candle = [];
        }
        return aVolumeData;
      },
      initDeltaChart: function () {
        this.aDelta = [];
        var CeData = [];
        var PeData = [];

        // @ts-ignore
        var deltaRef = "";
        // @ts-ignore
        var aRange = [];
        // @ts-ignore
        var startDelta = 0;
        // @ts-ignore
        var point = {
          x: 0,
          y: 0,
        };
        var candle = [];
        // @ts-ignore
        var range = [];

        if (
          this.aCeData == undefined ||
          this.aPeData == undefined ||
          this.aCeData.length == 0 ||
          this.aPeData.length == 0
        ) {
          MessageToast.show("Incorrect Delta Data");
          return;
        }

        for (let i = 0; i <= this.aTimeAxis.length; i++) {
          // var time = Math.floor(this.aTimeAxis[i] / 1000);
          var time = this.aTimeAxis[i];
          if (time >= this.para.chart.endCandle) {
            break;
          }

          CeData = this.aCeData.find((row) => row[0] == time);
          PeData = this.aPeData.find((row) => row[0] == time);

          if (CeData == undefined || PeData == undefined) {
            CeData = [time, 0, 0, 0, 0];
            PeData = [time, 0, 0, 0, 0];
          }
          candle = this.arrangeDeltaCandleTime(CeData, PeData);
          this.aDelta.push(candle);
        }
        // }

        this.stockChart.series[2].setData(this.aDelta);
        this.stockChart.series[2].update();
      },
      setCallCandle: function (Data) {
        this.aCeData = Data;
        if (this.aCeData.length > 0) {
          this.stockChart.series[0].setData(this.aCeData);
          this.stockChart.series[0].update();
        } else {
          this.setMessage(this.error, "Call Candle Data Not Found", this.P3);
        }
      },
      setPutCandle: function (Data) {
        this.aPeData = Data;
        if (this.aPeData.length > 0) {
          this.stockChart.series[1].setData(this.aPeData);
          this.stockChart.series[1].update();
        } else {
          this.setMessage(this.error, "Put Candle Data Not Found", this.P3);
        }
      },
      getCallOiDiv: function (length) {
        switch (length) {
          // case 3:
          //   this.callOiUnit = "";
          //   this.callOiDiv = this.ten;
          //   break;
          case 4:
            this.callOiUnit = "H";
            this.callOiDiv = this.hundred;
            break;
          case 5:
            this.callOiUnit = "K";
            this.callOiDiv = this.thousand;
            break;
          case 6:
            this.callOiUnit = "T";
            this.callOiDiv = this.tenThousand;
            break;
          case 7:
            this.callOiUnit = "L";
            this.callOiDiv = this.lakh;
            break;
          case 8:
            this.callOiUnit = "M";
            this.callOiDiv = this.million;
            break;
          default:
            this.callOiUnit = "";
            this.callOiDiv = 1;
            break;
        }
        this.stockChart.yAxis[3].options.labels.format =
          "{value} " + this.callOiUnit;
      },
      getPutOiDiv: function (length) {
        switch (length) {
          case 4:
            this.putOiUnit = "H";
            this.putOiDiv = this.hundred;
            break;
          case 5:
            this.putOiUnit = "K";
            this.putOiDiv = this.thousand;
            break;
          case 6:
            this.putOiUnit = "T";
            this.putOiDiv = this.tenThousand;
            break;
          case 7:
            this.putOiUnit = "L";
            this.putOiDiv = this.lakh;
            break;
          case 8:
            this.putOiUnit = "M";
            this.putOiDiv = this.million;
            break;
          default:
            this.putOiUnit = "";
            this.putOiDiv = 1;
            break;
        }

        this.stockChart.yAxis[4].options.labels.format =
          "{value} " + this.putOiUnit;
      },
      setCallOi: function (Data) {
        this.callOiData = [];
        this.callOiHigh = 0;
        this.callOiLow = 0;
        this.callOiPer = 0;
        this.callOiDiv = 0;
        var candle = [];
        var lastOi = 0;

        var callOi = Data.reduce(
          (max, oi) => Math.max(max, oi.close),
          -Infinity,
        );

        if (callOi != undefined) {
          // @ts-ignore
          this.getCallOiDiv(Math.trunc(callOi).toString().length);
          for (let i = 0; i < this.aTimeAxis.length; i++) {
            if (this.aTimeAxis[i] > this.para.chart.startCandle) {
              break;
            }
            var record = Data.filter(
              (row) => row.time * 1000 == this.aTimeAxis[i],
            )[0];
            if (record == undefined) {
              candle.push(this.aTimeAxis[i]);
              candle.push(lastOi);
            } else {
              candle.push(this.aTimeAxis[i]);
              candle.push(record.close);
              lastOi = record.close;
            }
            this.callOiData.push(candle);
            candle = [];
          }

          this.callOiHigh = this.callOiData.reduce(
            (max, oi) => Math.max(max, oi[1]),
            -Infinity,
          );
          this.callOiLow = this.callOiData.reduce(
            (min, oi) => Math.min(min, oi[1]),
            Infinity,
          );
        }
        // Avoid dump in Last Price
        if (this.callOiHigh == this.callOiLow) {
          this.callOiPer = 0;
        } else {
          this.callOiPer = this.formatDecimal(
            100 / (this.callOiHigh - this.callOiLow),
          );
        }
        this.stockChart.series[3].setData(this.callOiData);
        this.stockChart.series[3].update();
      },
      setPutOi: function (Data) {
        this.putOiData = [];
        this.putOiHigh = 0;
        this.putOiLow = 0;
        this.putOiPer = 0;
        this.putOiDiv = 0;
        var candle = [];
        var lastOi = 0;

        var putOi = Data.reduce(
          (max, oi) => Math.max(max, oi.close),
          -Infinity,
        );

        if (putOi != undefined) {
          // @ts-ignore
          this.getPutOiDiv(Math.trunc(putOi).toString().length);

          for (let i = 0; i < this.aTimeAxis.length; i++) {
            if (this.aTimeAxis[i] > this.para.chart.startCandle) {
              break;
            }
            var record = Data.filter(
              (row) => row.time * 1000 == this.aTimeAxis[i],
            )[0];
            if (record == undefined) {
              candle.push(this.aTimeAxis[i]);
              candle.push(lastOi);
            } else {
              candle.push(this.aTimeAxis[i]);
              candle.push(record.close);
              lastOi = record.close;
            }
            this.putOiData.push(candle);
            candle = [];
          }

          this.putOiHigh = this.putOiData.reduce(
            (max, oi) => Math.max(max, oi[1]),
            -Infinity,
          );
          this.putOiLow = this.putOiData.reduce(
            (min, oi) => Math.min(min, oi[1]),
            Infinity,
          );
        }
        // Avoid dump in Last Price
        if (this.putOiHigh == this.putOiLow) {
          this.putOiPer = 0;
        } else {
          this.putOiPer = this.formatDecimal(
            100 / (this.putOiHigh - this.putOiLow),
          );
        }

        this.stockChart.series[4].setData(this.putOiData);
        this.stockChart.series[4].update();
      },
      onStrikeCe: function (oEvent) {
        let ceStrike = oEvent.getSource().getValue();
        if (ceStrike === undefined) {
          this.displayHeaderMessage(this.error, "Invalid Chart Call Strike");
          return;
        }

        this.para.chart.callStrike = ceStrike;
        this.para.chart.callSymbol = this.getStrikeSymbol(this.call, ceStrike);
        this.displayOptionChart();
        this.updateServerPara("chart", this.para.chart);
      },
      onStrikePe: function (oEvent) {
        let peStrike = oEvent.getSource().getValue();
        if (peStrike === undefined) {
          this.displayHeaderMessage(this.error, "Invalid Chart Call Strike");
          return;
        }

        this.para.chart.putStrike = peStrike;
        this.para.chart.putSymbol = this.getStrikeSymbol(this.put, peStrike);
        this.displayOptionChart();
        this.updateServerPara("chart", this.para.chart);
      },
      getStrikeSymbol: function (type, strike) {
        let symbolType = type === this.call ? "C" : "P";
        return (
          symbolType +
          "-" +
          this.para.chart.index +
          "-" +
          strike +
          "-" +
          this.para.expiry.symbol
        );
      },
      getOptionOiHistory: async function () {
        // @ts-ignore
        const [callData, putData, callOi, putOi] = await Promise.all([
          this.getHistory(
            this.getPriceTypeSymbol(this.para.chart.callSymbol),
            Math.floor(this.para.chart.startChart / 1000),
            Math.floor(this.para.chart.endCandle / 1000),
          ),
          this.getHistory(
            this.getPriceTypeSymbol(this.para.chart.putSymbol),
            Math.floor(this.para.chart.startChart / 1000),
            Math.floor(this.para.chart.endCandle / 1000),
          ),
          this.getHistory(
            "OI:" + this.para.chart.callSymbol,
            Math.floor(this.para.chart.startChart / 1000),
            Math.floor(this.para.chart.endCandle / 1000),
          ),
          this.getHistory(
            "OI:" + this.para.chart.putSymbol,
            Math.floor(this.para.chart.startChart / 1000),
            Math.floor(this.para.chart.endCandle / 1000),
          ),
        ]);
        return [callData, putData, callOi, putOi];
      },
      getOptionVolHistory: async function () {
        // @ts-ignore
        const [callVol, putVol] = await Promise.all([
          this.getHistory(
            this.para.chart.callSymbol,
            Math.floor(this.para.chart.startChart / 1000),
            Math.floor(this.para.chart.endCandle / 1000),
          ),
          this.getHistory(
            this.para.chart.putSymbol,
            Math.floor(this.para.chart.startChart / 1000),
            Math.floor(this.para.chart.endCandle / 1000),
          ),
        ]);
        return [callVol, putVol];
      },
      updateMarketChart: function (Tickers) {
        let market = Tickers.market;
        // Market Candle
        if (market.startCandle != this.para.chart.startCandle) {
          return;
        }

        if (this.para.chart.symbol == market.symbol) {
          this.updateChartCandle(0, market);
          var vol = this.formatDecimal(market.volume / this.volDiv);
          this.updateChartLine(5, vol);
        } else {
          throw new Error("Market Ticker Not Found");
        }

        // OI Candle
        let lastCandle = this.stockChart.series[2].data;
        if (lastCandle == undefined) {
          return;
        }
        let length = lastCandle.length - 1;
        this.updateCandleLtp(lastCandle[length], market.oi);
        if (this.stockChart?.series[2]?.points[length] !== undefined) {
          this.stockChart.series[2].points[length].update();
        }
      },
      updateOptionChart: function (Tickers) {
        let marketTicker = Tickers.market,
          callTicker = Tickers.call,
          putTicker = Tickers.put,
          deltaTicker = Tickers.delta,
          vol = 0;

        if (callTicker == undefined || putTicker == undefined) {
          throw new Error("Invalid Option Ticker");
        } else {
          if (
            callTicker.startCandle != this.para.chart.startCandle ||
            putTicker.startCandle != this.para.chart.startCandle
          ) {
            return;
          }

          // Call Candle
          this.updateChartCandle(0, callTicker);

          // Put Candle
          this.updateChartCandle(1, putTicker);

          // Delta Candle
          this.updateChartCandle(2, deltaTicker);

          // Call OI
          var callOi = this.formatDecimal(callTicker.oi / this.callOiDiv);
          this.updateChartLine(3, callOi);

          // Put OI
          var putOi = this.formatDecimal(putTicker.oi / this.putOiDiv);
          this.updateChartLine(4, putOi);

          if (this.optionVolType === this.market) {
            // Market Volume
            vol = this.formatDecimal(marketTicker.volume / this.volDiv);
          } else {
            // Option Volume
            vol = this.formatDecimal(
              (callTicker.volume + putTicker.volume) / 2 / this.volDiv,
            );
          }

          this.updateChartLine(5, vol);
        }
      },
      updateChartCandle: function (Series, Ticker) {
        var candle = this.stockChart.series[Series];
        var length = candle.data.length - 1;
        var pointLength = candle.points.length - 1;
        if (candle.data[length] != undefined) {
          this.updateCandle(candle.data[length], Ticker);
          if (candle.points[pointLength] != undefined) {
            candle.points[pointLength].update();
          }
        }
      },

      updateChartLine: function (Series, Value) {
        var candle = this.stockChart.series[Series];
        var length = candle.data.length - 1;
        var pointLength = candle.points.length - 1;
        if (candle.data[length] != undefined) {
          this.updateLine(candle.data[length], Value);
          if (candle.points[pointLength] != undefined) {
            candle.points[pointLength].update();
          }
        }
      },
      updateCandle: function (Candle, Ticker) {
        if (Ticker != undefined && Candle != undefined) {
          Candle.open = Ticker.open;
          Candle.high = Ticker.high;
          Candle.low = Ticker.low;
          Candle.close = Ticker.close;
        }
      },
      updateLine: function (Candle, Value) {
        if (Candle != undefined) {
          Candle.y = Value;
        }
      },
      updateCandleLtp: function (Candle, Ltp) {
        if (Ltp !== undefined && Candle !== undefined) {
          if (Ltp > Candle.high) {
            Candle.high = Ltp;
          }
          if (Ltp < Candle.low) {
            Candle.low = Ltp;
          }
          Candle.close = Ltp;
        }
      },
      resumeLiveData: function () {
        var that = this;
        setTimeout(function () {
          that.getLiveData();
        }, 1000); // 1 Sec
      },
      onBackTestInc: function (oEvent) {
        this.backtestModel.inc = oEvent.getParameters().item.getText();
        this.serverAction("Backtest", this.backtestModel);
      },
      onBackTestCall: function (oEvent) {
        this.backtestModel.callLtp = oEvent.getSource().getValue();
        this.serverAction("Backtest", this.backtestModel);
      },
      onBackTestPut: function (oEvent) {
        this.backtestModel.putLtp = oEvent.getSource().getValue();
        this.serverAction("Backtest", this.backtestModel);
      },
      setZoomPara: function () {
        var zoom1 = Number(this.para.chart.range * 0.2); // 20 %
        var zoom2 = Number(this.para.chart.range * 0.4); // 40 %
        var zoom3 = Number(this.para.chart.range * 0.6); // 60 %
        this.getView()
          .byId("idHZoom1SegmentedButtonItem")
          .setText(zoom1 + " H");
        this.getView()
          .byId("idHZoom2SegmentedButtonItem")
          .setText(zoom2 + " H");
        this.getView()
          .byId("idHZoom3SegmentedButtonItem")
          .setText(zoom3 + " H");
      },
      setBarType: async function () {
        switch (this.para.barType) {
          case this.market:
          case this.option:
          case this.track:
          case this.buy:
            // // Get Bar Strikes
            // this.getBarStrikes();
            // Display Bar Chart
            this.enableBarCandle();
            // Display Bar Lines
            this.displayBarLines();
            break;
          case this.book:
            this.onCallBook();
            break;
          case this.history:
            break;
          case this.message:
            let aMsg = this.getView().getModel("MessageModel").getData();
            if (aMsg !== undefined) {
              this.getView()
                .byId("idBarMessageCountGenericTag")
                .setText("Count : " + aMsg.length);
            }

            break;
        }
      },
      onTooltip: function () {
        this.tooltipFlag = !this.tooltipFlag;
        // Upadate Tooltip
        this.stockChart.update({
          tooltip: {
            enabled: this.tooltipFlag,
          },
        });
      },
      getOptionTooltip: function (Point) {
        var highColor, bodyColor, lowColor, table, time;
        var green = "#53ff1a";
        var red = "#ff8080";

        time = this.convertSecondsToDate(Point.x);
        time = time.toTimeString().substring(0, 5);

        if (Point.open == undefined) {
          return '<p><b><span style="color: #fffffd">Zoom Chart for Tooltip</span></b></p>';
        }

        var Candle = {
          open: Point.open,
          high: Point.high,
          low: Point.low,
          close: Point.close,
        };

        Candle.candleHigh = this.getPercentage(Candle.open, Candle.high);
        Candle.candleBody = this.getPercentage(Candle.open, Candle.close);
        Candle.candleLow = this.getPercentage(Candle.open, Candle.low);

        if (Candle.candleHigh >= 0) {
          highColor = green;
        } else {
          highColor = red;
        }

        if (Candle.candleBody >= 0) {
          bodyColor = green;
        } else {
          bodyColor = red;
        }

        if (Candle.candleLow >= 0) {
          lowColor = green;
        } else {
          lowColor = red;
        }

        // Design Tootltip
        // table = '<div><table style="background-color:rgb(6, 6, 6)">';
        table = '<div style="background-color:rgb(10, 10, 1)"><table>';
        table =
          table +
          '<b><caption style="color: #fffffd">' +
          time +
          "</caption></b>";
        // table = table + '<caption>' + 'Monthly savings' + '</caption>';
        table =
          table +
          '<tr><td><b><span style="color: #fffffd">' +
          "High:" +
          '</span></b></td><td><b><span style="color:' +
          highColor +
          '";">' +
          Candle.candleHigh +
          "%" +
          "</span></b></td></tr>";

        table =
          table +
          '<tr><td><b><span style="color: #fffffd">' +
          "Body:" +
          '</span></b></td><td><b><span style="color:' +
          bodyColor +
          '";">' +
          Candle.candleBody +
          "%" +
          "</span></b></td></tr>";

        table =
          table +
          '<tr><td><b><span style="color: #fffffd">' +
          "Low:" +
          '</span></b></td><td><b><span style="color:' +
          lowColor +
          '";">' +
          Candle.candleLow +
          "%" +
          "</span></b></td></tr>";
        table = table + "</table></div>";

        return table;
      },
      getDeltaTooltip: function (Point) {
        var color;
        var green = "#53ff1a";
        var red = "#ff8080";
        var delta = 0;
        var time = this.convertSecondsToDate(Point.x);
        time = time.toTimeString().substring(0, 5);

        if (Point.x == undefined) {
          return '<p><b><span style="color: #fffffd">Zoom Chart for Tooltip</span></b></p>';
        }
        if (this.aDelta == undefined) {
          delta = 0;
          color = green;
        } else {
          delta = this.formatDecimal(Point.close);
          if (delta > 0) {
            color = green;
          } else if (delta < 0) {
            color = red;
          } else {
            color = green;
          }
        }
        var table = '<div style="background-color:rgb(10, 10, 1)"><table>';
        table =
          table +
          '<b><caption style="color: #fffffd">' +
          time +
          "</caption></b>";
        // table = table + '<caption>' + 'Monthly savings' + '</caption>';
        table =
          table +
          '<tr><td><b><span style="color: #fffffd">' +
          "Body:" +
          '</span></b></td><td><b><span style="color:' +
          color +
          '";">' +
          delta +
          "</span></b></td></tr>";
        table = table + "</table></div>";
        return table;
      },
      onExternalWindow: function () {
        var masterUri = "https://www.delta.exchange/app/futures/trade";
        var optionUri =
          "https://www.delta.exchange/app/tradingview/price-chart/options";
        // @ts-ignore
        var url, index, path, inst, symbol;

        if (this.para.chart.category == this.market) {
          url =
            masterUri +
            "/" +
            this.para.chart.index +
            "/" +
            this.para.chart.symbol;
          window.open(url);
        } else {
          // Call
          url =
            optionUri +
            "/" +
            this.para.chart.index +
            "/" +
            this.para.chart.callSymbol;
          window.open(url);
          // Put
          url =
            optionUri +
            "/" +
            this.para.chart.index +
            "/" +
            this.para.chart.putSymbol;
          window.open(url);
        }
      },
      onAddonCharts: function () {
        this.addOnChart = !this.addOnChart;
        this.stockChart.series[5].setVisible(this.addOnChart);
        if (this.para.chart.category == this.option) {
          this.stockChart.series[3].setVisible(this.addOnChart);
          this.stockChart.series[4].setVisible(this.addOnChart);
        }
      },

      displayChartBuyDeltaLines: function () {
        if (this.para.buyDelta.flag === false) {
          return;
        }

        var buyDelta = this.para.buyDelta.value;
        switch (this.para?.buyDelta?.type) {
          case this.up:
            this.updatePlotLine("DELTA_HIGH", 2, buyDelta, buyDelta);
            break;
          case this.down:
            this.updatePlotLine("DELTA_LOW", 2, buyDelta, buyDelta);
            break;
          default:
            throw new Error("Invalid Buy Delta Type");
        }
      },
      displayChartSupportDeltaLines: function () {
        if (
          this.para?.supportDelta?.flag === true &&
          this.para?.supportDelta?.type === this.candle
        ) {
          var high = this.buyInfo?.delta?.window?.high ?? 0,
            low = this.buyInfo?.delta?.window?.low ?? 0;

          this.updatePlotLine("DELTA_HIGH", 2, high, high);
          this.updatePlotLine("DELTA_LOW", 2, low, low);
          this.updatePlotBand("DELTA_WINDOW", 2, high, low, this.orangeWindow);
        }
      },
      setBarDeltaLines: function () {
        var value = this.para.buyDelta.value;
        if (
          this.para.buyDelta.flag === true &&
          this.para.barType === this.option
        ) {
          switch (this.para?.buyDelta?.type) {
            case this.up:
              this.updateBarLine("BAR_HIGH", 2, value, value);
              break;
            case this.down:
              this.updateBarLine("BAR_LOW", 2, value, value);
              break;
            default:
              throw new Error("Invalid Buy Delta Type");
          }
        }
      },
      setBarTrackLines: function () {
        var high = this.para.track.high;
        var low = this.para.track.low;
        if (this.para.track.flag == true && this.para.barType == this.track) {
          this.updateBarLine("BAR_HIGH", 1, high, high);
          this.updateBarLine("BAR_LOW", 1, low, low);
        }
      },
      setBarBuyLines: function () {
        var high = this.para.supportDelta.high,
          low = this.para.supportDelta.low;

        if (
          this.para.supportDelta.flag === true &&
          this.para.supportDelta.type === this.buy &&
          this.para.barType === this.buy
        ) {
          if (this.para?.supportDelta?.type === this.buy) {
            this.updateBarLine("BAR_HIGH", 1, high, high);
            this.updateBarLine("BAR_LOW", 1, low, low);
            this.updatePlotBand("BAR_WINDOW", 2, high, low, this.orangeWindow);
          }

          // switch (this.para?.buyDelta?.type) {
          //   case this.positive:
          //     this.updateBarLine("BAR_SELL_DELTA_HIGH", 2, high, high);
          //     break;
          //   case this.negative:
          //     this.updateBarLine("BAR_SELL_DELTA_LOW", 2, low, low);
          //     break;
          //   case this.both:
          //     this.updateBarLine("BAR_SELL_DELTA_HIGH", 2, high, high);
          //     this.updateBarLine("BAR_SELL_DELTA_LOW", 2, low, low);
          //     break;
          //   default:
          //     throw new Error("Invalid Sell Delta Type");
          // }
        }
      },
      onCallBook: function () {
        this.bookType = this.call;
        this.getView().byId("idCallBookButton").setType(this.accept);
        this.getView().byId("idPutBookButton").setType(this.transparent);
      },
      onPutBook: function () {
        this.bookType = this.put;
        this.getView().byId("idCallBookButton").setType(this.transparent);
        this.getView().byId("idPutBookButton").setType(this.reject);
      },
      onProfit: function (oEvent) {
        this.updateServerPara("profit", this.para.profit);
      },
      onVolumeTrackType: function (oEvent) {
        this.para.volume.type = oEvent.getParameters().item.getText();
        this.updateServerPara("volume", this.para.volume);
      },
      onOiTrackType: function (oEvent) {
        this.para.oi.type = oEvent.getParameters().item.getText();
        this.updateServerPara("oi", this.para.oi);
      },
      onLoss: function (oEvent) {
        this.updateServerPara("loss", this.para.loss);
      },
      onHold: function (oEvent) {
        if (this.para.hold > this.para.exit) {
          this.setMessage(
            this.error,
            "Hold > Exit: Server Not Updated",
            this.P3,
          );
          this.para.hold = this.para.exit;
          return;
        }
        this.updateServerPara("hold", this.para.hold);
      },
      onExit: function (oEvent) {
        if (this.para.exit < this.para.hold) {
          this.setMessage(
            this.error,
            "Exit < Hold : Server Not Updated",
            this.P3,
          );
          this.para.exit = this.para.hold;
          return;
        }
        this.updateServerPara("exit", this.para.exit);
      },
      onOrderType: function (oEvent) {
        var orderType = oEvent.getParameters().item.getText();
        this.updateServerPara("orderType", orderType);

        // oEvent
        //   .getSource()
        //   .getParent()
        //   .setIcon(oEvent.getParameters().item.getIcon());
      },
      onPriceType: function (oEvent) {
        var priceType = oEvent.getParameters().item.getText();
        this.updateServerPara("priceType", priceType);
      },
      onStartType: function () {
        this.screen.actionType = !this.screen.actionType;
        this.updateModel("ScreenModel", this.screen);
      },
      onScale: function (oEvent) {
        var scale = oEvent.getParameters().item.getText();
        oEvent.getSource().setTitle(scale);
        this.updateServerPara("scale", scale);
      },
      onDpBoxAction: function (oEvent) {
        let item = oEvent.getParameters().item;
        this.screen.boxType = item.getText();
        // oEvent.getSource().getParent().setIcon(item.getIcon());
        this.updateModel("ScreenModel", this.screen);
      },
      onStrikeGapEdit: function () {
        this.strikeGapEdit = !this.strikeGapEdit;
        this.getView()
          .byId("idStrikeGapStepInput")
          .setEditable(this.strikeGapEdit);
      },
      onStrikeGap: function (oEvent) {
        this.para.strikeGap = oEvent.getSource().getValue();
        this.updateServerPara("strikeGap", this.para.strikeGap);
      },
      onVolumeFlag: function () {
        // Validate OI track Flag
        if (this.para.volume.flag === false) {
          if (this.para.volume.per === 0) {
            this.setMessage(this.error, "Invalid Volume Track %", this.P3);
            return;
          }
          if (this.para.volume.action === this.none) {
            this.setMessage(this.error, "Invalid Volume Track Action", this.P3);
            return;
          }
        }
        this.para.volume.flag = !this.para.volume.flag;
        this.updateServerPara("volume", this.para.volume);
      },
      onVolume: function (oEvent) {
        this.para.volume.per = oEvent.getSource().getValue();
        this.updateServerPara("volume", this.para.volume);
      },
      onVolumeAction: function (oEvent) {
        this.para.volume.action = oEvent.getParameters().item.getText();
        this.updateServerPara("volume", this.para.volume);
      },
      onVolumeType: function () {
        if (this.para.volume.type === this.average) {
          this.para.volume.type = this.percentage;
        } else {
          this.para.volume.type = this.average;
        }
        this.updateServerPara("volume", this.para.volume);
      },
      onVolumePer: function (oEvent) {
        this.para.volume.per = oEvent.getSource().getValue();
        this.updateServerPara("volume", this.para.volume);
      },
      onOiFlag: function () {
        // Validate OI track Flag
        if (this.para.oi.flag === false) {
          if (this.para.oi.per <= 0) {
            this.setMessage(this.error, "Invalid OI Track %", this.P3);
            return;
          }
          if (this.para.oi.action === this.none) {
            this.setMessage(this.error, "Invalid OI Track Action", this.P3);
            return;
          }
        }
        this.para.oi.flag = !this.para.oi.flag;
        this.updateServerPara("oi", this.para.oi);
      },
      onOi: function (oEvent) {
        this.para.oi.per = oEvent.getSource().getValue();
        this.updateServerPara("oi", this.para.oi);
      },
      onOiAction: function (oEvent) {
        this.para.oi.action = oEvent.getParameters().item.getText();
        this.updateServerPara("oi", this.para.oi);
      },
      onOiType: function () {
        if (this.para.oi.type === this.up) {
          this.para.oi.type = this.down;
        } else {
          this.para.oi.type = this.up;
        }
        this.updateServerPara("oi", this.para.oi);
      },
      onOiPer: function (oEvent) {
        this.para.oi.per = oEvent.getSource().getValue();
        this.updateServerPara("oi", this.para.oi);
      },
      onAlarmFlag: function () {
        // Alarm On Validation
        if (this.para.alarm.flag === false) {
          if (this.para.alarm.time === 0) {
            this.setMessage(this.error, "Please Set Time", this.P3);
            return;
          }
          // if (this.para.alarm.time <= this.getCurrentTime()) {
          //   this.setMessage(this.error, "Alarm Time Cannot be Past", this.P3);
          //   return;
          // }
          if (
            this.para.alarm.delta === false &&
            this.para.alarm.track === false &&
            this.para.alarm.volume === false &&
            this.para.alarm.oi === false
          ) {
            this.setMessage(this.error, "Invalid Alarm Action", this.P3);
            return;
          }
        }
        this.para.alarm.flag = !this.para.alarm.flag;

        if (this.para.alarm.flag === false) {
          this.para.alarm.time = 0;
          this.para.alarm.repeatFlag = false;
          this.para.alarm.delta = false;
          this.para.alarm.track = false;
          this.para.alarm.volume = false;
          this.para.alarm.oi = false;
        }
        this.updateServerPara("alarm", this.para.alarm);
      },
      onAlarm: function (oEvent) {
        this.para.alarm.time = new Date(
          oEvent.getSource().getValue(),
        ).getTime();

        this.updateServerPara("alarm", this.para.alarm);
      },
      onAlarmAction: function (oEvent) {
        this.para.alarm.action = oEvent.getParameters().item.getText();
        this.updateServerPara("alarm", this.para.alarm);
      },
      onAlarmRepeatFlag: function () {
        this.para.alarm.repeatFlag = !this.para.alarm.repeatFlag;
        this.updateServerPara("alarm", this.para.alarm);
      },
      onAlarmRepeatCount: function (oEvent) {
        this.para.alarm.repeatCount = oEvent.getSource().getValue();
        this.updateServerPara("alarm", this.para.alarm);
      },
      onAlarmDelta: function () {
        this.para.alarm.delta = !this.para.alarm.delta;
        this.updateServerPara("alarm", this.para.alarm);
      },
      onAlarmtrack: function () {
        this.para.alarm.track = !this.para.alarm.track;
        this.updateServerPara("alarm", this.para.alarm);
      },
      onAlarmVolume: function () {
        this.para.alarm.volume = !this.para.alarm.volume;
        this.updateServerPara("alarm", this.para.alarm);
      },
      onAlarmOi: function () {
        this.para.alarm.oi = !this.para.alarm.oi;
        this.updateServerPara("alarm", this.para.alarm);
      },
      onAmountPopup: function () {
        var oView = this.getView();
        // Token Popup
        if (!this._AmountDialog) {
          this._AmountDialog = Fragment.load({
            id: oView.getId(),
            name: "ns.deltaapphost.fragment.Amount",
            controller: this,
          }).then(
            function (oDialog) {
              oView.addDependent(oDialog);
              return oDialog;
            }.bind(this),
          );
        }

        var that = this;
        this._AmountDialog.then(function (oDialog) {
          oDialog.open();
        });
      },
      onAmountConfirm: function (oEvent) {
        oEvent.getSource().getParent().close();
      },

      onAmountCurr: function () {
        if (this.para.account.currency == this.usd) {
          this.para.account.currency = this.inr;
        } else {
          this.para.account.currency = this.usd;
        }
        this.updateServerPara("account", this.para.account);
      },
      onCalcAmount: function () {
        this.para.account.amount = Math.round(this.para.account.wallet / 4);
        this.para.account.per = Math.round(
          (this.para.account.amount / this.para.account.wallet) * 100,
        );
        this.updateServerPara("account", this.para.account);
      },
      onAmount: function (oEvent) {
        var amount = oEvent.getSource().getValue();

        if (amount > this.para.account.wallet) {
          oEvent.getSource().setValue(this.para.account.amount);
          MessageToast.show("Amount cannot exceed Wallet");
          return;
        }

        this.para.account.amount = amount;
        this.para.account.per = Math.round(
          (this.para.account.amount / this.para.account.wallet) * 100,
        );
        this.updateServerPara("account", this.para.account);
      },
      onSetting: function (oEvent) {
        let oButton = oEvent.getSource();
        this.getView().byId("idHeaderActionMenu").openBy(oButton);
      },
      onAction: function (oEvent) {
        let oButton = oEvent.getSource();
        this.getView().byId("idChartActionMenu").openBy(oButton);
      },
      onSwitch: function (oEvent) {
        var _switch = oEvent.getParameters().item.getText();
        oEvent.getSource().setTitle(_switch);
        this.updateServerPara("switch", _switch);
      },
      confirmPopup: function (Action) {
        return new Promise(function (resolve, reject) {
          var that = this;
          MessageBox.confirm(Action + " Confirmed ?", {
            actions: [Action, MessageBox.Action.CLOSE],
            emphasizedAction: Action,
            onClose: function (userAction) {
              if (userAction == Action) {
                resolve(true);
              } else {
                reject(false);
              }
            },
            // dependentOn: that.getView(),
          });
        });
      },
      onBuySupport: function () {
        if (this.buyInfo?.flag == false || this.buyInfo?.flag == undefined) {
          this.setMessage(this.error, "Active Orders Not Found", this.P3);
          return;
        }

        if (this.buyInfo?.supportFlag === false) {
          this.confirmPopup("Buy Support")
            .then((result) => {
              this.serverAction("BuySupport", true);
            })
            .catch((err) => {
              MessageToast.show("Action Cancelled");
            });
        } else if (this.buyInfo?.supportFlag === true) {
          this.setMessage(this.error, "Support Exists", this.P3);
        }
      },
      onSellSupport: function () {
        if (this.buyInfo?.flag == false || this.buyInfo?.flag == undefined) {
          this.setMessage(this.error, "Active Orders Not Found", this.P3);
          return;
        }

        if (this.buyInfo?.supportFlag === true) {
          this.confirmPopup("Sell Support")
            .then((result) => {
              this.serverAction("SellSupport", true);
            })
            .catch((err) => {
              MessageToast.show("Action Cancelled");
            });
        } else {
          this.setMessage(this.error, "Support Donot Exists", this.P3);
        }
      },
      onBuyAddon: function () {
        if (this.buyInfo?.flag == false || this.buyInfo?.flag == undefined) {
          this.setMessage(this.error, "Active Orders Not Found", this.P3);
          return;
        }

        if (this.buyInfo?.addon?.flag === false) {
          this.confirmPopup("Buy Addon")
            .then((result) => {
              this.serverAction("BuyAddon", true);
            })
            .catch((err) => {
              MessageToast.show("Action Cancelled");
            });
        } else if (this.buyInfo?.addon?.flag === true) {
          this.setMessage(this.error, "Addon Exists", this.P3);
        }
        // this.serverAction("BuySupport", true);
      },
      onSellAddon: function () {
        if (this.buyInfo?.flag == false || this.buyInfo?.flag == undefined) {
          this.setMessage(this.error, "Active Orders Not Found", this.P3);
          return;
        }

        if (this.buyInfo?.addon?.flag === true) {
          this.confirmPopup("Sell Addon")
            .then((result) => {
              this.serverAction("SellAddon", true);
            })
            .catch((err) => {
              MessageToast.show("Action Cancelled");
            });
        } else {
          this.setMessage(this.error, "No Addon Found", this.P3);
        }
      },
      onReverseWithSupport: function () {
        if (this.buyInfo?.flag == false || this.buyInfo?.flag == undefined) {
          this.setMessage(this.error, "Active Orders Not Found", this.P3);
          return;
        }

        this.confirmPopup("Reverse With Support")
          .then((result) => {
            this.serverAction("ReverseWithSupport", true);
          })
          .catch((err) => {
            MessageToast.show("Action Cancelled");
          });
      },
      onReverseWithoutSupport: function () {
        if (this.buyInfo?.flag == false || this.buyInfo?.flag == undefined) {
          this.setMessage(this.error, "Active Orders Not Found", this.P3);
          return;
        }

        this.confirmPopup("Reverse Without Support")
          .then((result) => {
            this.serverAction("ReverseWithoutSupport", true);
          })
          .catch((err) => {
            MessageToast.show("Action Cancelled");
          });
      },
      enableBarCandle: function () {
        if (this.para.barType == undefined) {
          this.para.barType = this.option;
        }

        // Activate Bar Chart
        switch (this.para.barType) {
          case this.market:
            this.barChart.series[0].show();
            this.barChart.series[1].hide();
            this.barChart.series[2].hide();
            this.barChart.series[3].hide();
            break;
          case this.option:
            this.barChart.series[0].hide();
            this.barChart.series[1].show();
            this.barChart.series[2].show();
            this.barChart.series[3].show();
            break;
          case this.track:
            this.barChart.series[0].hide();
            this.barChart.series[1].show();
            this.barChart.series[2].hide();
            this.barChart.series[3].show();
            break;
          case this.buy:
            this.barChart.series[0].hide();
            this.barChart.series[1].show();
            this.barChart.series[2].show();
            this.barChart.series[3].show();
            break;
        }

        // Enable Stacking for Track Bar Chart
        if (this.para.barType == this.track) {
          this.barChart.update({
            plotOptions: {
              series: {
                stacking: "normal", // Enable Satcking
                borderRadius: "30%",
              },
            },
          });
        } else {
          this.barChart.update({
            plotOptions: {
              series: {
                stacking: undefined, // Disable Satcking
                borderRadius: "30%",
              },
            },
          });
        }
      },
      initPlotLines: function () {
        // Track Time
        this.initChartTimeLine();

        // Call Window
        this.initPlotLine("CALL_BUY", 0, this.blue, 0, "");
        this.initPlotLine("CALL_GREEN", 0, this.black, 0, "");
        this.initPlotLine("CALL_ORANGE", 0, this.black, 0, "");
        this.initPlotLine("CALL_RED", 0, this.black, 0, "");
        this.initPlotBand("CALL_GREEN_WINDOW", 0, this.greenWindow, 0, 0);
        this.initPlotBand("CALL_ORANGE_WINDOW", 0, this.orangeWindow, 0, 0);

        // Put Window
        this.initPlotLine("PUT_BUY", 1, this.blue, 0, "");
        this.initPlotLine("PUT_GREEN", 1, this.black, 0, "");
        this.initPlotLine("PUT_ORANGE", 1, this.black, 0, "");
        this.initPlotLine("PUT_RED", 1, this.black, 0, "");
        this.initPlotBand("PUT_GREEN_WINDOW", 1, this.greenWindow, 0, 0);
        this.initPlotBand("PUT_ORANGE_WINDOW", 1, this.orangeWindow, 0, 0);

        // Delta Window
        this.initPlotLine("DELTA_HIGH", 2, this.green, 0, "");
        this.initPlotLine("DELTA_LOW", 2, this.red, 0, "");
        this.initPlotBand("DELTA_WINDOW", 2, this.orangeWindow, 0, 0);

        // Addon Window
        this.initPlotLine("ADDON_TARGET", 2, this.purple, 0, "");
        this.initPlotLine("ADDON_BUY", 2, this.blue, 0, "");
        this.initPlotLine("ADDON_HIGH", 2, this.black, 0, "");
        this.initPlotLine("ADDON_LOW", 2, this.black, 0, "");
        this.initPlotBand("ADDON_WINDOW", 2, this.greyWindow, 0, 0);

        // Bar Window
        this.initBarLine("BAR_HIGH", 1, this.green, 0, "");
        this.initBarLine("BAR_LOW", 1, this.red, 0, "");
        this.initPlotBand("BAR_WINDOW", 1, this.orangeWindow, 0, 0);
      },
      initChartTimeLine: function () {
        this.stockChart.xAxis[0].addPlotLine({
          id: "TRACK_TIME",
          value: 0,
          width: 2,
          dashStyle: "Dash",
          color: "MidnightBlue",
          label: {
            text: "",
            rotation: 0,
            textAlign: "right",
            verticalAlign: "top",
            // horizontalAlign: "center",
            color: "MidnightBlue",
            x: -10,
            y: 20,
            style: {
              fontWeight: "bold",
            },
          },
        });
      },
      getLinePosition: function (Series, Value) {
        if (Value == 0) {
          return -10000;
        } else {
          return this.formatDecimal(Value);
        }
      },
      getBarPosition: function (Id, Value) {
        if (Value == 0) {
          return this.hidePlotline;
        } else {
          return Math.round(Value);
        }
      },
      getTextPosition: function (Id) {
        switch (Id) {
          case "CALL_GREEN":
          case "PUT_GREEN":
          case "CALL_ORANGE":
          case "PUT_ORANGE":
          case "DELTA_HIGH":
          case "ADDON_TARGET":
          case "ADDON_HIGH":
          case "BAR_HIGH":
            return -5;
          case "PUT_BUY":
          case "CALL_BUY":
          case "CALL_RED":
          case "PUT_RED":
          case "DELTA_LOW":
          case "ADDON_LOW":
          case "ADDON_BUY":
          case "BAR_LOW":
            return 15;
        }
      },
      getLineType: function (Id) {
        switch (Id) {
          case "CALL_BUY":
          case "PUT_BUY":
          case "DELTA_HIGH":
          case "DELTA_LOW":
          case "ADDON_TARGET":
          case "ADDON_BUY":
          case "BAR_HIGH":
          case "BAR_LOW":
            return "LongDash";
          default:
            return "Line";
        }
      },

      initPlotLine: function (Id, Series, Color, Value, Label) {
        var zindex = 5;
        var linePosition = this.getLinePosition(Series, Value);
        var textPosition = this.getTextPosition(Id);
        var lineType = this.getLineType(Id);

        this.stockChart.series[Series].yAxis.addPlotLine({
          id: Id,
          value: linePosition,
          width: 2,
          color: Color,
          zIndex: zindex,
          dashStyle: lineType, // "Dash",
          label: {
            text: Label,
            // verticalAlign: allignment, //"bottom",
            color: Color,
            zIndex: zindex,
            x: 1100,
            y: textPosition,
            style: {
              color: Color,
              fontWeight: "bold",
            },
          },
        });
      },
      initPlotBand: function (Id, Series, Color, From, To) {
        this.stockChart.series[Series].yAxis.addPlotBand({
          id: Id,
          color: Color,
          to: To,
          from: From,
        });
      },
      updatePlotLine: function (Id, Series, Value, Label) {
        var linePosition = this.getLinePosition(Series, Value);
        var plotline = this.stockChart.series[
          Series
        ].yAxis.plotLinesAndBands.filter((row) => row.id == Id)[0];
        if (plotline != undefined) {
          plotline.options.value = linePosition;
          plotline.options.label.text = linePosition;
        }
        // Upadte Window
        this.stockChart.series[Series].yAxis.update();
      },
      updatePlotBand: function (Id, Series, From, To, Color) {
        var plotline = this.stockChart.series[
          Series
        ].yAxis.plotLinesAndBands.filter((row) => row.id == Id)[0];
        if (plotline != undefined) {
          plotline.options.from = this.formatDecimal(From);
          plotline.options.to = this.formatDecimal(To);
          plotline.options.color = Color;
        }
        // Upadte Window
        this.stockChart.series[Series].update();
      },
      initBarLine: function (Id, Series, Color, Value, Label) {
        var zindex = 5;
        var linePosition = this.getBarPosition(Id, Value);
        var textPosition = this.getTextPosition(Id);

        this.barChart.series[Series].yAxis.addPlotLine({
          id: Id,
          value: linePosition,
          width: 2,
          color: Color,
          dashStyle: "Dash",
          zIndex: zindex,
          label: {
            text: Label,
            // verticalAlign: allignment, //"bottom",
            // color: Color,
            // zIndex: zindex,
            x: 1100,
            y: textPosition, //20,
            style: {
              // color: Color,
              fontWeight: "bold",
            },
          },
        });
      },
      updateBarLine: function (Id, Series, Value, Label) {
        if (this.barChart == undefined) {
          return;
        }

        var barPosition = this.getBarPosition(Id, Value);
        var plotline = this.barChart.series[
          Series
        ].yAxis.plotLinesAndBands.filter((row) => row.id == Id)[0];
        if (plotline != undefined) {
          // plotline.options.color = Color;
          plotline.options.value = barPosition;
          plotline.options.label.text = barPosition;
        }
        // Modify Line
        this.barChart.series[Series].yAxis.update();
      },
      displayTrackTime: function () {
        if (this.para.track.flag == false || this.para.track.time == 0) {
          return;
        }

        var plotline = this.stockChart.xAxis[0].plotLinesAndBands.filter(
          (row) => row.id == "TRACK_TIME",
        )[0];

        if (plotline != undefined) {
          let time = this.para.track.time;
          plotline.options.value = time;
          plotline.options.label.text = this.convertSecondsToText(time);
          this.stockChart.xAxis[0].update();
        }
      },
      onOpenPosition: function () {
        this.confirmPopup("Get Open Position")
          .then((result) => {
            this.serverAction("OpenPosition", true);
          })
          .catch((err) => {
            MessageToast.show("Action Cancelled");
          });
      },
      onSellAll: function () {
        this.confirmPopup("Sell All Positions")
          .then((result) => {
            this.serverAction("SellAll", true);
          })
          .catch((err) => {
            MessageToast.show("Action Cancelled");
          });
      },
      displayDefaultChart: async function () {
        this.updateMarketChartInfo(this.btcSymbol);
        await this.displayMarketChart();
      },
      getMarketIndexSymbol: function (index) {
        switch (index) {
          case this.btc:
            return this.btcSymbol;
            break;
          case this.eth:
            return this.ethSymbol;
            break;
          default:
            return 0;
            break;
        }
      },
      displayMarketChart: async function () {
        try {
          // set Market Container
          this.setMarketContainer();

          // Set Chart Title
          this.setChartTitle();

          // var history = await this.getHistory(
          //   this.getPriceTypeSymbol(this.para.chart.symbol),
          //   Math.floor(this.para.chart.startChart / 1000),
          //   Math.floor(this.para.chart.endCandle / 1000),
          // );

          // if (history.success == false || history.result.length == 0) {
          //   throw new Error("Market Data Not Found");
          // } else {
          //   this.aMarket = this.arrangeCandle(history.result);

          //   if (this.para.priceType == this.maker) {
          //     var volHistory = await this.getHistory(
          //       this.para.chart.symbol,
          //       Math.floor(this.para.chart.startChart / 1000),
          //       Math.floor(this.para.chart.endCandle / 1000),
          //     );

          //     if (
          //       volHistory.success == false ||
          //       volHistory.result.length == 0
          //     ) {
          //       throw new Error("Market Data Not Found");
          //     } else {
          //       this.aVolume = this.arrangeVolume(volHistory.result);
          //     }
          //   } else {
          //     this.aVolume = this.arrangeVolume(history.result);
          //   }
          // }
          // this.setVolume();
          // this.setMarketCandle();

          this.setMarketVolume();

          await this.setMarketOiCandle();
        } catch (error) {
          this.setMessage(this.error, error.message, this.P1);
        }
      },
      setMarketVolume: async function () {
        var history = await this.getHistory(
          this.getPriceTypeSymbol(this.para.chart.symbol),
          Math.floor(this.para.chart.startChart / 1000),
          Math.floor(this.para.chart.endCandle / 1000),
        );

        if (history.success == false || history.result.length == 0) {
          throw new Error("Market Data Not Found");
        } else {
          this.aMarket = this.arrangeCandle(history.result);

          if (this.para.priceType == this.maker) {
            var volHistory = await this.getHistory(
              this.para.chart.symbol,
              Math.floor(this.para.chart.startChart / 1000),
              Math.floor(this.para.chart.endCandle / 1000),
            );

            if (volHistory.success == false || volHistory.result.length == 0) {
              throw new Error("Market Data Not Found");
            } else {
              this.aVolume = this.arrangeVolume(volHistory.result);
            }
          } else {
            this.aVolume = this.arrangeVolume(history.result);
          }
        }

        if (this.para.chart.category === this.market) {
          this.setMarketCandle();
        }
        this.setVolume();
      },
      setMarketOiCandle: async function () {
        var aMarketOiHistory = await this.getHistory(
          "OI:" + this.para.chart.symbol,
          Math.floor(this.para.chart.startChart / 1000),
          Math.floor(this.para.chart.endCandle / 1000),
        );

        this.marketOiHigh = aMarketOiHistory.result.reduce(
          (max, row) => Math.max(max, row.high),
          -Infinity,
        );
        this.marketOiLow = aMarketOiHistory.result.reduce(
          (min, row) => Math.min(min, row.low),
          Infinity,
        );

        this.aMarketOi = this.arrangeCandle(aMarketOiHistory.result);
        this.setMarketOi();
      },
      getPercentage: function (open, close) {
        var per = 0;
        if (open != 0) {
          per = ((close - open) / open) * 100;
        }
        return this.formatDecimal(per);
      },
      getVolumeLastPrice: function (Points) {
        var preVol = 0;
        if (Points == undefined) {
          return 0;
        }
        var vol = Points[Points.length - 1].y;
        if (vol == undefined) {
          vol = 0;
        }
        // Avoid dump at first candle
        if (Points.length >= 2) {
          preVol = Points[Points.length - 2].y;
          if (preVol == undefined) {
            preVol = 0;
          }
        }
        var percentage = Math.round(this.getPercentage(preVol, vol));
        if (percentage > 0) {
          return ` ${vol}<br> <p style="color:#93c47d;">${percentage} %</p>`;
        } else {
          return ` ${vol}<br> <p style="color:#ea9999;">${percentage} %</p>`;
        }
      },
      getVolDiv: function () {
        var maxVol = this.aVolume.reduce(
          (max, vol) => Math.max(max, vol[1]),
          -Infinity,
        );

        switch (Math.round(maxVol).toString().length) {
          case 4:
            this.volUnit = "H";
            this.volDiv = this.hundred;
            break;
          case 5:
            this.volUnit = "K";
            this.volDiv = this.thousand;
            break;
          case 6:
            this.volUnit = "T";
            this.volDiv = this.tenThousand;
            break;
          case 7:
            this.volUnit = "L";
            this.volDiv = this.lakh;
            break;
          case 8:
            this.volUnit = "M";
            this.volDiv = this.million;
            break;
          default:
            this.volUnit = "M";
            this.volDiv = this.million;
            break;
        }
        this.stockChart.yAxis[5].options.labels.format =
          "{value} " + this.volUnit;
      },
      getMarketVolDiv: function () {
        var maxVol = this.aMarketVolume.reduce(
          (max, vol) => Math.max(max, vol[1]),
          -Infinity,
        );

        switch (Math.round(maxVol).toString().length) {
          case 4:
            this.volUnit = "H";
            this.volDiv = this.hundred;
            break;
          case 5:
            this.volUnit = "K";
            this.volDiv = this.thousand;
            break;
          case 6:
            this.volUnit = "T";
            this.volDiv = this.tenThousand;
            break;
          case 7:
            this.volUnit = "L";
            this.volDiv = this.lakh;
            break;
          case 8:
            this.volUnit = "M";
            this.volDiv = this.million;
            break;
          default:
            this.volUnit = "M";
            this.volDiv = this.million;
            break;
        }
        this.stockChart.yAxis[5].options.labels.format =
          "{value} " + this.volUnit;
      },
      setVolume: function () {
        if (this.aVolume.length > 0) {
          this.getVolDiv();

          for (let i = 0; i < this.aVolume.length; i++) {
            this.aVolume[i][1] = Math.round(this.aVolume[i][1] / this.volDiv);
          }

          this.volHigh = this.aVolume.reduce(
            (max, user) => Math.max(max, user[1]),
            -Infinity,
          );
          this.volLow = this.aVolume.reduce(
            (min, user) => Math.min(min, user[1]),
            Infinity,
          );

          this.volPer = this.formatDecimal(100 / (this.volHigh - this.volLow));

          this.stockChart.series[5].setData(this.aVolume);
          this.stockChart.series[5].update();
        } else {
          this.setMessage(this.error, "Market Candle Data Not Found", this.P3);
        }
      },
      setOptionMarketVolume: function () {
        if (this.aMarketVolume.length > 0) {
          this.getVolDiv();

          for (let i = 0; i < this.aMarketVolume.length; i++) {
            this.aMarketVolume[i][1] = Math.round(
              this.aMarketVolume[i][1] / this.volDiv,
            );
          }

          this.volHigh = this.aMarketVolume.reduce(
            (max, user) => Math.max(max, user[1]),
            -Infinity,
          );
          this.volLow = this.aMarketVolume.reduce(
            (min, user) => Math.min(min, user[1]),
            Infinity,
          );

          this.volPer = this.formatDecimal(100 / (this.volHigh - this.volLow));

          this.marketChart.series[1].setData(this.aMarketVolume);
          this.marketChart.series[1].update();
        } else {
          this.setMessage(this.error, "Market Candle Data Not Found", this.P3);
        }
      },
      setMarketCandle: function () {
        if (this.aMarket.length > 0) {
          this.stockChart.series[0].setData(this.aMarket);
          this.stockChart.series[0].update();
        } else {
          this.setMessage(this.error, "Market History Not Found", this.P3);
        }
      },
      setMarketOi: function () {
        if (this.aMarketOi.length > 0) {
          this.stockChart.series[2].setData(this.aMarketOi);
          this.stockChart.series[2].update();
        } else {
          this.setMessage(this.error, "Market OI History Not Found", this.P3);
        }
      },
      formatDecimal: function (value) {
        return Math.round(value * 10) / 10;
      },
      arrangeCandle: function (Data) {
        var candle = [];
        var aDisplayData = [];
        var lastClose = 0;

        for (let i = 0; i < this.aTimeAxis.length; i++) {
          // Ignore Out of Scope Data
          if (this.aTimeAxis[i] < this.para.chart.startChart) {
            continue;
          }
          if (this.aTimeAxis[i] >= this.para.chart.endCandle) {
            break;
          }
          var record = Data.filter(
            (row) => row.time * 1000 == this.aTimeAxis[i],
          )[0];
          // @ts-ignore
          var time = Math.floor(this.aTimeAxis[i] / 1000);
          if (record == undefined) {
            candle.push(this.aTimeAxis[i]);
            candle.push(this.formatDecimal(lastClose));
            candle.push(this.formatDecimal(lastClose));
            candle.push(this.formatDecimal(lastClose));
            candle.push(this.formatDecimal(lastClose));
          } else {
            candle.push(this.aTimeAxis[i]);
            candle.push(this.formatDecimal(record.open));
            candle.push(this.formatDecimal(record.high));
            candle.push(this.formatDecimal(record.low));
            candle.push(this.formatDecimal(record.close));
            // Capture last close
            lastClose = record.close;
          }
          aDisplayData.push(candle);
          candle = [];
        }
        return aDisplayData;
      },
      arrangeVolume: function (Data) {
        var candle = [];
        var aDisplayData = [];
        var lastVolume = 0;

        for (let i = 0; i < this.aTimeAxis.length; i++) {
          // Ignore Out of Scope Data
          if (this.aTimeAxis[i] < this.para.chart.startChart) {
            continue;
          }
          if (this.aTimeAxis[i] >= this.para.chart.endCandle) {
            break;
          }
          var record = Data.filter(
            (row) => row.time * 1000 == this.aTimeAxis[i],
          )[0];
          // @ts-ignore
          var time = Math.floor(this.aTimeAxis[i] / 1000);
          if (record == undefined) {
            candle.push(this.aTimeAxis[i]);
            candle.push(this.formatDecimal(lastVolume));
          } else {
            candle.push(this.aTimeAxis[i]);
            candle.push(this.formatDecimal(record.volume));

            // Capture last Volume
            lastVolume = record.volume;
          }
          aDisplayData.push(candle);
          candle = [];
        }
        return aDisplayData;
      },
      getPriceTypeSymbol: function (symbol) {
        // Get Symbols
        switch (this.para.priceType) {
          case this.maker:
            symbol = this.mark + symbol;
            break;
          case this.taker:
            symbol = symbol;
            break;
          default:
            this.setMessage(this.error, "Price Type Not Availabe", this.P3);
            break;
        }
        return symbol;
      },
      getHistory: function (symbol, start, end) {
        const params = new URLSearchParams({
          symbol: symbol,
          resolution: this.para.timeframe,
          start: start,
          end: end,
        });

        const path = `/v2/history/candles?${params}`;
        var that = this;
        // @ts-ignore
        return new Promise(function (resolve, reject) {
          that
            .fetchDelta(that.get, path)
            .then((data) => {
              resolve(data);
            })
            .catch((Error) => {
              reject(Error);
            });
        });
      },
      convertDateToSeconds: function (Date) {
        return Math.floor(Date.getTime());
      },
      convertSecondsToDate: function (seconds) {
        var date = new Date(seconds);
        return date;
      },
      fetchDelta: function (method, path) {
        // Parameters
        var BASE_URL = sap.ui.getCore().deltaPath; // "https://api.india.delta.exchange"; // Or https://api.global.delta.exchange
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
      },
      dateToTextFormat: function (expiry) {
        let month = expiry.getMonth();
        let date = expiry.getDate();
        let monthText = this.aMonth[month];
        return date + " " + monthText;
      },
      setChartTitle: function () {
        var oModel = this.getView().getModel("TitleModel");
        var data = oModel.getData();

        if (this.para.chart.category == this.market) {
          data.index = this.getSymbolIndex(this.para.chart.symbol);
          data.callStrike = 0;
          data.putStrike = 0;
          data.window = 0;
        } else {
          data.index = this.getSymbolIndex(
            this.para.chart.category === this.market
              ? this.para.chart.symbol
              : this.para.chart.callSymbol,
          );
          data.callStrike = this.getSymbolStrike(this.para.chart.callSymbol);
          data.putStrike = this.getSymbolStrike(this.para.chart.putSymbol);
          data.window =
            data.index == this.btc ? this.btcWindow : this.ethWindow;
        }
        data.name = data.index == this.btc ? this.bitcoin : this.ethereum;
        data.expiry = this.para.expiry.text;
        oModel.setData(data);
      },
      getSymbolIndex: function (Symbol) {
        if (Symbol == undefined || Symbol == 0) {
          return 0;
        }
        let { index, type, strike } = this.defineSymbol(Symbol);
        return index;
      },
      getSymbolStrike: function (Symbol) {
        if (Symbol == undefined || Symbol == 0) {
          return 0;
        }
        var aParts = Symbol.split("-");
        if (aParts.length > 0) {
          return aParts[2];
        } else {
          return 0;
        }
      },
      defineSymbol: function (symbol) {
        let index = this.none,
          type = this.none,
          strike = 0;

        // // Get Actual Symbol
        // if (this.para.priceType === this.maker) {
        //   symbol = symbol?.split(":")[1] ?? symbol;
        // }

        // Market Symbols
        if (symbol === this.btcSymbol) {
          index = this.btc;
          return { index, type, strike };
        }

        if (symbol === this.ethSymbol) {
          index = this.eth;
          return { index, type, strike };
        }

        // Other Symbols
        const aParts = symbol.split("-");
        switch (aParts[0]) {
          case "C":
            type = this.call;
            break;
          case "P":
            type = this.put;
            break;
        }

        index = aParts[1];
        strike = aParts[2];
        return { index, type, strike };
      },
      setMarketContainer: function () {
        this.setSeriesContainer(0, "0%", "70%"); // Call
        this.setSeriesContainer(1, "0%", "0%"); // Put
        this.setSeriesContainer(2, "70%", "30%"); // Delta
        this.setSeriesContainer(3, "0%", "0%"); // Call oi
        this.setSeriesContainer(4, "0%", "0%"); // Put Oi
        this.setSeriesContainer(5, "0%", "70%"); // Volume
        this.stockChart.redraw();
      },
      setOptionContainer: function () {
        // this.setSeriesContainer(0, "0%", "40%");
        // this.setSeriesContainer(1, "40%", "40%");
        // this.setSeriesContainer(2, "80%", "20%");
        // this.setSeriesContainer(3, "0%", "40%");
        // this.setSeriesContainer(4, "40%", "40%");
        // this.setSeriesContainer(5, "80%", "20%");
        this.setSeriesContainer(0, "0%", "35%");
        this.setSeriesContainer(1, "35%", "35%");
        this.setSeriesContainer(2, "70%", "30%");
        this.setSeriesContainer(3, "0%", "35%");
        this.setSeriesContainer(4, "35%", "35%");
        this.setSeriesContainer(5, "70%", "30%");
        this.stockChart.redraw();
      },
      setSeriesContainer: function (Series, Top, Height) {
        this.stockChart.yAxis[Series].update(
          {
            height: Height, // "50%",
            top: Top, // "0%",
          },
          true,
        );

        if (Top == "0%" && Height == "0%") {
          this.stockChart.series[Series].update({
            visible: false,
            lastVisiblePrice: {
              enabled: false,
            },
            lastPrice: {
              enabled: false,
            },
          });
        } else if (Series == 3 || Series == 4 || Series == 5) {
          this.stockChart.series[Series].update({
            visible: true,
            lastVisiblePrice: {
              enabled: true,
              label: {
                enabled: true,
                align: "left",
                x: 10,
                backgroundColor: "#5b5b5b", // "#1ca332",
                style: {
                  fontSize: "1em",
                },
              },
            },
            lastPrice: {
              enabled: true,
              width: 0,
              color: "#5b5b5b", //  "#1ca332",
              lable: {
                enabled: true,
                backgroundColor: "#5b5b5b", //"#1ca332",
                // style: {
                //  fontSize: '2em'
                // }
              },
            },
          });
        } else {
          this.stockChart.series[Series].update({
            visible: true,
            lastVisiblePrice: {
              enabled: true,
              label: {
                enabled: true,
                align: "left",
                x: 10,
                backgroundColor: "#5b5b5b", // "#1ca332",
                style: {
                  fontSize: "1em",
                },
              },
            },
            lastPrice: {
              enabled: true,
              width: 1.5,
              color: "#5b5b5b", //  "#1ca332",
              lable: {
                enabled: true,
                backgroundColor: "#5b5b5b", //"#1ca332",
                // style: {
                //  fontSize: '2em'
                // }
              },
            },
          });
        }
      },
      updateMarketChartInfo: async function (Symbol) {
        this.para.chart.category = this.market;
        this.para.chart.symbol = Symbol;
        this.para.chart.index = this.getSymbolIndex(Symbol);
        this.para.chart.callStrike = 0;
        this.para.chart.putStrike = 0;
        this.para.chart.expiry = 0;
        this.updateServerPara("chart", this.para.chart);
      },
      updateOptionChartInfo: async function (CallSymbol, PutSymbol) {
        this.para.chart.category = this.option;
        this.para.chart.index = this.getSymbolIndex(CallSymbol);
        this.para.chart.symbol =
          this.para.chart.index === this.btc ? this.btcSymbol : this.ethSymbol;
        this.para.chart.callSymbol = CallSymbol;
        this.para.chart.putSymbol = PutSymbol;
        this.para.chart.callStrike = this.getSymbolStrike(CallSymbol);
        this.para.chart.putStrike = this.getSymbolStrike(PutSymbol);
        this.para.chart.expiry = this.para.expiry.symbol;

        this.updateServerPara("chart", this.para.chart);
      },
      getMsgIcon: function (Type) {
        switch (Type) {
          case this.accept:
          case this.success:
            return "sap-icon://message-success";
          case this.reject:
          case this.error:
            return "sap-icon://sys-cancel";
          case this.warning:
            return "sap-icon://message-warning";
          default:
            return "sap-icon://message-information";
        }
      },
      getServerMessages: async function () {
        this.serverAction("GetMessage", true);
      },
      getBarStrikes: async function () {
        this.serverAction("BarStrikes", true);
      },
      getAlerts: async function () {
        this.serverAction("Alerts", true);
      },
      onRefreshBuyInfo: function () {
        // Refresh Buy
        this.serverAction("RefreshBuy", true);

        // Inactive Buy
        if (this.buyInfo?.flag == undefined || this.buyInfo?.flag == false) {
          // Reset Pnl Model
          this.initPnlModel();
          // Reset Trn Model
          this.initTrnModel();
          // Init Trn Toolbar
          this.initTrnToolbar();
          // Init Trn Footer
          this.initTrnFooter();
          return;
        }
      },
      initTrnToolbar: function () {
        this.getView().byId("idMainGenericTag").setText("0 %");
        this.getView().byId("idMainGenericTag").setStatus(this.none);

        this.getView().byId("idAddonGenericTag").setText("0 %");
        this.getView().byId("idAddonGenericTag").setStatus(this.none);

        this.getView().byId("idSupportGenericTag").setText("0 %");
        this.getView().byId("idSupportGenericTag").setStatus(this.none);
      },
      initTrnFooter: function () {
        this.getView().byId("idTrnAvgObjectStatus").setText("0 %");
        this.getView().byId("idTrnAvgObjectStatus").setState("Indication10");

        this.getView().byId("idTrnTotalObjectStatus").setText("0 %");
        this.getView().byId("idTrnTotalObjectStatus").setState("Indication10");
      },
      updateHistoryTime: function () {
        if (this.aTrn == undefined) {
          return;
        }
        var mainGap = 0,
          supportGap = 0,
          mainTime = "0 m",
          supportTime = "0 m";

        // Main
        var mainTicker = this.aTrn.find(
          (item) => item.flag == true && item.category == this.main,
        );
        if (mainTicker?.buyTime != undefined) {
          mainGap = this.getCurrentTime() - mainTicker.buyTime;
          mainTime = this.convertSecondsForHistory(mainGap);
          this.getView().byId("idMainGenericTag").setText(mainTime);
        }

        // Support
        var supportTicker = this.aTrn.find(
          (item) => item.flag == true && item.category == this.support,
        );
        if (supportTicker?.buyTime != undefined) {
          supportGap = this.getCurrentTime() - supportTicker.buyTime;
          supportTime = this.convertSecondsForHistory(supportGap);
          this.getView().byId("idSupportGenericTag").setText(supportTime);
        }

        // Main Addon
        var mainTicker = this.aTrn.find(
          (item) => item.flag == true && item.category == this.mainAddon,
        );
        if (mainTicker?.buyTime != undefined) {
          mainGap = this.getCurrentTime() - mainTicker.buyTime;
          mainTime = this.convertSecondsForHistory(mainGap);
          this.getView().byId("idAddonGenericTag").setText(mainTime);
        }

        // Support Addon
        var supportTicker = this.aTrn.find(
          (item) => item.flag == true && item.category == this.supportAddon,
        );
        if (supportTicker?.timeStamp != undefined) {
          supportGap = this.getCurrentTime() - supportTicker.timeStamp;
          supportTime = this.convertSecondsForHistory(supportGap);
          this.getView().byId("idAddonGenericTag").setText(supportTime);
        }
      },

      serverAction: async function (key, value) {
        const data = {};
        data[key] = value;

        const options = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        };

        var url = this.apiPath + `/action`;

        var that = this;

        await fetch(url, options)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Updating Server Action`);
            }
            return response.json();
          })
          .then((result) => {
            if (result == undefined) {
              throw new Error("No Responce from Server");
            }
            if (result.status == that.error) {
              throw new Error("Server Error");
            } else {
              if (result.status == this.success || result.status == this.info) {
                if (result.type == this.message) {
                  MessageToast.show(result.message);
                } else if (result.type == this.data) {
                  that.updateServerAction(key, result);
                  MessageToast.show(key + " Updated");
                }
              } else {
                throw new Error("Error in Server Action");
              }
            }
          })
          .catch((error) => {
            that.setMessage(that.error, error.message, this.P1);
          });
      },
      updateServerAction: function (Action, Result) {
        if (Result.data == undefined) {
          this.setMessage(this.error, "Invalid Server Data", this.P3);
          return;
        }

        var Data = Result.data;
        switch (Action) {
          case "GetLayout":
            sap.ui.getCore().layout = Data;
            break;

          case "GetPara":
            let newBarType = false;
            if (Data.barType != this.para.barType) {
              newBarType = true;
            }
            this.para = Data;
            this.updateModel("ParaModel", Data);
            if (newBarType) {
              this.setBarType();
            }
            this.displayChartLines();
            this.displayBarLines();
            break;

          case "StartApp":
            this.para = Data;
            this.updateModel("ParaModel", Data);
            break;

          case "GetMessage":
            this.setAllMessages(Data);
            break;

          case "ResetMessage":
            this.setAllMessages(Data);
            break;

          case "BarStrikes":
            this.setBarStrikes(Data);
            break;

          case "RefreshBuy":
            this.displayMarketChart();
            break;

          case "ResetBuy":
            break;

          case "ResetBusy":
            BusyIndicator.hide();
            break;

          case "NewCandle":
            this.para = Data;
            this.updateModel("ParaModel", this.para);
            // Bar Chart Title
            this.setBarClock();
            // Add New Candle
            this.addNewChartCandle();
            break;

          case "GetPara":
            // Set New Bar Type
            if (this.para.barType != Data.barType) {
              this.para.barType = Data.barType;
              this.setBarType();
            }

            // Update Para Model
            this.para = Data;
            var oModel = this.getView().getModel("ParaModel");
            oModel.setData(this.para);

            // Reset Plotlines
            this.displayChartLines();
            this.displayBarLines();
            break;

          case "ParaBuy":
            this.updateModel("ParaModel", this.para);
            break;

          case "ParaTrack":
            this.para.track = Data;
            this.updateModel("ParaModel", this.para);
            break;

          case "TrackInfo":
            if (Result.data.trackInfo == undefined) {
              this.setMessage(this.error, "Track Info Not Found", this.P3);
              return;
            }
            this.serverAction("TrackInfo", true);
            break;

          case "BuyInfo":
            if (Result.data.buyInfo == undefined) {
              this.setMessage(this.error, "Final Buy Info Not Found", this.P3);
              return;
            }
            // Upadte Buy Info
            this.buyInfo = Result.data.buyInfo;

            if (Result.data.aTrn == undefined) {
              this.aTrn = [];
            } else {
              this.aTrn = Result.data.aTrn;
            }

            this.updateBuyPnl();
            if (this.buyInfo.flag == false) {
              this.resetAllPlotlines();
              this.resetBuyWindow();
            } else {
              this.updateBuyWindow();
            }

            this.updateTrnHistory();

            // Update Model
            // this.updateModel("BuyModel", this.buyInfo);
            // this.updateModel("TrnModel", this.aTrn);

            this.serverAction("resetBuyInfo", true);
            break;

          case "Backtest":
            this.backtestData = Data;
            this.updateModel("BacktestModel", this.backtestData);
            break;

          case "Alerts":
            this.updateModel("AlertModel", Data);
            break;

          case "Sell":
            this.updateModel("ParaModel", this.para);
            break;

          case "ResetAlert":
            this.aAlert = Data;
            this.updateModel("AlertModel", this.aAlert);

            this.getView()
              .byId("idCountGenericTag")
              .setText("Count : " + this.aAlert.length);
            break;

          case "ServerStart":
            // let time = this.convertSecondsToText(Data);
            this.serverStart = Data;
            const [date, time, period] = new Date(Data)
              .toLocaleString()
              .split(" ");
            const [hour, minute, sec] = time.split(":");
            let formattedHour = parseInt(hour);
            let started = `${formattedHour}:${minute} ${period}`;
            if (time != undefined) {
              this.getView()
                .byId("idServerStartedObjectStatus")
                .setText(started);

              let gap = this.getCurrentTime() - Data;
              if (gap > 0) {
                let upTime = this.convertSecondsForClock(gap);
                this.getView().byId("idObjectStatus").setText(upTime);
              }
            }
            break;
        }
      },

      setAllMessages: function (AllMessages) {
        this.aAllMsg = AllMessages;
        var oModel = new JSONModel(AllMessages);

        this.popupMsgCount = this.aAllMsg.length;
        // oMessagePopover.setModel(oModel, "MessageModel");
        this.getView().setModel(oModel, "MessageModel");
        this.updatePopupMsgButton(this.info);
      },
      addNewChartCandle: function () {
        try {
          this.addNewCandle(0);
          this.addNewLine(5);
          this.addNewCandle(2);
          if (this.para.chart.category == this.option) {
            this.addNewCandle(1);
            // this.addNewCandle(2);
            this.addNewLine(3);
            this.addNewLine(4);
          }
        } catch (error) {
          this.setMessage(this.error, "Error Creating new Candle", this.P1);
        }
        switch (this.zoomType) {
          case this.zoom1:
            this.onZoom1();
            break;
          case this.zoom2:
            this.onZoom2();
            break;
          case this.zoom3:
            this.onZoom3();
            break;
          case this.zoomAll:
            this.onZoomAll();
            break;
        }
      },
      addNewCandle: function (CandleSeries) {
        var data = this.stockChart.series[CandleSeries].data;
        if (data == undefined) {
          return;
        }
        var length = data.length - 1;
        var ltp = data[length].close;
        if (ltp == undefined) {
          return;
        }

        var candle = [this.para.chart.startCandle, ltp, ltp, ltp, ltp];
        this.stockChart.series[CandleSeries].addPoint(candle, true, true);
        this.stockChart.series[CandleSeries].update();
      },
      addNewLine: function (CandleSeries) {
        var data = this.stockChart.series[CandleSeries].data;
        if (data == undefined) {
          return;
        }
        var length = data.length - 1;
        var ltp = data[length].y;
        if (ltp == undefined) {
          return;
        }
        var candle = [this.para.chart.startCandle, ltp, ltp, ltp, ltp];
        this.stockChart.series[CandleSeries].addPoint(candle, true, true);
        this.stockChart.series[CandleSeries].update();
      },
      onMessagePopover: function (oEvent) {
        if (oMessagePopover.isOpen()) {
          oMessagePopover.close();
        } else {
          this.popupMsgCount = 0;
          oMessagePopover.openBy(oEvent.getSource());
          this.getView().byId("idMessagePopoverButton").setText("0");
          this.getView()
            .byId("idMessagePopoverButton")
            .setType(this.transparent);
        }
        // oMessagePopover.toggle(oEvent.getSource());
      },
      setBarStrikes: function (Strikes) {
        this.barStrikes = Strikes;
        this.updateModel("BarModel", this.barStrikes);
        // setTimeout(this.highlightBarStrikes, 1000);
        // this.highlightBarStrikes();
      },
      highlightBarStrikes: function () {
        let symbols = this.barStrikes.symbol;
        this.hideHighlightStrikes();
        if (this.buyInfo?.flag == true) {
          if (symbols.btcCall == this.buyInfo?.call.symbol) {
            this.highlightStrike(this.btc, this.call, this.emphasized);
          }
          if (symbols.btcPut == this.buyInfo?.put.symbol) {
            this.highlightStrike(this.btc, this.put, this.emphasized);
          }
          if (symbols.ethCall == this.buyInfo?.call.symbol) {
            this.highlightStrike(this.eth, this.call, this.emphasized);
          }
          if (symbols.ethPut == this.buyInfo?.put.symbol) {
            this.highlightStrike(this.eth, this.put, this.emphasized);
          }
        }
        if (this.para?.track?.flag == true) {
          this.highlightStrike(this.btc, this.call, this.attention);
          this.highlightStrike(this.btc, this.put, this.attention);
          this.highlightStrike(this.eth, this.call, this.attention);
          this.highlightStrike(this.eth, this.put, this.attention);
        }
      },
      onClearAlert: function () {
        this.serverAction("ResetAlert", true);
      },
      onAlertAllFilter: function () {
        let aFilter = this.aAlert;
        this.updateModel("AlertModel", aFilter);
        this.getView()
          .byId("idCountGenericTag")
          .setText("Count : " + aFilter.length);
      },
      onAlertBuyFilter: function () {
        let aFilter = this.aAlert.filter((item) => item.trigger === this.buy);
        this.updateModel("AlertModel", aFilter);
        this.getView()
          .byId("idCountGenericTag")
          .setText("Count : " + aFilter.length);
      },
      onAlertSellFilter: function () {
        let aFilter = this.aAlert.filter((item) => item.trigger === this.sell);
        this.updateModel("AlertModel", aFilter);
        this.getView()
          .byId("idCountGenericTag")
          .setText("Count : " + aFilter.length);
      },
      onAlertAlertFilter: function () {
        let aFilter = this.aAlert.filter((item) => item.trigger === this.alert);
        this.updateModel("AlertModel", aFilter);
        this.getView()
          .byId("idCountGenericTag")
          .setText("Count : " + aFilter.length);
      },
      highlightStrike: function (index, type, highlight) {
        let id;

        switch (index) {
          case this.btc:
            if (type == this.call) {
              id = "idBtcCallStrikeButton";
            } else if (type == this.put) {
              id = "idBtcPutStrikeButton";
            }
            break;
          case this.eth:
            if (type == this.call) {
              id = "idEthCallStrikeButton";
            } else if (type == this.put) {
              id = "idEthPutStrikeButton";
            }
            break;
        }
        this.getView().byId(id).setType(highlight);
      },
      hideHighlightStrikes: function () {
        this.highlightStrike(this.btc, this.call, this.transparent);
        this.highlightStrike(this.btc, this.put, this.transparent);
        this.highlightStrike(this.eth, this.call, this.transparent);
        this.highlightStrike(this.eth, this.put, this.transparent);
      },
      setTimeArray: function () {
        this.aTimeAxis = [];
        var time = this.para.chart.startChart;
        while (time <= this.para.chart.endChart) {
          this.aTimeAxis.push(time);
          time = time + this.para.chart.interval;
        }
      },
      setBarClock: function () {
        var time = new Date(this.para.chart.startCandle).toTimeString();
        var hour = this.formatHours(time.slice(0, 2));
        var min = this.addLeadingZero(time.slice(3, 5));
        var clock = hour + " : " + min;
        this.getView().byId("idBarClockObjectStatus").setText(clock);
      },
      addLeadingZero: function (num) {
        var value = Number(num);
        return value < 10 ? "0" + value : value;
      },
      onFullscreen: function () {
        if (document.fullscreen == false) {
          document.documentElement.requestFullscreen();
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
        }
      },
      onInput1Button: function (oEvent) {
        let id = oEvent.getSource().getId();
        if (id !== undefined) {
          this.screen.input1 = id.split("--")[2];
        }
        this.updateModel("ScreenModel", this.screen);
      },
      onInput2Button: function (oEvent) {
        let id = oEvent.getSource().getId();
        if (id !== undefined) {
          this.screen.input2 = id.split("--")[2];
        }
        this.updateModel("ScreenModel", this.screen);
      },
      updateServerPara: async function (key, value) {
        const data = {};
        data[key] = value;

        const options = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        };

        var url = this.apiPath + `/para`;

        var that = this;

        await fetch(url, options)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Updating Server Parameter`);
            }
            return response.json();
          })
          .then((result) => {
            if (result == undefined) {
              throw new Error("No Responce from Server");
            }
            if (result.status == that.error) {
              throw new Error("Server Error");
            } else {
              if (result.status == this.success) {
                that.para = result.data;

                // Update Para Model
                that.updateModel("ParaModel", this.para);
                MessageToast.show("Server ==> " + key);

                // that.updateParaPlotlines(key);
                // Upadate PlotLines
                if (
                  key == "buyDelta" ||
                  key == "supportDelta" ||
                  key == "track" ||
                  key == "buy" ||
                  key == "sellBoth"
                ) {
                  this.displayChartLines();
                  this.displayBarLines();
                  // Reset Track Gap Watch
                  if (key == "track" && this.para.track.flag == false) {
                    this.getView().byId("idTrackTimeGap").setText("");
                  }
                }

                // Refresh Chart
                if (key == "timeframe") {
                  this.setZoomPara();
                  this.setTimeArray();
                  if (this.para?.chart?.category == this.option) {
                    this.displayOptionChart();
                  } else if (this.para?.chart?.category == this.market) {
                    this.displayMarketChart();
                  }
                }

                // Restart Process
                if (key == "expiry" || key == "strikeGap") {
                  that.displayDefaultChart();
                }
              } else {
                this.setMessage(this.error, "Server Para not Found", this.P3);
              }
            }
          })
          .catch((error) => {
            that.setMessage(that.error, error.message, this.P1);
          });
      },
      updateParaPlotlines: function (key) {
        switch (key) {
          case "buyDelta":
            this.displayChartBuyDeltaLines();
            break;

          case "supportDelta":
            break;
          case "track":
            this.displayTrackTime();

            break;

          case "buy":
            break;

          case "sellBoth":
            break;
        }
      },
      checkServerConn: function () {
        var url = this.apiPath + "/";
        var that = this;

        return new Promise(function (resolve, reject) {
          fetch(url)
            .then((response) => {
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              return response.json();
            })
            .then((data) => {
              if (data.type == that.message) {
                that.displayHeaderMessage(
                  data.status,
                  that.getTimeString() + " - " + data.message,
                );
              }

              resolve(true);
            })
            .catch((error) => {
              var para = {
                barType: that.market,
              };
              that.updateModel("ParaModel", para);
              reject("Server is OFF");
            });
        });
      },
      convertSecondsToText: function (Seconds) {
        return new Date(Seconds).toTimeString().slice(0, 5);
      },
      updateMarketLtp: function () {
        if (this.marketTicker == undefined) {
          return 0;
        } else {
          return this.marketTicker.close;
        }
      },
      updateCallLtp: function () {
        var ltp = 0,
          per = 0,
          color = "white";
        if (this.callTicker == undefined) {
          return 0;
        }
        if (this.callTicker.hasOwnProperty("close")) {
          ltp = this.callTicker.close;
          per = this.callTicker.per;
          if (per >= 0) {
            color = this.ltpGreen;
          } else {
            color = this.ltpRed;
          }
        }
        return `${ltp}<br> <p style="color:` + color + `;">${per} %</p>`;
      },
      updatePutLtp: function () {
        var ltp = 0,
          per = 0,
          color = "white";
        if (this.putTicker == undefined) {
          return 0;
        }
        if (this.putTicker.hasOwnProperty("close")) {
          ltp = this.putTicker.close;
          per = this.putTicker.per;
          if (per >= 0) {
            color = this.ltpGreen;
          } else {
            color = this.ltpRed;
          }
        }
        return `${ltp}<br> <p style="color:` + color + `;">${per} %</p>`;
      },
      updateDeltaLtp: function () {
        let highDeltaPer = this.deltaTicker?.high ?? 0;
        let lowDeltaPer = this.deltaTicker?.low ?? 0;
        let delta = this.deltaTicker?.close ?? 0;

        var highLine =
          `<p style="color:` + this.ltpGreen + `;">${highDeltaPer} %</p><br>`;
        var ltpLine = `${delta} <br>`;
        var lowLine =
          `<p style="color:` + this.ltpRed + `;">${lowDeltaPer} %</p><br>`;

        return highLine + ltpLine + lowLine;
      },
      updateMarketOiLtp: function () {
        if (this.marketTicker?.oi === undefined) {
          return;
        }

        let oiFromHighPer =
          this.getPercentage(this.marketOiHigh, this.marketTicker.oi) ?? 0;
        let oiFromLowPer =
          this.getPercentage(this.marketOiLow, this.marketTicker.oi) ?? 0;
        let marketOi = this.marketTicker.oi ?? 0;

        var highLine =
          `<p style="color:` + this.ltpRed + `;">${oiFromHighPer} %</p><br>`;
        var ltpLine = `${marketOi} <br>`;
        var lowLine =
          `<p style="color:` + this.ltpGreen + `;">${oiFromLowPer} %</p><br>`;

        return highLine + ltpLine + lowLine;
        // this.marketOiHigh
      },
      getTimeString: function () {
        const [date, time, period] = new Date().toLocaleString().split(" ");
        const [hour, minute, sec] = time.split(":");
        let formattedHour = parseInt(hour);
        return `${formattedHour}:${minute} ${period}`;
      },
      displayHeaderMessage: function (Type, Message) {
        this.aHeaderMsg.push({
          msg: Message,
          type: this.getHeaderMsgType(Type),
        });
        this.lastHeaderMsg = this.getCurrentTime();

        // If Single Message, Show Time
        if (this.aHeaderMsg.length == 1) {
          this.getView().byId("idMessageButton").setText(Message);
          this.getView()
            .byId("idMessageButton")
            .setType(this.getHeaderMsgType(Type));
        } else {
          this.addHeaderMsg();
          // Show All Message Based on Message Setting
          if (
            this.screen.msgSetting == this.expand ||
            (this.screen.msgSetting == this.auto &&
              (Type == this.error || Type == this.reject))
          ) {
            this.openHeaderMsgPopup();
          }
        }
      },
      onProfitTrailFlag: function () {
        this.para.profitTrail.flag = !this.para.profitTrail.flag;
        this.updateServerPara("profitTrail", this.para.profitTrail);
      },
      onProfitTrail: function (oEvent) {
        this.para.profitTrail.per = oEvent.getSource().getValue();
        this.updateServerPara("profitTrail", this.para.profitTrail);
      },
      onLossTrailFlag: function () {
        this.para.lossTrail.flag = !this.para.lossTrail.flag;
        this.updateServerPara("lossTrail", this.para.lossTrail);
      },
      onLossTrail: function (oEvent) {
        this.para.lossTrail.per = oEvent.getSource().getValue();
        this.updateServerPara("lossTrail", this.para.lossTrail);
      },
      onProfitTrailPopup: function (oEvent) {
        var oButton = oEvent.getSource();
        var oView = this.getView();
        // Token Popup
        if (!this._ProfitTrailDialog) {
          this._ProfitTrailDialog = Fragment.load({
            id: oView.getId(),
            name: "ns.deltaapphost.fragment.ProfitTrail",
            controller: this,
          }).then(
            function (oDialog) {
              oView.addDependent(oDialog);
              return oDialog;
            }.bind(this),
          );
        }

        var that = this;
        this._ProfitTrailDialog.then(function (oDialog) {
          if (that.para.layout === that.vertical) {
            oDialog.setPlacement(sap.m.PlacementType.Top);
          } else {
            oDialog.setPlacement(sap.m.PlacementType.Bottom);
          }
          oDialog.openBy(oButton);
        });
      },

      onLossTrailPopup: function (oEvent) {
        var oButton = oEvent.getSource();
        var oView = this.getView();
        // Token Popup
        if (!this._LossTrailDialog) {
          this._LossTrailDialog = Fragment.load({
            id: oView.getId(),
            name: "ns.deltaapphost.fragment.LossTrail",
            controller: this,
          }).then(
            function (oDialog) {
              oView.addDependent(oDialog);
              return oDialog;
            }.bind(this),
          );
        }

        var that = this;
        this._LossTrailDialog.then(function (oDialog) {
          if (that.para.layout === that.vertical) {
            oDialog.setPlacement(sap.m.PlacementType.Top);
          } else {
            oDialog.setPlacement(sap.m.PlacementType.Bottom);
          }
          oDialog.openBy(oButton);
        });
      },
      onClockSettingPopup: function (oEvent) {
        var oButton = oEvent.getSource();
        this.byId("clockSetting").openBy(oButton);
      },
      onClockSetting: function (oEvent) {
        this.screen.clockType = oEvent.getSource().getText();
        this.updateModel("ScreenModel", this.screen);
        this.getView()
          .byId("idStopwatchButton")
          .setIcon(oEvent.getSource().getIcon());
      },
      onHeaderMsgSetting: function (oEvent) {
        this.screen.msgSetting = oEvent.getSource().getText();
        this.updateModel("ScreenModel", this.screen);
        this.getView()
          .byId("idHeaderMsgSettingButton")
          .setIcon(oEvent.getSource().getIcon());
      },
      onVolumeTrackPopup: function (oEvent) {
        var oButton = oEvent.getSource();
        this.byId("volumeTrackAction").openBy(oButton);
      },
      onVolumeTrackAction: function (oEvent) {
        this.para.volume.action = oEvent.getSource().getText();
        this.updateServerPara("volume", this.para.volume);
      },
      onBuyDeltaDirectionPopup: function (oEvent) {
        var oButton = oEvent.getSource();
        this.byId("buyDeltaDirection").openBy(oButton);
      },
      // onVolumeAction: function (oEvent) {
      //   this.para.volume.action = oEvent.getSource().getText();
      //   this.updateModel("ParaModel", this.para);
      // },
      onBuyDeltaDirection: function (oEvent) {
        let type = oEvent.getSource().getText();
        if (this.para.buyDelta.flag == true && type == this.none) {
          this.displayHeaderMessage(
            this.error,
            "BuyDelta is active, cannot delete direction",
          );
          return;
        }

        this.para.buyDelta.type = oEvent.getSource().getText();
        this.updateServerPara("buyDelta", this.para.buyDelta);
      },
      onOiTrackPopup: function (oEvent) {
        var oButton = oEvent.getSource();
        this.byId("oiTrackAction").openBy(oButton);
      },
      onOiTrackAction: function (oEvent) {
        this.para.oi.action = oEvent.getSource().getText();
        this.updateServerPara("oi", this.para.oi);
      },
      onHeaderMsgSettingPopup: function (oEvent) {
        var oButton = oEvent.getSource();
        this.byId("msgSetting").openBy(oButton);
      },
      openHeaderMsgPopup: function () {
        let isOPen = this.byId("headerMessages").isOpen();
        if (isOPen) {
          this.byId("headerMessages").close();
        } else {
          var oButton = this.getView().byId("idMessageButton");
          this.byId("headerMessages").openBy(oButton);
        }
      },
      addHeaderMsg: function () {
        var message =
          this.getTimeString() +
          " - " +
          this.aHeaderMsg.length +
          " New Messages";
        this.getView().byId("idMessageButton").setText(message);
        var errorType = this.aHeaderMsg.some(
          (item) => item.type == this.reject,
        );
        var msgType =
          errorType == true
            ? this.error
            : this.aHeaderMsg[this.aHeaderMsg.length - 1].type;
        this.getView()
          .byId("idMessageButton")
          .setType(this.getHeaderMsgType(msgType));

        var oActionSheet = this.getView().byId("headerMessages");

        if (this.aHeaderMsg.length == 2) {
          var row = this.aHeaderMsg[0];
          oActionSheet.addButton(
            new sap.m.Button({
              text: row.msg,
              type: row.type,
              icon: this.getMsgIcon(row.type),
              // pressed: row.type == this.neutral ? true : false,
              width: "400px",
            }),
          );
        }

        var row = this.aHeaderMsg[this.aHeaderMsg.length - 1];
        oActionSheet.addButton(
          new sap.m.ToggleButton({
            text: row.msg,
            type: row.type,
            icon: this.getMsgIcon(row.type),
            pressed: row.type == this.neutral ? true : false,
            width: "400px",
          }),
        );
      },
      getCurrentTime: function () {
        var date = new Date().getTime();
        return date;
      },
      getHeaderMsgType: function (Type) {
        switch (Type) {
          case this.accept:
          case this.success:
            return this.accept;
          case this.reject:
          case this.error:
            return this.reject;
          case this.info:
          case this.emphasized:
            return this.neutral;
          case this.warning:
            return this.critical;
          default:
            return this.default;
        }
      },
      onEmailNotification: function () {
        this.para.notify.email = !this.para.notify.email;
        this.updateServerPara("notify", this.para.notify);
      },
      onWhatsappNotification: function () {
        MessageToast.show("Whatsapp Function not Active");
        // this.para.notify.whatsapp = !this.para.notify.whatsapp;
        // this.updateServerPara("notify", this.para.notify);
      },
      onFirebaseNotification: function () {
        MessageToast.show("Firebase Function not Active");
        // this.para.notify.firebase = !this.para.notify.firebase;
        // this.updateServerPara("notify", this.para.notify);
      },
      onResetParaLog: function () {
        this.confirmPopup("Delete Para Log")
          .then((result) => {
            this.serverAction("ResetParaLog", true);
          })
          .catch((err) => {
            MessageToast.show("Action Cancelled");
          });
      },
      onResetTrackLog: function () {
        this.confirmPopup("Delete Track Log")
          .then((result) => {
            this.serverAction("ResetTrackLog", true);
          })
          .catch((err) => {
            MessageToast.show("Action Cancelled");
          });
        // this.serverAction("ResetTrackLog", true);
      },
      onResetBuyLog: function () {
        this.confirmPopup("Delete Buy Log")
          .then((result) => {
            this.serverAction("ResetBuyLog", true);
          })
          .catch((err) => {
            MessageToast.show("Action Cancelled");
          });
        // this.serverAction("ResetBuyLog", true);
      },
      onToogleBusyFlag: function () {},
      restartServer: async function (using) {
        switch (using) {
          case this.log:
            this.serverAction("RestartUsingLog", true);
            break;
          case this.serverPara:
            this.serverAction("RestartUsingPara", true);
            break;
          case this.database:
            this.serverAction("RestartUsingDatabase", true);
            break;
          default:
            break;
        }
        // this.initController();
        location.reload();
      },
      onResetServerUsingLog: function () {
        this.confirmPopup("Reset Server -> Log Para")
          .then((result) => {
            this.restartServer(this.log);
          })
          .catch((err) => {
            MessageToast.show("Action Cancelled");
          });
      },
      onResetServerUsingPara: function () {
        this.confirmPopup("Reset Server -> Model Para")
          .then((result) => {
            this.restartServer(this.serverPara);
          })
          .catch((err) => {
            MessageToast.show("Action Cancelled");
          });
      },
      onResetServerUsingDatabase: function () {
        this.confirmPopup("Reset Server -> DB Para")
          .then((result) => {
            this.restartServer(this.database);
          })
          .catch((err) => {
            MessageToast.show("Action Cancelled");
          });
      },
      updateModel: function (ModelName, Data) {
        var oModel;

        oModel = this.getView().getModel(ModelName);
        if (oModel == undefined) {
          oModel = new JSONModel(Data);
          this.getView().setModel(oModel, ModelName);
        } else {
          oModel.setData(Data);
        }
      },
      initCharts: function () {
        this.initStockChart();
        this.initBarChart();

        if (sap.ui.getCore().layout === "Horizontal") {
          this.stockChart = $("#StockChart").highcharts();
          this.barChart = $("#BarChart").highcharts();
          // this.stockChart.setSize(1380, 1030, false);
        } else {
          this.stockChart = $("#StockChartV").highcharts();
          this.barChart = $("#BarChartV").highcharts();
          // this.stockChart.setSize(1070, 1300, false);
        }
      },
      convertDateToText: function (Expiry) {
        var month = Expiry.getMonth();
        var date = Expiry.getDate();
        var monthText = this.aMonth[month];
        return date + " " + monthText;
      },
      initModels: function () {
        this.initScreenModel();
        this.initPnlModel();
        this.initTitleModel();
        this.initTimeframeModel();
        this.initExpiryModel();
        this.initTrnModel();
        this.initBacktestModel();
      },
      initTrnModel: function () {
        this.aTrn = [];
        var oModel = new sap.ui.model.json.JSONModel(this.aTrn);
        this.getView().setModel(oModel, "TrnModel");
      },
      initExpiryModel: function () {
        this.aExpiry = [];
        var now = new Date();

        var expiry = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          17,
          30,
          0,
          0,
        ); // 5:30:00 PM
        // Next Date
        if (now.getTime() > expiry.getTime()) {
          expiry.setDate(expiry.getDate() + 1);
        }

        // 1st Expiry
        var date = {
          key: expiry.getTime(),
          text: this.convertDateToText(expiry),
        };
        this.aExpiry.push(date);

        // 2nd Expiry
        expiry.setDate(expiry.getDate() + 1);
        var date = {
          key: expiry.getTime(),
          text: this.convertDateToText(expiry),
        };
        this.aExpiry.push(date);

        // 3rd Expiry
        expiry.setDate(expiry.getDate() + 1);
        var date = {
          key: expiry.getTime(),
          text: this.convertDateToText(expiry),
        };
        this.aExpiry.push(date);

        var oModel = new sap.ui.model.json.JSONModel(this.aExpiry);
        this.getView().setModel(oModel, "ExpiryModel");
      },
      convertTimeFormat: function (Time) {
        var hrs;
        var aTime = Time.split(":");
        if (aTime[0] > 12) {
          hrs = aTime[0] - 12;
        } else {
          hrs = aTime[0];
        }
        return hrs + ":" + aTime[1];
      },
      initTimeframeModel: function () {
        this.aTimeframe = [
          {
            id: "5m",
            key: "5m",
            text: "5 Min",
            section: false,
          },
          {
            id: "15m",
            key: "15m",
            text: "15 Min",
            section: false,
          },
          {
            id: "30m",
            key: "30m",
            text: "30 Min",
            section: false,
          },
          {
            id: "1h",
            key: "1h",
            text: "1 Hour",
            section: true,
          },
          {
            id: "2h",
            key: "2h",
            text: "2 hours",
            section: false,
          },
          {
            id: "4h",
            key: "4h",
            text: "4 hours",
            section: false,
          },
          {
            id: "6h",
            key: "6h",
            text: "6 hours",
            section: false,
          },
          {
            id: "12h",
            key: "12h",
            text: "12 hours",
            section: false,
          },
        ];

        var oModel = new sap.ui.model.json.JSONModel(this.aTimeframe);
        this.getView().setModel(oModel, "TimeframeModel");
      },
      initPnlModel: function () {
        let pnl = {
          flag: false,
          mode: this.none,
          display: false,
          type: this.none,
          direction: this.none,
          pnl: 0,
          supportFlag: false,
          support: 0,
          supportPer: 0,
          slippage: 0,
          slippagePer: 0,
          addonCount: 0,
          addonPer: 0,
          reverse: 0,
          call: {
            flag: false,
            category: this.none,
            buy: 0,
            ltp: 0,
            pnl: 0,
            usd: 0,
          },
          put: {
            flag: false,
            category: this.none,
            buy: 0,
            ltp: 0,
            pnl: 0,
            usd: 0,
          },
          addon: {
            flag: false,
            category: this.none,
            buy: 0,
            ltp: 0,
            pnl: 0,
            usd: 0,
            count: 0,
            gap: 0,
          },
        };

        var oModel = new JSONModel(pnl);
        this.getView().setModel(oModel, "PnlModel");
      },
      initTitleModel: function () {
        var title = {
          index: "",
          name: "",
          callStrike: "",
          putStrike: "",
          expiry: "",
          window: 0,
        };
        var oModel = new JSONModel(title);
        this.getView().setModel(oModel, "TitleModel");
      },
      updateTitleModel: function () {
        var title = {
          index: "",
          name: "",
          callStrike: "",
          putStrike: "",
          expiry: "",
          window: 0,
        };
        var oModel = new JSONModel(title);
        this.getView().setModel(oModel, "TitleModel");
      },
      initBacktestModel: function () {
        this.backtestModel = {
          flag: false,
          inc: 10,
          callSymbol: 0,
          putSymbol: 0,
          callLtp: 0,
          putLtp: 0,
        };

        var oModel = new JSONModel(this.backtestModel);
        this.getView().setModel(oModel, "BacktestModel");
      },
      onShowSlippage: function () {
        this.screen.dispSlp = !this.screen.dispSlp;
        this.updateModel("ScreenModel", this.screen);
      },
      initScreenModel: function () {
        this.screen = {
          msgSetting: this.auto,
          clockType: this.stopwatch,
          headerLeft: this.display,
          headerMiddle: this.message,
          headerRight: this.zoom,
          inputType: true,
          pnlSupport: true,
          actionType: true,
          boxType: this.buy,
          lastPrice: true,
          buyLine: false,
          layout: this.none,
          chartLayout: this.none,
          addonPnl: this.addon,
          input1: "idBuyInputButton",
          input2: "idActionInputButton",
          dispSlp: false,
        };

        var oModel = new JSONModel(this.screen);
        this.getView().setModel(oModel, "ScreenModel");
      },
      onAskGapType: function () {
        if (this.askGapType == this.put) {
          this.askGapType = this.call;
          this.getView().byId("idaskGapIcon").setSrc("sap-icon://trend-up");
          this.getView().byId("idaskGapIcon").setColor(this.green);
        } else {
          this.askGapType = this.put;
          this.getView().byId("idaskGapIcon").setSrc("sap-icon://trend-down");
          this.getView().byId("idaskGapIcon").setColor(this.red);
        }
      },
      setMessage: function (Type, Message, priority) {
        let time = this.getTimeString();
        Message = time + " - " + Message;
        // var aTime = new Date().toTimeString().split(":");
        // var time = this.formatHours(aTime[0]) + ":" + aTime[1];
        this.displayMessage(Type, Message, priority);

        if (Type == this.error) {
          this.errorBeepAlert();
        } else {
          this.infoBeepAlert();
        }
      },
      infoBeepAlert: function () {
        // https://jsfiddle.net/ourcodeworld/7v3p4Le6/10/ --> Beep Sound
        // Set default duration if not provided
        var duration = duration || 200;
        var frequency = frequency || 2000;
        var volume = volume || 100;

        var myAudioContext = new AudioContext();
        var oscillatorNode = myAudioContext.createOscillator();
        var gainNode = myAudioContext.createGain();
        oscillatorNode.connect(gainNode);

        // Set the oscillator frequency in hertz
        oscillatorNode.frequency.value = frequency;

        // Set the type of oscillator
        oscillatorNode.type = "square";
        gainNode.connect(myAudioContext.destination);

        // Set the gain to the volume
        gainNode.gain.value = volume * 0.01;

        // Start audio with the desired duration
        oscillatorNode.start(myAudioContext.currentTime);
        oscillatorNode.stop(myAudioContext.currentTime + duration * 0.001);

        // Resolve the promise when the sound is coin1ished
        oscillatorNode.onended = () => {
          // resolve();
        };
      },
      errorBeepAlert: function () {
        // https://jsfiddle.net/ourcodeworld/7v3p4Le6/10/ --> Beep Sound
        // Set default duration if not provided
        var duration = duration || 500;
        var frequency = frequency || 100;
        var volume = volume || 100;

        var myAudioContext = new AudioContext();
        var oscillatorNode = myAudioContext.createOscillator();
        var gainNode = myAudioContext.createGain();
        oscillatorNode.connect(gainNode);

        // Set the oscillator frequency in hertz
        oscillatorNode.frequency.value = frequency;

        // Set the type of oscillator
        oscillatorNode.type = "square";
        gainNode.connect(myAudioContext.destination);

        // Set the gain to the volume
        gainNode.gain.value = volume * 0.01;

        // Start audio with the desired duration
        oscillatorNode.start(myAudioContext.currentTime);
        oscillatorNode.stop(myAudioContext.currentTime + duration * 0.001);

        // Resolve the promise when the sound is coin1ished
        oscillatorNode.onended = () => {
          // resolve();
        };
      },
      onHeaderLeft: function (oEvent) {
        this.screen.headerLeft = oEvent.getSource().getText();
        this.updateModel("ScreenModel", this.screen);
      },

      onHeaderCenter: function (oEvent) {
        this.screen.headerMiddle = oEvent.getSource().getText();
        this.updateModel("ScreenModel", this.screen);
      },
      onHeaderRight: function (oEvent) {
        this.screen.headerRight = oEvent.getSource().getText();
        this.updateModel("ScreenModel", this.screen);
      },
      formatHours: function (Hours) {
        if (Hours > 12) {
          Hours = Hours - 12;
        }

        return Hours;
      },
      displayMessage: function (Type, Message, Priority) {
        this.displayHeaderMessage(Type, Message);
        this.setPopoverMessage(Type, Message, Priority);
        // this.playTone();
      },
      setPopoverMessage: function (Type, Message, Priority) {
        this.aAllMsg.unshift({
          type: Type,
          message: Message,
          priority: Priority,
        });

        var oModel = new JSONModel(this.aAllMsg);
        // oMessagePopover.setModel(oModel, "MessageModel");
        this.getView().setModel(oModel, "MessageModel");

        this.popupMsgCount = this.popupMsgCount + 1;
        this.updatePopupMsgButton(Type);
      },
      onBarMessageFilter: function () {
        let aMsg = [];
        let priority = this.getView()
          .byId("idBarMessagePriority")
          .getSelectedKey();

        let type = this.getView().byId("idBarMessageType").getSelectedKey();

        if (priority === this.all && type === this.all) {
          aMsg = this.aAllMsg;
        } else {
          if (priority === this.all) {
            aMsg = this.aAllMsg.filter((item) => item.type === type);
          } else if (type === this.all) {
            aMsg = this.aAllMsg.filter((item) => item.priority === priority);
          } else {
            aMsg = this.aAllMsg.filter(
              (item) => item.priority === priority && item.type === type,
            );
          }
        }

        var oModel = new JSONModel(aMsg);
        this.getView().setModel(oModel, "MessageModel");

        this.getView()
          .byId("idBarMessageCountGenericTag")
          .setText("Count : " + aMsg.length);
      },

      onBarMessagePriorityFilter: function (oEvent) {
        let aMsg = [];
        let priority = oEvent.getSource().getKey();

        let type = this.getView().byId("idBarMessageType").getSelectedKey();

        if (priority === this.all && type === this.all) {
          aMsg = this.aAllMsg;
        } else {
          if (priority === this.all) {
            aMsg = this.aAllMsg.filter((item) => item.type === type);
          } else if (type === this.all) {
            aMsg = this.aAllMsg.filter((item) => item.priority === priority);
          } else {
            aMsg = this.aAllMsg.filter(
              (item) => item.priority === priority && item.type === type,
            );
          }
        }

        var oModel = new JSONModel(aMsg);
        this.getView().setModel(oModel, "MessageModel");

        this.getView()
          .byId("idBarMessageCountGenericTag")
          .setText("Count : " + aMsg.length);
      },
      onBarMessageTypeFilter: function (oEvent) {
        let aMsg = [];

        let type = oEvent.getSource().getKey();

        let priority = this.getView()
          .byId("idBarMessagePriority")
          .getSelectedKey();

        if (priority === this.all && type === this.all) {
          aMsg = this.aAllMsg;
        } else {
          if (priority === this.all) {
            aMsg = this.aAllMsg.filter((item) => item.type === type);
          } else if (type === this.all) {
            aMsg = this.aAllMsg.filter((item) => item.priority === priority);
          } else {
            aMsg = this.aAllMsg.filter(
              (item) => item.priority === priority && item.type === type,
            );
          }
        }

        var oModel = new JSONModel(aMsg);
        this.getView().setModel(oModel, "MessageModel");

        this.getView()
          .byId("idBarMessageCountGenericTag")
          .setText("Count : " + aMsg.length);
      },
      updatePopupMsgButton: function (Type) {
        var type = this.transparent;
        // Count
        this.getView()
          .byId("idMessagePopoverButton")
          .setText(this.popupMsgCount);

        if (this.popupMsgCount > 0) {
          // Type
          switch (Type) {
            case this.success:
              type = this.accept;
              break;
            case this.error:
              type = this.reject;
              break;
            case this.info:
              type = this.emphasized;
              break;
            default:
              type = this.transparent;
              break;
          }
        }
        this.getView().byId("idMessagePopoverButton").setType(type);
      },
      onZoom1: function () {
        this.zoomType = this.zoom1;
        var to = this.para.chart.startCandle;
        var gap = this.para.chart.interval * 8;
        var from = to - gap;
        this.setChart(from, to);
      },
      onZoom2: function () {
        this.zoomType = this.zoom2;
        var to = this.para.chart.startCandle;
        var gap = this.para.chart.interval * 16;
        var from = to - gap;
        this.setChart(from, to);
      },
      onZoom3: function () {
        this.zoomType = this.zoom3;
        var to = this.para.chart.startCandle;
        var gap = this.para.chart.interval * 24;
        var from = to - gap;
        this.setChart(from, to);
      },
      onZoomAll: function () {
        this.zoomType = this.zoomAll;
        var to = this.para.chart.startCandle;
        var from = this.aTimeAxis[0];
        this.setChart(from, to);
      },
      setChart: function (From, To) {
        this.stockChart.xAxis[0].max = To;
        this.stockChart.xAxis[0].setExtremes(From, To, true, true);
      },
      updateStopwatch: function () {
        switch (this.screen.clockType) {
          case this.stopwatch:
            var timeText = this.getStopwatchTime(
              this.para.chart.endCandle - this.getCurrentTime(),
            );
            this.getView().byId("idStopwatchButton").setText(String(timeText));

            let aWatch = timeText.split(":");
            if (aWatch[0] < 0 || aWatch[1] < 0) {
              this.getView().byId("idStopwatchButton").setType(this.reject);
            } else if (aWatch[0] < 1) {
              this.getView().byId("idStopwatchButton").setType(this.emphasized);
            } else {
              this.getView().byId("idStopwatchButton").setType(this.default);
            }
            break;
          case this.clock:
            this.getView()
              .byId("idStopwatchButton")
              .setText(this.getTimeString());
            break;
          case this.buy:
            let buyClock = this.getbuyTime();
            this.getView().byId("idStopwatchButton").setText(buyClock);
            break;
        }
      },
      updateTrackTimeGap: function () {
        if (this.para.track.flag == true && this.para.track.time > 0) {
          let gap = this.getCurrentTime() - this.para.track.time;
          let time = this.convertSecondsForClock(gap);
          this.getView().byId("idTrackTimeGap").setText(time);
        }
      },
      getbuyTime: function () {
        let time = "0";
        if (
          this.buyInfo?.flag == true &&
          this.buyInfo?.timestamp !== undefined
        ) {
          let gap = this.getCurrentTime() - this.buyInfo?.timestamp;
          if (gap > 0) {
            time = this.convertSecondsForClock(gap);
          }
        }
        return time;
      },
      getStopwatchTime: function (totalmiliSec) {
        var time = "";
        var totalSeconds = Math.round(totalmiliSec / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600; // Remaining seconds after extracting hours
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60; // Remaining seconds after extracting minutes

        // Pad with leading zeros if necessary
        const formattedHours = String(hours); //.padStart(2, "0");
        const formattedMinutes = String(minutes); //.padStart(2, "0");
        const formattedSeconds = String(seconds).padStart(2, "0");

        if (formattedHours > 0) {
          time = `${formattedHours} : ${formattedMinutes} : ${formattedSeconds}`;
        } else {
          time = `${formattedMinutes} : ${formattedSeconds}`;
        }

        return time;
      },
      checkInternetConn: function () {
        var that = this;
        window.addEventListener("online", function () {
          that.setMessage(that.success, "Device is online", this.P1);
          // that.restartApp();
        });

        window.addEventListener("offline", function () {
          that.setMessage(that.error, "Device is offline", this.P1);
        });
      },
      getCallHigh: function (Point) {
        if (Point?.open == undefined || Point?.high == undefined) {
          return 0;
        }
        return this.calcPercentage(Point.open, Point.high);
      },
      getCallLow: function (Point) {
        if (Point?.open == undefined || Point?.high == undefined) {
          return 0;
        }
        return this.calcPercentage(Point.open, Point.low);
      },
      getPutHigh: function (Point) {
        if (Point?.open == undefined || Point?.high == undefined) {
          return 0;
        }
        return this.calcPercentage(Point.open, Point.high);
      },
      getPutLow: function (Point) {
        if (Point?.open == undefined || Point?.high == undefined) {
          return 0;
        }
        return this.calcPercentage(Point.open, Point.low);
      },
      calcPercentage: function (open, close) {
        var per = this.formatDecimal(((close - open) / open) * 100);
        return per;
      },
      onBarType: async function (oEvent) {
        var barType = oEvent.getParameters().item.getText();

        if (barType == this.book && this.para.chart.category == this.market) {
          MessageToast.show("Please Select Option Chart");
          // this.setMessage(this.error, "Please Select Option Chart", this.P3);
          return;
        }

        // Update Server
        this.para.barType = barType;
        await this.updateServerPara("barType", this.para.barType);

        // Set Bar Type
        this.setBarType();
      },
      onBuyChartCallWithSupport: async function () {
        if (this.para.switch == this.none) {
          this.setMessage(this.error, "Inactive Switch", this.P3);
          return;
        }
        if (this.para.chart.category == this.market) {
          this.setMessage(this.error, "Select Option Chart", this.P3);
          return;
        }

        if (this.buyInfo?.flag == true) {
          this.setMessage(this.error, "Active Orders Exists", this.P3);
          return;
        }

        this.confirmPopup("Buy CALL")
          .then((result) => {
            var buyPara = {
              flag: true,
              category: this.option,
              index: this.para.chart.index,
              type: this.call,
              callSymbol: this.para.chart.callSymbol,
              putSymbol: this.para.chart.putSymbol,
            };
            this.serverAction("BuyChart", buyPara);
          })
          .catch((err) => {
            MessageToast.show("Action Cancelled");
          });
      },
      onBuyChartPutWithSupport: function () {
        if (this.para.switch == this.none) {
          this.setMessage(this.error, "Inactive Switch", this.P3);
          return;
        }
        if (this.para.chart.category == this.market) {
          this.setMessage(this.error, "Select Option Chart", this.P3);
          return;
        }

        if (this.buyInfo?.flag == true) {
          this.setMessage(this.error, "Active Orders Exists", this.P3);
          return;
        }

        this.confirmPopup("Buy PUT")
          .then((result) => {
            var buyPara = {
              flag: true,
              category: this.option,
              index: this.para.chart.index,
              type: this.put,
              callSymbol: this.para.chart.callSymbol,
              putSymbol: this.para.chart.putSymbol,
            };
            this.serverAction("BuyChart", buyPara);
          })
          .catch((err) => {
            MessageToast.show("Action Cancelled");
          });
      },
      onChartRefresh: function () {
        if (this.para?.chart?.category == this.option) {
          this.displayOptionChart();
        } else if (this.para?.chart?.category == this.market) {
          this.displayMarketChart();
        }
      },
      onSellBoth: function () {
        if (this.buyInfo?.flag == false || this.buyInfo?.flag == undefined) {
          this.setMessage(this.error, "Active Orders Not Found", this.P2);
          return;
        }

        this.confirmPopup("Sell Both")
          .then((result) => {
            this.serverAction("SellBoth", true);
          })
          .catch((err) => {
            MessageToast.show("Action Cancelled");
          });

        //////////////////////////
        // this.serverAction("SellBoth", true);
      },
      getErrorMsg: function (error) {
        return error.message == undefined ? error : error.message;
      },
      onDataLabel: function () {
        if (this.chartType == this.market) {
          this.marketDataLabelFlag = !this.marketDataLabelFlag;
        } else {
          switch (this.dataLabelFlag) {
            case "00":
              this.dataLabelFlag = "10";
              break;
            case "10":
              this.dataLabelFlag = "01";
              break;
            case "01":
              this.dataLabelFlag = "11";
              break;
            case "11":
              this.dataLabelFlag = "00";
              break;
            default:
              this.dataLabelFlag = "00";
              break;
          }
        }
        this.setDataLabel();
      },
      onReversalFlag: function () {
        this.para.reversal.flag = !this.para.reversal.flag;
        this.updateServerPara("reversal", this.para.reversal);
      },
      onReversal: function (oEvent) {
        this.updateServerPara("reversal", this.para.reversal);
      },
      onSupportFlag: function (oEvent) {
        MessageToast("Support cannot be removed");
        // this.para.support.flag = !this.para.support.flag;
        // this.updateServerPara("support", this.para.support);
      },
      onSupport: function (oEvent) {
        this.updateServerPara("support", this.para.support);
      },
      onReverseButton: function () {
        this.screen.pnlSupport = !this.screen.pnlSupport;
        this.updateModel("ScreenModel", this.screen);
      },
      onSupportDeltaFlag: function (oEvent) {
        this.para.supportDelta.flag = !this.para.supportDelta.flag;
        this.updateServerPara("supportDelta", this.para.supportDelta);
      },
      onAddonFlag: function (oEvent) {
        if (this.para.addon.value <= 0) {
          MessageToast.show("Invalid Addon Count");
          return;
        }
        this.para.addon.flag = !this.para.addon.flag;
        this.updateServerPara("addon", this.para.addon);
      },
      onSupportType: function (oEvent) {
        if (this.para.support.type == this.fixed) {
          this.para.support.type = this.trail;
        } else {
          this.para.support.type = this.fixed;
        }
        this.updateServerPara("support", this.para.support);
      },
      onSupportDeltaType: function (oEvent) {
        if (this.para.supportDelta.type == this.candle) {
          this.para.supportDelta.type = this.buy;
        } else {
          this.para.supportDelta.type = this.candle;
        }
        this.updateServerPara("supportDelta", this.para.supportDelta);
      },
      toggleAddonBar: function () {
        this.showAddonBar = !this.showAddonBar;
        this.displayAddonBar();
      },
      handleAddonBar: function () {
        if (this.buyPnl?.addon?.category === undefined) {
          return;
        }
        if (this.buyPnl.addon.category === this.none) {
          this.showAddonBar = false;
        } else {
          this.showAddonBar = true;
        }
        this.displayAddonBar();
      },
      displayAddonBar() {
        this.getView().byId("idAddonPnlHBox").setVisible(this.showAddonBar);
        this.getView().byId("idBuyAddonHBox").setVisible(this.showAddonBar);
        this.getView().byId("idAddonAmountHBox").setVisible(this.showAddonBar);

        this.getView().byId("idAddonHBox").setVisible(!this.showAddonBar);
        this.getView()
          .byId("idSupportPerPnlHBox")
          .setVisible(!this.showAddonBar);
        this.getView().byId("idSlippagePnlHBox").setVisible(!this.showAddonBar);
      },
      onSupportDeltaCategory: function (oEvent) {
        this.para.supportDelta.category = oEvent.getParameters().item.getText();
        this.updateServerPara("supportDelta", this.para.supportDelta);
      },
      onTrackFlag: function () {
        if (this.para.track.flag == true) {
          this.para.track.time = 0;
          this.para.track.text = "";
        } else {
          if (this.para.track.time == 0) {
            this.setMessage(this.error, "Invalid Track Time", this.P3);
            return;
          }
          if (this.para.track.high == 0) {
            this.setMessage(this.error, "Invalid Track High", this.P3);
            return;
          }
          if (this.para.track.low == 0) {
            this.setMessage(this.error, "Invalid Track Low", this.P3);
            return;
          }
        }

        this.para.track.flag = !this.para.track.flag;
        this.updateServerPara("track", this.para.track);
      },
      onTrackTime: function (oEvent) {
        var text = oEvent.getSource().getValue();
        var time = this.getPastTimeFromText(text);

        if (time > this.para.chart.startCandle) {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
          oEvent
            .getSource()
            .setValueStateText("Time should be before Start Candle");
          return;
        }

        if (time < this.para.chart.startChart) {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
          oEvent
            .getSource()
            .setValueStateText("Time Should be within chart Range");
          return;
        }

        oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
        oEvent.getSource().setValueStateText("");

        this.para.track.text = text;
        this.para.track.time = time;
        // if (this.para.track.high == 0 || this.para.track.low == 0) {
        //   this.para.track.high = Math.round(this.para.factor * 0.7); // 70 %
        //   this.para.track.low = -this.para.factor;
        // }

        this.updateServerPara("track", this.para.track);
      },
      onOpenServer: function () {
        this.openServer = !this.openServer;
        var oView = this.getView();
        // Token Popup
        if (!this._ServerDialog) {
          this._ServerDialog = Fragment.load({
            id: oView.getId(),
            name: "ns.deltaapphost.fragment.Server",
            controller: this,
          }).then(
            function (oDialog) {
              oView.addDependent(oDialog);
              oDialog.attachAfterOpen(
                function () {
                  this.serverAction("ServerStart", true);
                }.bind(this),
              );
              return oDialog;
            }.bind(this),
          );
        }

        var that = this;
        this._ServerDialog.then(function (oDialog) {
          oDialog.open();
        });
      },
      onRefreshServer: function () {
        this.serverAction("RefreshServer", true);
      },
      getPastTimeFromText(Text) {
        var time = this.getTimeFromText(Text);
        if (time > this.getCurrentTime()) {
          time = time - this.milisec24Hr; // 86400000;
        }
        return time;
      },
      getTimeFromText: function (Text) {
        var aHour = Text.split(":");
        var hour = aHour[0];
        var min = aHour[1].slice(0, 2);
        var format = aHour[1].slice(3, 5);
        if (format == "PM") {
          if (hour != "12") {
            hour = +hour + 12;
          }
        } else {
          if (hour == "12") {
            hour = 0;
          }
        }
        var date = new Date();
        date.setHours(hour);
        date.setMinutes(min);
        date.setSeconds(0);
        date.setMilliseconds(0);

        return date.getTime();
      },
      setDataLabel: function () {
        // Market Data Label
        if (this.chartType == this.market) {
          //   var dlFlag = this.stockChart.series[0].options.dataLabels[0].enabled;
          //  dlFlag = !dlFlag;
          this.stockChart.series[0].options.dataLabels[0].enabled =
            this.marketDataLabelFlag;

          this.stockChart.series[0].options.dataLabels[1].enabled =
            this.marketDataLabelFlag;
          // Upadte Chart
          this.stockChart.series[0].update();
          return;
        }
        // Option Data Label
        var candleDL = false,
          lineDl = false;
        if (this.dataLabelFlag.substring(0, 1) == 1) {
          candleDL = true;
        }
        if (this.dataLabelFlag.substring(1, 2) == 1) {
          lineDl = true;
        }

        var optionDataLabel = false;
        // Call Chart Data Label
        this.stockChart.series[0].options.dataLabels[0].enabled = candleDL;
        this.stockChart.series[0].options.dataLabels[1].enabled = candleDL;

        // Put Chart Data Label
        this.stockChart.series[1].options.dataLabels[0].enabled = candleDL;
        this.stockChart.series[1].options.dataLabels[1].enabled = candleDL;

        // Delta Chart
        this.stockChart.series[2].options.dataLabels[0].enabled = candleDL;
        this.stockChart.series[2].options.dataLabels[1].enabled = candleDL;

        // Call OI Chart
        this.stockChart.series[3].options.dataLabels[0].enabled = lineDl;

        // Put OI Chart
        this.stockChart.series[4].options.dataLabels[0].enabled = lineDl;

        // Volume Chart
        this.stockChart.series[5].options.dataLabels[0].enabled = lineDl;

        // Upadte Charts
        this.stockChart.series[0].update();
        this.stockChart.series[1].update();
        this.stockChart.series[2].update();
        this.stockChart.series[3].update();
        this.stockChart.series[4].update();
        this.stockChart.series[5].update();
      },
      initMarketChart: function () {
        var that = this;
        const options = {
          chart: {
            // styledMode: true,
            backgroundColor: "#edeff0", //  "#222222", //"#F3F6F4",
            borderWidth: 0,
            // plotBorderColor: "#9E9E9E", //"#12171C",
            plotBorderWidth: 2,
            events: {
              load: function () {},
            },
          },
          exporting: {
            enabled: false,
          },
          stockTools: {
            gui: {
              enabled: true,
              visible: true,
            },
          },
          plotOptions: {
            series: {
              states: {
                inactive: {
                  enabled: false,
                },
              },
            },
            candlestick: {
              color: "#ea3d3d",
              upColor: "#51a958",
              upLineColor: "black",
              lineColor: "black",
            },
          },
          time: {
            useUTC: false,
          },
          scrollbar: { enabled: false },
          title: {
            text: null,
          },
          tooltip: {
            enabled: false,
            backgroundColor: "rgba(3, 11, 1, 0.93)",
            borderColor: "#000",
            borderRadius: 10,
            borderWidth: 3,
            shadow: false,
            useHTML: true,
            split: true,
            shared: true,
            formatter: function () {
              if (that.tooltipFlag == false) {
                return "";
              }
              return [""].concat(
                this.points
                  ? this.points.map(function (point) {
                      if (
                        point.series.name == "VOLUME" ||
                        point.series.name == "CALL_OI" ||
                        point.series.name == "PUT_OI"
                      ) {
                        return "";
                      }
                      if (point.series.name == "DELTA") {
                        return that.getDeltaTooltip(point.options);
                      } else {
                        return that.getOptionTooltip(point.options);
                      }
                    })
                  : [],
              );
            },
          },
          credits: {
            enabled: false,
          },
          xAxis: {
            visible: false,
            enabled: false,
            gridLineColor: "#a0a0a0",
            lineColor: "#7a7a7a",
            lineWidth: 1,
            crosshair: {
              width: 1.2,
              snap: true,
              color: "black",
              dashStyle: "dash",
              label: {
                enabled: true,
                backgroundColor: "#0f8ef1", //"#5a5a5a",
                style: {
                  fontSize: "0.8em",
                },
                formatter: function (Seconds) {
                  var Time = that.convertSecondsToDate(Seconds);
                  Time = Time.toTimeString().substring(0, 5);
                  Time = that.convertTimeFormat(Time);
                  return Time;
                },
              },
            },
            labels: {
              enabled: true,
              style: {
                color: "#000000",
              },
              formatter: function (label) {
                var dataLabel = that.convertSecondsToDate(label.pos);
                var Hours = that.formatHours(dataLabel.getHours());
                var Minutes = that.addLeadingZero(dataLabel.getMinutes());
                return Hours + ":" + Minutes;
              },
            },
          },
          yAxis: [
            {
              title: {
                text: null, //'CALL'
              },
              visible: "true",
              opposite: true,
              lineWidth: 0.2,
              lineColor: "black",
              gridLineWidth: 0.2,
              gridLineColor: "black",
              offset: 0,
              crosshair: {
                width: 1.2,
                zindex: 6,
                snap: false,
                color: "black",
                dashStyle: "dash",
                label: {
                  enabled: true,
                  backgroundColor: "#0f8ef1", //"#5a5a5a",
                  style: {
                    fontSize: "0.8em",
                  },
                  formatter: function (Price) {
                    Price = parseFloat(Price).toFixed(1);
                    return Price;
                  },
                },
              },

              labels: {
                align: "left",
                style: {
                  color: "#000000",
                },
              },
              resize: {
                enabled: true,
                lineWidth: 2,
                lineColor: "black",
              },
            },
            {
              title: {
                text: null, //'Volume'
              },
              offset: 0,
              opposite: false,
              visible: "true",
              lineWidth: 0.2,
              lineColor: "black",
              gridLineWidth: 0.2,
              gridLineColor: "black",
              crosshair: {
                width: 1,
                snap: false,
                color: "black",
                dashStyle: "dot",
                label: {
                  enabled: true,
                  backgroundColor: "#0f8ef1", //"#5a5a5a",
                  style: {
                    fontSize: "0.8em",
                  },
                  formatter: function (Vol) {
                    return parseFloat(Vol).toFixed(1);
                  },
                  // zIndex: 10,
                },
              },
              labels: {
                // distance: 10,
                // padding: 5,
                format: "{value} L",
                align: "right",
                style: {
                  color: "#000000",
                },
              },
              resize: {
                enabled: true,
                lineWidth: 2,
                lineColor: "#7a7a7a",
              },
            },
          ],
          rangeSelector: {
            inputEnabled: false,
            verticalAlign: "top",
            x: 1080,
            y: -35,
          },
          navigator: {
            enabled: false,
            series: {
              color: "#000000",
            },
          },
          series: [
            {
              id: "Market",
              type: "candlestick",
              name: "MARKET",
              // color: "#FF7F7F",
              // upColor: "#D0F0C0",
              yAxis: 0,
              dataLabels: [
                {
                  enabled: false,
                  align: "right",
                  // @ts-ignore
                  formatter: function (Point) {
                    var callHigh = that.getCallHigh(this.point);
                    return callHigh;
                  },
                },
                {
                  enabled: false,
                  align: "left",
                  // @ts-ignore
                  formatter: function () {
                    var callLow = that.getCallLow(this.point);
                    return callLow;
                  },
                },
              ],
              lastVisiblePrice: {
                enabled: true,
                label: {
                  enabled: true,
                  formatter: function () {
                    var ltp = 0;
                    if (that.para.chart.category == that.market) {
                      ltp = that.updateMarketLtp();
                    } else {
                      ltp = that.updateCallLtp();
                    }
                    return ltp;
                  },
                  align: "left",
                  x: 10,
                  backgroundColor: "black", //"#00b300",
                  style: {
                    fontSize: "1em",
                  },
                },
              },
              lastPrice: {
                enabled: true,
                width: 1,
                dashStyle: "LongDash",
                color: "#880808",
                lable: {
                  enabled: true,
                  backgroundColor: "#00b300",
                  style: {
                    fontSize: "1em",
                  },
                },
              },
            },
            {
              id: "Market_vol",
              name: "MARKET_VOL",
              type: "line",
              color: "#6495ED", //"#6c3483",
              yAxis: 1,
              dataLabels: [
                {
                  enabled: false,
                  // @ts-ignore
                  formatter: function (Point) {
                    var delta = that.getDeltaLabel(Point);
                    return delta;
                  },
                },
              ],
              lastVisiblePrice: {
                enabled: false,
                gridLineWidth: 0,
                gridLineColor: "#a0a0a0",
                lineColor: "#7a7a7a",
                label: {
                  enabled: true,
                  formatter: function () {
                    var series = this.series[0],
                      // @ts-ignore
                      lastPoint = series.points[series.points.length - 1];
                    var ltp = that.getVolumeLastPrice(series.points);
                    return ltp;
                  },
                  align: "left",
                  x: 10,
                  backgroundColor: "#7A7A7A",
                  style: {
                    fontSize: "1em",
                  },
                },
              },
              lastPrice: {
                enabled: false,
                width: 1,
                dashStyle: "LongDash",
                color: "#7A7A7A",
                lable: {
                  enabled: true,
                  backgroundColor: "#7A7A7A",
                  style: {
                    fontSize: "1em",
                  },
                },
              },
            },
          ],
        };

        highcharts.stockChart("MarketChart", options);
      },
      displayChartLtp: function () {
        this.screen.lastPrice = !this.screen.lastPrice;
        this.stockChart.update({
          series: [
            {
              id: "Call",
              lastVisiblePrice: {
                enabled: this.screen.lastPrice,
              },
            },
            {
              id: "Put",
              lastVisiblePrice: {
                enabled: this.screen.lastPrice,
              },
            },
            {
              id: "Delta",
              lastVisiblePrice: {
                enabled: this.screen.lastPrice,
              },
            },
            {
              id: "Call_Oi",
              lastVisiblePrice: {
                enabled: this.screen.lastPrice,
              },
            },
            {
              id: "Put_Oi",
              lastVisiblePrice: {
                enabled: this.screen.lastPrice,
              },
            },
            {
              id: "Volume",
              lastVisiblePrice: {
                enabled: this.screen.lastPrice,
              },
            },
          ],
        });
      },
      displayBuyLine: function () {
        this.screen.buyLine = !this.screen.buyLine;
        if (!this.screen.buyLine) {
          this.updatePlotLine("CALL_BUY", 0, 0, 0);
          this.updatePlotLine("PUT_BUY", 0, 0, 0);
        }
      },
      onHorizontalLayout: async function () {
        this.para.layout = this.horizontal;
        this.para.chartLayout = this.horizontalHalf;
        await this.updateServerPara("layout", this.horizontal);
        await this.updateServerPara("chartLayout", this.horizontalHalf);
        // window.open(window.location.href, "_blank");
        // this.stockChart.destroy();
        // this.barChart.destroy();
        location.reload();
        // this.stockChart.setSize(1200, 1300);
        // var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        // oRouter.navTo("Horizontal", {});
      },
      onVerticalLayout: async function () {
        this.para.layout = this.vertical;
        this.para.chartLayout = this.verticalHalf;
        await this.updateServerPara("layout", this.vertical);
        await this.updateServerPara("chartLayout", this.verticalHalf);
        // window.open(window.location.href, "_blank");
        // this.stockChart.destroy();
        // this.barChart.destroy();
        location.reload();
        // this.stockChart.setSize(1200, 1300);
        // var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        // oRouter.navTo("Vertical", {});
      },
      // setHorizontalLayout: function () {
      //   this.stockChart.setSize(1200, 1300);
      // },
      // setVerticalLayout: function () {
      //   this.stockChart.setSize(1200, 1300);
      // },
      onVolumeTypeMarket: function () {
        this.optionVolType = this.market;
      },
      onVolumeTypeOption: function () {
        this.optionVolType = this.option;
      },
      onAddonInfo: function () {
        this.showAddonBar = !this.showAddonBar;
        this.displayAddonBar();
        // if (this.screen.addonPnl == this.pnl) {
        //   this.screen.addonPnl = this.addon;
        // } else {
        //   this.screen.addonPnl = this.pnl;
        // }
        // this.updateModel("ScreenModel", this.screen);
      },
      onSellReversalFlag: function () {
        if (this.para.sell.reversal.count == 0) {
          this.setMessage(this.error, "Invalid Reversal Count", this.P3);
          return;
        }
        this.para.sell.reversal.flag = !this.para.sell.reversal.flag;
        this.serverAction("Sell", this.para.sell);
      },
      onSellReversalCount: function (oEvent) {
        this.para.sell.reversal.count = oEvent.getSource().getValue();
        this.serverAction("Sell", this.para.sell);
      },
      onSellReversalAction: function () {
        if (this.para.sell.reversal.action === this.alert) {
          this.para.sell.reversal.action = this.sell;
        } else {
          this.para.sell.reversal.action = this.alert;
        }
        this.serverAction("Sell", this.para.sell);
      },
      onSellDeltaFlag: function () {
        if (this.para.sell.delta.count == 0) {
          this.setMessage(this.error, "Invalid Delta Count", this.P3);
          return;
        }
        this.para.sell.delta.flag = !this.para.sell.delta.flag;
        this.serverAction("Sell", this.para.sell);
      },
      onSellDeltaCount: function (oEvent) {
        this.para.sell.delta.count = oEvent.getSource().getValue();
        this.serverAction("Sell", this.para.sell);
      },
      onSellDeltaAction: function () {
        if (this.para.sell.delta.action === this.alert) {
          this.para.sell.delta.action = this.sell;
        } else {
          this.para.sell.delta.action = this.alert;
        }
        this.serverAction("Sell", this.para.sell);
      },
      onSellSupportFlag: function () {
        if (this.para.sell.support.count == 0) {
          this.setMessage(this.error, "Invalid Support Count", this.P3);
          return;
        }
        this.para.sell.support.flag = !this.para.sell.support.flag;
        this.serverAction("Sell", this.para.sell);
      },
      onSellSupportCount: function (oEvent) {
        this.para.sell.support.count = oEvent.getSource().getValue();
        this.serverAction("Sell", this.para.sell);
      },
      onSellSupportAction: function () {
        if (this.para.sell.support.action === this.alert) {
          this.para.sell.support.action = this.sell;
        } else {
          this.para.sell.support.action = this.alert;
        }
        this.serverAction("Sell", this.para.sell);
      },
      onSellAddonFlag: function () {
        if (this.para.sell.addon.count == 0) {
          this.setMessage(this.error, "Invalid Addon Count", this.P3);
          return;
        }
        this.para.sell.addon.flag = !this.para.sell.addon.flag;
        this.serverAction("Sell", this.para.sell);
      },
      onSellAddonCount: function (oEvent) {
        this.para.sell.addon.count = oEvent.getSource().getValue();
        this.serverAction("Sell", this.para.sell);
        return;
      },
      onSellAddonAction: function () {
        if (this.para.sell.addon.action === this.alert) {
          this.para.sell.addon.action = this.sell;
        } else {
          this.para.sell.addon.action = this.alert;
        }
        this.serverAction("Sell", this.para.sell);
      },
      getDeltaLabel: function (Point) {
        if (Point.x < this.startSecond) {
          return "";
        } else {
          return Point.y;
        }
      },
      initStockChart: function () {
        var that = this;
        const options = {
          chart: {
            // styledMode: true,
            backgroundColor: "#edeff0", //  "#222222", //"#F3F6F4",
            borderWidth: 0,
            // plotBorderColor: "#9E9E9E", //"#12171C",
            plotBorderWidth: 2,
            events: {
              load: function () {},
            },
          },
          exporting: {
            enabled: false,
          },
          stockTools: {
            gui: {
              enabled: true,
              visible: true,
            },
          },
          plotOptions: {
            series: {
              states: {
                inactive: {
                  enabled: false,
                },
              },
            },
            candlestick: {
              color: "#ea3d3d",
              upColor: "#51a958",
              upLineColor: "black",
              lineColor: "black",
            },
          },
          time: {
            useUTC: false,
          },
          scrollbar: { enabled: false },
          title: {
            text: null,
          },
          tooltip: {
            enabled: false,
            backgroundColor: "rgba(3, 11, 1, 0.93)",
            borderColor: "#000",
            borderRadius: 10,
            borderWidth: 3,
            shadow: false,
            useHTML: true,
            split: true,
            shared: true,
            formatter: function () {
              if (that.tooltipFlag == false) {
                return "";
              }
              return [""].concat(
                this.points
                  ? this.points.map(function (point) {
                      if (
                        point.series.name == "VOLUME" ||
                        point.series.name == "CALL_OI" ||
                        point.series.name == "PUT_OI"
                      ) {
                        return "";
                      }
                      if (point.series.name == "DELTA") {
                        return that.getDeltaTooltip(point.options);
                      } else {
                        return that.getOptionTooltip(point.options);
                      }
                    })
                  : [],
              );
            },
          },
          credits: {
            enabled: false,
          },
          xAxis: {
            gridLineColor: "#a0a0a0",
            lineColor: "#7a7a7a",
            lineWidth: 1,
            crosshair: {
              width: 1.2,
              snap: true,
              color: "black",
              dashStyle: "dash",
              label: {
                enabled: true,
                backgroundColor: "#0f8ef1", //"#5a5a5a",
                style: {
                  fontSize: "0.8em",
                },
                formatter: function (Seconds) {
                  var Time = that.convertSecondsToDate(Seconds);
                  Time = Time.toTimeString().substring(0, 5);
                  Time = that.convertTimeFormat(Time);
                  return Time;
                },
              },
            },
            labels: {
              enabled: true,
              style: {
                color: "#000000",
              },
              formatter: function (label) {
                var dataLabel = that.convertSecondsToDate(label.pos);
                var Hours = that.formatHours(dataLabel.getHours());
                var Minutes = that.addLeadingZero(dataLabel.getMinutes());
                return Hours + ":" + Minutes;
              },
            },
          },
          yAxis: [
            {
              title: {
                text: null, //'CALL'
              },
              visible: "true",
              opposite: true,
              top: "0%",
              height: "40%",
              lineWidth: 0.2,
              lineColor: "black",
              gridLineWidth: 0.2,
              gridLineColor: "black",
              offset: 0,
              crosshair: {
                width: 1.2,
                zindex: 6,
                snap: false,
                color: "black",
                dashStyle: "dash",
                label: {
                  enabled: true,
                  backgroundColor: "#0f8ef1", //"#5a5a5a",
                  style: {
                    fontSize: "0.8em",
                  },
                  formatter: function (Price) {
                    Price = parseFloat(Price).toFixed(1);
                    return Price;
                  },
                },
              },

              labels: {
                align: "left",
                style: {
                  color: "#000000",
                },
              },
              resize: {
                enabled: true,
                lineWidth: 2,
                lineColor: "black",
              },
            },
            {
              title: {
                text: null, //'PUT',
              },
              visible: "true",
              height: "40%",
              top: "40%",
              opposite: true,
              offset: 0,
              lineWidth: 0.2,
              lineColor: "black",
              gridLineWidth: 0.2,
              gridLineColor: "black",
              crosshair: {
                width: 1,
                snap: false,
                color: "black",
                dashStyle: "dot",
                label: {
                  enabled: true,
                  backgroundColor: "#0f8ef1", //"#5a5a5a",
                  style: {
                    fontSize: "0.8em",
                  },
                  formatter: function (Price) {
                    return parseFloat(Price).toFixed(1);
                  },
                },
              },
              labels: {
                align: "left",
                style: {
                  color: "#000000",
                },
              },
              resize: {
                enabled: true,
                lineWidth: 2,
                lineColor: "#7a7a7a",
              },
            },
            {
              title: {
                text: null, //'Delta',
              },
              visible: "true",
              height: "20%",
              top: "80%",
              opposite: true,
              offset: 0,
              lineWidth: 0.2,
              lineColor: "black",
              gridLineWidth: 0.2,
              gridLineColor: "black",
              crosshair: {
                width: 1,
                snap: false,
                color: "black",
                dashStyle: "dot",
                label: {
                  enabled: true,
                  backgroundColor: "#0f8ef1", //"#5a5a5a",
                  style: {
                    fontSize: "0.8em",
                  },
                  formatter: function (Price) {
                    return that.formatDecimal(Price);
                  },
                },
              },
              labels: {
                align: "left",
                style: {
                  color: "#000000",
                },
              },
              resize: {
                enabled: true,
                lineWidth: 2,
                lineColor: "#7a7a7a",
              },
            },
            {
              title: {
                text: null, //'CALL OI'
              },
              offset: 0,
              opposite: false,
              visible: "true",
              top: "0%",
              height: "40%",
              lineWidth: 0.2,
              lineColor: "black",
              gridLineWidth: 0.2,
              gridLineColor: "black",
              crosshair: {
                width: 1,
                snap: false,
                color: "black",
                dashStyle: "dot",
                label: {
                  enabled: true,
                  backgroundColor: "#0f8ef1", //"#5a5a5a",
                  style: {
                    fontSize: "0.8em",
                  },
                  formatter: function (Price) {
                    return parseFloat(Price).toFixed(1);
                  },
                },
              },
              labels: {
                // distance: 10,
                // padding: 5,
                format: "{value} L",
                align: "right",
                style: {
                  color: "#000000",
                },
              },
              resize: {
                enabled: true,
                lineWidth: 2,
                lineColor: "#7a7a7a",
              },
            },
            {
              title: {
                text: null, //'PUT OI'
              },
              offset: 0,
              opposite: false,
              visible: "true",
              top: "40%",
              height: "40%",
              lineWidth: 0.2,
              lineColor: "black",
              gridLineWidth: 0.2,
              gridLineColor: "black",
              crosshair: {
                width: 1,
                snap: false,
                color: "black",
                dashStyle: "dot",
                label: {
                  enabled: true,
                  backgroundColor: "#0f8ef1", //"#5a5a5a",
                  style: {
                    fontSize: "0.8em",
                  },
                  formatter: function (Price) {
                    return parseFloat(Price).toFixed(1);
                  },
                },
              },
              labels: {
                format: "{value} L",
                align: "right",
                style: {
                  color: "#000000",
                },
              },
              resize: {
                enabled: true,
                lineWidth: 2,
                lineColor: "#7a7a7a",
              },
            },
            {
              title: {
                text: null, //'Volume'
              },
              offset: 0,
              opposite: false,
              visible: "true",
              top: "80%",
              height: "20%",
              lineWidth: 0.2,
              lineColor: "black",
              gridLineWidth: 0.2,
              gridLineColor: "black",
              crosshair: {
                width: 1,
                snap: false,
                color: "black",
                dashStyle: "dot",
                label: {
                  enabled: true,
                  backgroundColor: "#0f8ef1", //"#5a5a5a",
                  style: {
                    fontSize: "0.8em",
                  },
                  formatter: function (Vol) {
                    return parseFloat(Vol).toFixed(1);
                  },
                  // zIndex: 10,
                },
              },
              labels: {
                // distance: 10,
                // padding: 5,
                format: "{value} L",
                align: "right",
                style: {
                  color: "#000000",
                },
              },
              resize: {
                enabled: true,
                lineWidth: 2,
                lineColor: "#7a7a7a",
              },
            },
          ],
          rangeSelector: {
            // dropdown: 'always',
            buttons: [
              {
                type: "minute",
                count: 5,
                text: "5m",
              },
              {
                type: "minute",
                count: 15,
                text: "15m",
              },
              {
                type: "minute",
                count: 30,
                text: "30m",
              },
              {
                type: "hour",
                count: 1,
                text: "1h",
              },
              {
                type: "hour",
                count: 2,
                text: "2h",
              },
              {
                type: "all",
                count: 1,
                text: "All",
              },
            ],
            selected: 5,
            inputEnabled: false,
            verticalAlign: "top",
            x: 1080,
            y: -35,
          },
          navigator: {
            enabled: false,
            series: {
              color: "#000000",
            },
          },
          series: [
            {
              id: "Call",
              type: "candlestick",
              name: "CALL",
              // color: "#FF7F7F",
              // upColor: "#D0F0C0",
              yAxis: 0,
              dataLabels: [
                {
                  enabled: false,
                  align: "right",
                  // @ts-ignore
                  formatter: function (Point) {
                    var callHigh = that.getCallHigh(this.point);
                    return callHigh;
                  },
                },
                {
                  enabled: false,
                  align: "left",
                  // @ts-ignore
                  formatter: function () {
                    var callLow = that.getCallLow(this.point);
                    return callLow;
                  },
                },
              ],
              lastVisiblePrice: {
                enabled: true,
                label: {
                  enabled: true,
                  formatter: function () {
                    var ltp = 0;
                    if (that.para.chart.category == that.market) {
                      ltp = that.updateMarketLtp();
                    } else {
                      ltp = that.updateCallLtp();
                    }
                    return ltp;
                  },
                  align: "left",
                  x: 10,
                  backgroundColor: "black", //"#00b300",
                  style: {
                    fontSize: "1em",
                  },
                },
              },
              lastPrice: {
                enabled: true,
                width: 1,
                dashStyle: "LongDash",
                color: "#880808",
                lable: {
                  enabled: true,
                  backgroundColor: "#00b300",
                  style: {
                    fontSize: "1em",
                  },
                },
              },
            },
            {
              id: "Put",
              name: "PUT",
              type: "candlestick",
              // color: "#FF7F7F",
              // upColor: "#90EE90",
              yAxis: 1,
              dataLabels: [
                {
                  enabled: false,
                  align: "left",
                  // @ts-ignore
                  formatter: function () {
                    var putHigh = that.getPutHigh(this.point);
                    return putHigh;
                  },
                },
                {
                  enabled: false,
                  align: "right",
                  // @ts-ignore
                  formatter: function () {
                    var putLow = that.getPutLow(this.point);
                    return putLow;
                  },
                },
              ],
              lastVisiblePrice: {
                enabled: true,
                label: {
                  enabled: true,
                  formatter: function () {
                    var ltp = 0;
                    if (that.para.chart.type == that.market) {
                      ltp = that.updateMarketLtp();
                    } else {
                      ltp = that.updatePutLtp();
                    }
                    return ltp;
                  },
                  align: "left",
                  x: 10,
                  backgroundColor: "black", //"#00b300",
                  style: {
                    fontSize: "1em",
                  },
                },
              },
              lastPrice: {
                enabled: true,
                width: 1,
                dashStyle: "LongDash",
                color: "red",
                lable: {
                  enabled: true,
                  backgroundColor: "#00b300",
                  style: {
                    fontSize: "1em",
                  },
                },
              },
            },
            {
              id: "Delta",
              name: "DELTA",
              type: "candlestick",
              inverted: false,
              // color: "red", //#5dade2",
              // upColor: "green", //#5dade2",
              yAxis: 2,
              dataLabels: [
                {
                  enabled: false,
                  align: "left",
                  // @ts-ignore
                  formatter: function (Point) {
                    return Point.high;
                  },
                },

                {
                  enabled: false,
                  align: "right",
                  // @ts-ignore
                  formatter: function (Point) {
                    return Point.low;
                  },
                },
              ],
              lastVisiblePrice: {
                enabled: true,
                label: {
                  enabled: true,
                  // @ts-ignore
                  formatter: function (Point) {
                    var ltp = 0;

                    if (that.para.chart.category == that.market) {
                      ltp = that.updateMarketOiLtp();
                    } else {
                      ltp = that.updateDeltaLtp();
                    }
                    return ltp;

                    // var ltp = 0;
                    // if (that.para.chart.category == that.option) {
                    //   ltp = that.updateDeltaLtp();
                    // }
                    // return ltp;
                  },
                  align: "left",
                  x: 10,
                  backgroundColor: "#7A7A7A",
                  style: {
                    fontSize: "1em",
                  },
                },
              },
              lastPrice: {
                enabled: true,
                width: 1,
                dashStyle: "LongDash",
                color: "#7A7A7A",
                lable: {
                  enabled: true,

                  backgroundColor: "#7A7A7A",
                  style: {
                    fontSize: "1em",
                  },
                },
              },
            },
            {
              name: "CALL_OI",
              type: "line",
              color: "green", //"#6c3483",
              yAxis: 3,
              marker: {
                symbol: "diamond", // Default, but explicitly set for clarity
                radius: 2, // Adjust as needed
              },
              dataLabels: [
                {
                  enabled: false,
                },
              ],
              lastVisiblePrice: {
                enabled: true,
                label: {
                  enabled: true,
                  align: "left",
                  // @ts-ignore
                  formatter: function (Point) {
                    var series = this.series[0],
                      lastPoint = series.points[0];
                    var ltp = that.updateCallOiLtp();
                    return ltp;
                  },
                  backgroundColor: "#7A7A7A",
                  style: {
                    fontSize: "1em",
                  },
                },
              },
              lastPrice: {
                enabled: true,
                width: 1,
                dashStyle: "LongDash",
                color: "#7A7A7A",
                lable: {
                  enabled: true,
                  backgroundColor: "#7A7A7A",
                  style: {
                    fontSize: "1em",
                  },
                },
              },
            },
            {
              name: "PUT_OI",
              type: "line",
              color: "red", //"#6c3483",
              yAxis: 4,
              marker: {
                symbol: "diamond", // Default, but explicitly set for clarity
                radius: 2, // Adjust as needed
              },
              dataLabels: [
                {
                  enabled: false,
                },
              ],
              lastVisiblePrice: {
                enabled: true,
                label: {
                  enabled: true,
                  // @ts-ignore
                  formatter: function (Point) {
                    var series = this.series[0],
                      lastPoint = series.points[0];
                    var ltp = that.updatePutOiLtp();
                    return ltp;
                  },
                  align: "left",
                  x: 0,
                  backgroundColor: "#7A7A7A",
                  style: {
                    fontSize: "1em",
                  },
                },
              },
              lastPrice: {
                enabled: true,
                width: 1,
                dashStyle: "LongDash",
                color: "#7A7A7A",
                lable: {
                  enabled: true,
                  backgroundColor: "#7A7A7A",
                  style: {
                    fontSize: "1em",
                  },
                },
              },
            },
            {
              name: "VOLUME",
              type: "line",
              color: "#6495ED", //"#6c3483",
              yAxis: 5,
              dataLabels: [
                {
                  enabled: false,
                  // @ts-ignore
                  formatter: function (Point) {
                    var delta = that.getDeltaLabel(Point);
                    return delta;
                  },
                },
              ],
              lastVisiblePrice: {
                enabled: false,
                gridLineWidth: 0,
                gridLineColor: "#a0a0a0",
                lineColor: "#7a7a7a",
                label: {
                  enabled: true,
                  formatter: function () {
                    var series = this.series[0],
                      // @ts-ignore
                      lastPoint = series.points[series.points.length - 1];
                    var ltp = that.getVolumeLastPrice(series.points);
                    return ltp;
                  },
                  align: "left",
                  x: 10,
                  backgroundColor: "#7A7A7A",
                  style: {
                    fontSize: "1em",
                  },
                },
              },
              lastPrice: {
                enabled: false,
                width: 1,
                dashStyle: "LongDash",
                color: "#7A7A7A",
                lable: {
                  enabled: true,
                  backgroundColor: "#7A7A7A",
                  style: {
                    fontSize: "1em",
                  },
                },
              },
            },
          ],
        };

        if (sap.ui.getCore().layout === "Horizontal") {
          highcharts.stockChart("StockChart", options);
        } else {
          highcharts.stockChart("StockChartV", options);
        }
      },
      initBarChart: function () {
        var that = this;
        const options = {
          chart: {
            type: "bar",
            borderRadius: 10,
            backgroundColor: "#edeff0", // "#222222", //"#12171C", //"#F3F6F4",
            borderWidth: 0,
            plotBorderColor: "#9E9E9E", //"#12171C",
          },
          title: {
            text: null,
            // style: {
            //   color: "#4DB1FF",
            // },
          },
          stockTools: {
            gui: {
              enabled: false,
              visible: false,
            },
          },
          exporting: {
            enabled: false,
          },

          xAxis: {
            categories: ["BTC", "ETH"],
            labels: {
              enabled: false,
            },
          },
          credits: {
            enabled: false,
          },
          plotOptions: {
            bar: {
              borderRadius: "25%",
              states: {
                inactive: {
                  enabled: false,
                },
              },
              events: {
                click: function (event) {
                  switch (event.point.category) {
                    case that.btc:
                      that.onBtcStrike();
                      break;
                    case that.eth:
                      that.onEthStrike();
                      break;
                    default:
                      that.setMessage(
                        that.error,
                        "Invalid Bar Category",
                        this.P3,
                      );
                      break;
                  }
                },
              },
            },
          },
          legend: {
            enabled: false,
          },
          yAxis: [
            {
              lineWidth: 0.2,
              lineColor: "black",
              gridLineWidth: 0.2,
              gridLineColor: "black",
              title: {
                enabled: true,
                text: null,
              },
              labels: {
                align: "left",
                style: {
                  color: "#000000",
                },
              },
            },
            {
              // Secondary Y-axis (for line)
              lineWidth: 0.2,
              lineColor: "black",
              opposite: true, // Places this axis on the opposite side
              title: {
                enabled: false,
                text: null,
              },
            },
          ],
          tooltip: {},

          series: [
            {
              name: "Market",
              color: "#4E97D0",
              dataLabels: {
                align: "right",
                enabled: true,
              },
              data: [0, 0],
            },
            {
              name: "Call",
              color: "#51a958",
              dataLabels: {
                align: "right",
                enabled: true,
              },
              data: [0, 0],
            },
            {
              name: "Delta",
              color: "#F5B027",
              dataLabels: {
                align: "right",
                enabled: true,
              },
              data: [0, 0],
            },
            {
              name: "Put",
              color: "#db4d4d",
              dataLabels: {
                align: "right",
                enabled: true,
              },
              data: [0, 0],
            },
          ],
        };
        if (sap.ui.getCore().layout === "Horizontal") {
          highcharts.chart("BarChart", options);
        } else {
          highcharts.chart("BarChartV", options);
        }
      },
      hideNavBar: function () {
        // @ts-ignore
        if (sap.ushell.Container.getRenderer("fiori2")) {
          // @ts-ignore
          sap.ushell.Container.getRenderer("fiori2").setHeaderVisibility(
            false,
            true,
          );
        }
      },

      initConstants: function () {
        this.display = "Display";
        this.edit = "Edit";
        this.message = "Message";
        this.backtest = "Backtest";
        this.window = "Window";
        this.wallet = "Wallet";
        this.alarm = "Alarm";
        this.account = "Account";
        this.manage = "Manage";
        this.alert = "Alert";
        this.option = "Option";
        this.error = "Error";
        this.success = "Success";
        this.warning = "Warning";
        this.info = "Information";
        this.accept = "Accept";
        this.reject = "Reject";
        this.default = "Default";
        this.transparent = "Transparent";
        this.emphasized = "Emphasized";
        this.neutral = "Neutral";
        this.critical = "Critical";
        this.attention = "Attention";
        this.transparent = "Transparent";
        this.auto = "Auto";
        this.fixed = "Fixed";
        this.trail = "Trail";
        this.expand = "Expand";
        this.option = "Option";
        this.market = "Market";
        this.limit = "Limit";
        this.maker = "Maker";
        this.taker = "Taker";
        this.mark = "MARK:";
        this.track = "Track";
        this.buy = "Buy";
        this.sell = "Sell";
        this.average = "Average";
        this.percentage = "Percentage";
        this.book = "Book";
        this.reverse = "Reverse";
        this.main = "Main";
        this.support = "Support";
        this.mainAddon = "MainAddon";
        this.supportAddon = "SupportAddon";
        this.mainAdjust = "MainAdjust";
        this.supportAdjust = "SupportAdjust";
        this.positive = "Positive";
        this.negative = "Negative";
        this.horizontal = "Horizontal";
        this.vertical = "Vertical";
        this.horizontalHalf = "HorizontalHalf";
        this.verticalHalf = "VerticalHalf";
        this.horizontalFull = "HorizontalFull";
        this.verticalFull = "VerticalFull";
        this.addon = "Addon";
        this.pnl = "Pnl";
        this.both = "Both";
        this.delta = "Delta";
        this.all = "All";
        this.candle = "Candle";
        this.up = "Up";
        this.down = "Down";
        this.fixup = "Fix Up";
        this.fixDown = "Fix Dn";
        this.trailUp = "Trail Up";
        this.trailDown = "Trail Dn";
        this.askGapType = "Call";
        this.hidePlotline = -10000;
        this.milisec24Hr = 86400000;
        this.stopwatch = "Stopwatch";
        this.clock = "Clock";
        this.serverPara = "Para";
        this.log = "Log";
        this.database = "Database";

        this.P1 = "P1";
        this.P2 = "P2";
        this.P3 = "P3";

        // Right Header
        this.zoom = "Zoom";
        this.update = "Update";
        this.ask_gap = "Ask Gap";
        this.history = "History";

        // Hide Plot Lines
        this.hideChartLine = -1;
        this.hideBarLine = -10000;

        // Colors
        this.green = "green";
        this.red = "red";
        this.blue = "blue";
        this.purple = "Purple";
        this.grey = "grey";
        this.light = "Light";
        this.dark = "Dark";
        this.black = "black";
        this.orange = "orange";
        this.white = "white";
        this.greenWindow = "#AFE1AF"; //"#AFE1AF"; // "#50C878"; //
        this.orangeWindow = "#FFDEAD"; //"#FAD5A5"; //"#A86929";
        this.yellowWindow = "#FBEC5D"; //"#FEF9C2";
        this.blueWindow = "#a2dfecff";
        this.greyWindow = "#BDB5D5";
        this.timeFrameColor = "#C9E4FF";
        this.invisibleColor = "#F3F6F4";

        // Flags
        this.tooltipFlag = false;
        this.addOnChart = true;
        this.marketDataLabelFlag = false;
        this.dataLabelFlag = "00"; //false;

        // Dividor
        this.callOiDiv = 0;
        this.putOiDiv = 0;
        this.volDiv = 0;
        this.ten = 10;
        this.hundred = 100;
        this.thousand = 1000;
        this.tenThousand = 10000;
        this.lakh = 100000;
        this.million = 1000000;
        this.minToMiliSec = 60000;

        this.zoom1 = "Zoom1";
        this.zoom2 = "Zoom2";
        this.zoom3 = "Zoom3";
        this.zoomAll = "ZoomAll";

        // Currency
        this.usdSymbol = "$";
        this.inrSymbol = "₹";
        this.usd = "USD";
        this.inr = "INR";

        this.greyState = "Indication20";
        this.greenState = "Indication14";
        this.redState = "Indication12";
        this.blueState = "Indication15";

        this.ltpRed = "#FF7F7F";
        this.ltpGreen = "#90EE90";

        // this.ltpRed = "#ea3d3d";
        // this.ltpGreen = "#51a958";

        // Symbol Info
        this.eth = "ETH";
        this.btc = "BTC";
        this.btcSymbol = "BTCUSD";
        this.ethSymbol = "ETHUSD";
        this.bitcoin = "Bitcoin";
        this.ethereum = "Ethereum";
        this.ethLotSize = 0.01;
        this.btcLotSize = 0.001;
        this.ethWindow = 20;
        this.btcWindow = 200;
        this.buyOption = "buy";
        this.sellOption = "sell";
        this.call = "Call";
        this.put = "Put";
        this.none = "None";

        this.aMonth = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];

        // Server
        this.apiPath = sap.ui.getCore().apiPath; // "http://82.112.226.76:4000"; // "http://localhost:4000";

        // Themes
        this.light = "Light";
        this.dark = "Dark";

        // Websocket
        this.userAgent = "java";
        this.get = "GET";
        this.post = "POST";
      },
      initVaribles: function () {
        this.popupMsgCount = 0;
        this.bookType = this.call;
        this.supportVisible = true;
        this.backtestInc = 10;
        this.buyLine = false;
        this.displayLtp = true;
        this.stockTools = false;
        this.buyFlag = false;
        this.zoomType = this.zoomAll;
        this.openServer = false;
        this.isBusy = false;
        this.marketOiHigh = 0;
        this.marketOiLow = 0;
        this.historyView = false;
        this.optionVolType = this.market;
        this.showAddonBar = true;

        this.para = {};
        this.busyFlag = false;
        this.aDelta = [];
        var aCall = [];
        var aPut = [];
        this.aMarket = [];
        this.aMarketOi = [];
        this.aVolume = [];
        this.aHeaderMsg = [];
        this.aTimeframe = [];
        this.aExpiry = [];
        this.aMessage = [];
        this.aAllMsg = [];
        this.aTrn = [];
      },
    });
  },
  //////////////////
);
