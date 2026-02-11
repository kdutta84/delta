sap.ui.define(
  [
    "sap/ui/core/UIComponent",
    "ns/deltaapphost/model/models",
    "sap/m/MessageBox",
    "dotenv",
  ],
  (UIComponent, models, MessageBox, Env) => {
    "use strict";

    return UIComponent.extend("ns.deltaapphost.Component", {
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

        this.setInit();
        /////////////////////////////////////
      },
      setInit: async function () {
        try {
          // this.initConstants();
          let conn = await this.checkServerConn();

          if (conn.status === "Success") {
            await this.getLayout();

            // this.getOwnerComponent().getRouter().navTo(layout, {}, true);
          } else {
            MessageBox.error("Server Not Connected");
          }
        } catch (error) {
          MessageBox.error(error);
        }
      },
      getLayout: async function () {
        const options = {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        };

        var url = sap.ui.getCore().apiPath + "/layout"; // "http://localhost:4000/layout";
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
              sap.ui.getCore().layout = result.message;
              that.getRouter().navTo(result.message, {}, true);
            }
          })
          .catch((error) => {
            throw new Error(error.message);
          });
      },
      checkServerConn: async function () {
        var url = sap.ui.getCore().apiPath + "/"; // "http://localhost:4000/";
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
              resolve(data);
            })
            .catch((error) => {
              reject("Server is OFF");
            });
        });
      },
    });
  },
);
