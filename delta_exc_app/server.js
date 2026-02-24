const express = require("express");
const cors = require("cors");
const path = require("path");
const env = require("dotenv").config();
const app = express();
const port = 4300;

// Convert Incoming Data to JSON
// __dirname
app.use(express.static(path.join(__dirname, "webapp")));

app.use(cors());

// Activate Port
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
