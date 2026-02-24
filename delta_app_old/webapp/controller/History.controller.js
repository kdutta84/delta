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
    "ns/deltaapphost/model/formatter",
    "ns/deltaapphost/controller/BaseController",
    "sap/ui/core/routing/History",
    "moment",
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
    formatter,
    BaseController,
    History,
    Moment,
  ) {
    "use strict";

    return BaseController.extend("ns.deltaapphost.controller.History", {
      formatter: formatter,

      onInit: function () {
        this.initVariables();
        this.initScreenModel();
        this.onSubmit();
      },
      initScreenModel: function () {
        this.screen = {
          dispSlp: false,
        };

        var oModel = new JSONModel(this.screen);
        this.getView().setModel(oModel, "ScreenModel");
      },
      onShowItemSlippage: function () {
        this.screen.dispSlp = !this.screen.dispSlp;
        this.updateModel("ScreenModel", this.screen);
      },
      filterHistory: function () {
        // Filter Mode
        this.aFilter = this.aFilter.filter(
          (item) => item.mode === this.filter.mode,
        );

        // Filter Coin
        if (this.filter.coin !== this.all) {
          this.aFilter = this.aFilter.filter(
            (item) => item.index === this.filter.coin,
          );
        }

        // Filter Pnl
        if (this.filter.pnl !== this.all) {
          if (this.filter.pnl === this.profit) {
            this.aFilter = this.aFilter.filter((item) => item.pnl > 0);
          } else {
            this.aFilter = this.aFilter.filter((item) => item.pnl < 0);
          }
        }

        // Filter Zone
        if (this.filter.zone !== this.all) {
          switch (this.filter.zone) {
            case this.asia:
              this.aFilter = this.aFilter.filter((item) => {
                let date = new Date(item.timestamp);
                let time =
                  date.getHours() +
                  ":" +
                  date.getMinutes() +
                  ":" +
                  date.getSeconds();

                const timeToCheck = Moment(time, "HH:mm:ss");
                return timeToCheck.isBetween(this.asiaStart, this.asiaEnd);
              });
              break;
            case this.europe:
              this.aFilter = this.aFilter.filter((item) => {
                let date = new Date(item.timestamp);
                let time =
                  date.getHours() +
                  ":" +
                  date.getMinutes() +
                  ":" +
                  date.getSeconds();

                const timeToCheck = Moment(time, "HH:mm:ss");
                return timeToCheck.isBetween(this.europeStart, this.europeEnd);
              });
              break;
            case this.usa:
              this.aFilter = this.aFilter.filter((item) => {
                let date = new Date(item.timestamp);
                let time =
                  date.getHours() +
                  ":" +
                  date.getMinutes() +
                  ":" +
                  date.getSeconds();

                const timeToCheck = Moment(time, "HH:mm:ss");
                return (
                  timeToCheck.isBetween(this.usaAmStart, this.usaAmEnd) ||
                  timeToCheck.isBetween(this.usaPmStart, this.usaPmEnd)
                );
              });
              break;
          }
        }
      },
      processHistory: function () {
        this.aFilter = this.aHistory;

        this.summary = {
          count: 0,
          hit: 0,
          hitPer: 0,
          amtIn: 0,
          amtOut: 0,
          pnl: 0,
        };

        this.itemPnl = {
          pnl: 0,
          rev: 0,
          amt: 0,
          time: 0,
          support: 0,
          supportPer: 0,
          addon: 0,
          addonPer: 0,
          slippage: 0,
          slippagePer: 0,
          items: [],
        };

        // Filter History
        this.filterHistory();

        // History Model
        this.updateModel("HistoryModel", this.aFilter);

        // Summary Model
        for (let i = 0; i < this.aFilter.length; i++) {
          const history = this.aFilter[i];
          if (history.pnl > 0) {
            this.summary.hit = this.summary.hit + 1;
          }
          this.summary.amtIn = this.summary.amtIn + history.amount;
          this.summary.pnl = this.summary.pnl + history.pnl;
        }

        this.summary.count = this.aFilter.length;
        this.summary.hitPer = this.formatDecimal(
          (this.summary.hit / this.summary.count) * 100,
        );
        this.summary.amtIn = this.formatDecimal(
          this.summary.amtIn / this.summary.count,
        );
        this.summary.pnl = this.formatDecimal(this.summary.pnl);
        this.summary.amtOut = this.formatDecimal(
          (this.summary.amtIn * this.summary.pnl) / 100,
        );
        this.updateModel("SummaryModel", this.summary);
      },
      onSubmit: async function () {
        // var result = await this.fetchServer("/records");
        await this.fetchRecords(+this.filter.from, +this.filter.to);
        this.onDateChange();

        this.processHistory();
      },
      onDateChange() {
        let days = this.calculateDays(+this.filter.from, +this.filter.to);
        this.getView()
          .byId("idDays")
          .setText(days + (days === 1 ? " Day" : " Days"));
      },
      calculateDays: function (startDate, endDate) {
        let start = new Date(startDate);
        let end = new Date(endDate);
        let timeDifference = end - start;
        let daysDifference = timeDifference / (1000 * 3600 * 24);
        return Math.round(daysDifference);
      },
      fetchRecords: async function (from, to) {
        const data = {};
        const options = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from: from, to: to }),
        };
        var url = this.apiPath + `/records`;

        var that = this;
        await fetch(url, options)
          .then((response) => {
            if (!response.ok) {
              throw new Error(response.type + " ==> " + response.statusText);
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
                  that.aHistory = result.data;
                }
              } else {
                throw new Error("Error in Server Action");
              }
            }
          })
          .catch((error) => {
            MessageToast.show(error.message);
          });
      },
      fetchHistoryItems: async function (timestamp) {
        const data = {};
        const options = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ parent: timestamp }),
        };
        var url = this.apiPath + `/item`;

        var that = this;
        await fetch(url, options)
          .then((response) => {
            if (!response.ok) {
              throw new Error(response.type + " ==> " + response.statusText);
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
                  // that.itemPnl.items = result.data;
                  that.assignItems(result.data);
                }
              } else {
                throw new Error("Error in Server Action");
              }
            }
          })
          .catch((error) => {
            MessageToast.show(error.message);
          });
      },
      assignItems: function (aItems) {
        this.itemPnl.items = aItems;
        this.itemPnl.itemCount = aItems.length;
        let from = aItems[0].buyTime;
        let to = aItems[aItems.length - 1].sellTime;
        this.itemPnl.timeTaken = this.convertSecondsToTime(to - from);
      },
      onItemSelected: async function (oEvent) {
        let history = this.aFilter[oEvent.getSource().getSelectedIndex()];
        // Pnl Model

        this.itemPnl.pnl = history.pnl;
        this.itemPnl.rev = history.reverse;
        this.itemPnl.amt = this.formatDecimal(
          (history.amount * history.pnl) / 100,
        );
        this.itemPnl.support = history.support;
        this.itemPnl.supportPer = history.supportPer;
        this.itemPnl.addon = history.addonCount;
        this.itemPnl.addonPer = history.addonPer;
        this.itemPnl.slippage = history.slippage;
        this.itemPnl.slippagePer = history.slippagePer;

        // Items
        await this.fetchHistoryItems(history.timestamp);

        // Item Model
        this.updateModel("ItemModel", this.itemPnl);
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
      initVariables() {
        this.initConstants();
        this.asia = "Asia";
        this.europe = "Europe";
        this.usa = "Usa";
        this.active = "Active";
        this.test = "Test";
        this.profit = "Profit";
        this.loss = "Loss";
        let days = 1;

        this.asiaStart = Moment("05:30:00", "HH:mm:ss"); // "05:30 AM"
        this.asiaEnd = Moment("13:30:00", "HH:mm:ss"); // "01:30 PM"
        this.europeStart = Moment("13:30:00", "HH:mm:ss"); // "01:30 PM"
        this.europeEnd = Moment("19:30:00", "HH:mm:ss"); // "07:30 PM"
        this.usaPmStart = Moment("19:30:00", "HH:mm:ss"); // "07:30 PM"
        this.usaPmEnd = Moment("24:00:00", "HH:mm:ss"); // "12:00 AM"
        this.usaAmStart = Moment("00:00:00", "HH:mm:ss"); // "12:00 AM"
        this.usaAmEnd = Moment("05:30:00", "HH:mm:ss"); // "05:30 AM"

        // Structures
        this.summary = {
          count: 0,
          hit: 0,
          hitPer: 0,
          amtIn: 0,
          amtOut: 0,
          pnl: 0,
        };

        this.itemPnl = {
          pnl: 0,
          rev: 0,
          amt: 0,
          time: 0,
          support: 0,
          supportPer: 0,
          addon: 0,
          addonPer: 0,
          slippage: 0,
          slippagePer: 0,
          items: [],
        };

        this.item = {
          buyTime: 0,
          sellTime: 0,
          category: 0,
          icon: 0,
          buy: 0,
          ltp: 0,
          per: 0,
        };

        // Models
        let to = new Date();
        to.setHours(23, 59, 59, 999);

        let from = new Date();
        from.setDate(from.getDate() - Math.abs(days));

        // Variables
        this.filter = {
          from: from,
          to: to,
          days: days,
          mode: this.test,
          coin: this.all,
          zone: this.all,
          pnl: this.all,
        };

        var oModel = new JSONModel(this.filter);
        this.getView().setModel(oModel, "FilterModel");

        var oModel = new JSONModel({});
        this.getView().setModel(oModel, "HistoryModel");

        var oModel = new JSONModel({});
        this.getView().setModel(oModel, "SummaryModel");

        var oModel = new JSONModel({});
        this.getView().setModel(oModel, "PnlModel");

        var oModel = new JSONModel({});
        this.getView().setModel(oModel, "ItemModel");
      },
      onNavBack: function () {
        var oHistory = History.getInstance();
        var sPreviousHash = oHistory.getPreviousHash();

        if (sPreviousHash !== undefined) {
          window.history.go(-1);
        } else {
          this.getRouter().navTo("RouteMain", {}, true);
        }
      },
    });
  },
);
