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
    "ns/deltaexcapp/model/formatter",
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
  ) {
    "use strict";
    debugger;
    return Controller.extend("ns.deltaexcapp.controller.Main", {
      formatter: formatter,

      onInit: async function () {
        try {
          debugger;
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
        debugger;
        var url = sap.ui.getCore().apiPath + "/layout"; // http://localhost:4000/layout";
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
              debugger;
              that
                .getOwnerComponent()
                .getRouter()
                .navTo(result.message, {}, true);
              return;
            }
          })
          .catch((error) => {
            throw new Error(error.message);
          });
      },
      checkServerConn: async function () {
        var url = sap.ui.getCore().apiPath + "/"; // http://localhost:4000/";
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
