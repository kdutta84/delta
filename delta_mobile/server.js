const express = require("express");
const cors = require("cors");
const path = require("path");
const env = require("dotenv").config();
const app = express();
const port = 4200;

// Convert Incoming Data to JSON
// __dirname
app.use(express.static(path.join(__dirname, "webapp")));

app.use(cors());

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

// Activate Port
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
