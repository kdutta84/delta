sap.ui.define(
  ["sap/ui/core/UIComponent", "ns/deltamobilehost/model/models"],
  (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("ns.deltamobilehost.Component", {
      metadata: {
        manifest: "json",
        config: { fullWidth: true },
        interfaces: ["sap.ui.core.IAsyncContentCreation"],
      },

      init() {
        // Ipad Issue Fix
        if (typeof Promise.withResolvers === "undefined") {
          Promise.withResolvers = function () {
            let resolve, reject;
            const promise = new Promise((res, rej) => {
              resolve = res;
              reject = rej;
            });
            return { promise, resolve, reject };
          };
        }

        // call the base component's init function
        UIComponent.prototype.init.apply(this, arguments);

        // set the device model
        this.setModel(models.createDeviceModel(), "device");

        // enable routing
        this.getRouter().initialize();

        ////////////////////////////////
        // Highcharts Local Folder
        sap.ui.loader.config({
          paths: {
            highcharts: "highcharts/highstock",
          },
          shim: {
            highcharts: {
              amd: true,
              exports: "Highcharts",
            },
          },
        });
        ////////////////////////////////
        sap.ui.getCore().layout = "";
        sap.ui.getCore().apiPath = "https://deltaapi.coinpress.cloud"; // "http://localhost:4000"; //
        sap.ui.getCore().deltaPath = "https://api.india.delta.exchange";
      },
    });
  },
);
