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
    // "highcharts/highstock",
    "highcharts",
    "ns/deltaapphost/model/formatter",
    "ns/deltaapphost/controller/BaseController",
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
    BaseController,
  ) {
    "use strict";
    debugger;
    return BaseController.extend("ns.deltaapphost.controller.Horizontal", {
      formatter: formatter,

      onInit: function () {
        // if (sap.ui.getCore().layout === "Horizontal") {
        //   this.initController();
        // }
        this.getOwnerComponent()
          .getRouter()
          .attachRouteMatched(this._onRouteMatched, this);
      },
      _onRouteMatched: function () {
        if (sap.ui.getCore().layout === "Horizontal") {
          this.initController();
        }
      },
    });
  },
);
