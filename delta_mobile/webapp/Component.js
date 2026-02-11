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
        // call the base component's init function
        UIComponent.prototype.init.apply(this, arguments);

        // set the device model
        this.setModel(models.createDeviceModel(), "device");

        // enable routing
        this.getRouter().initialize();

        sap.ui.getCore().layout = "";
        sap.ui.getCore().apiPath = "deltaapi.coinpress.cloud"; // "http://localhost:4000";
        sap.ui.getCore().deltaPath = "https://api.india.delta.exchange";
      },
    });
  },
);
