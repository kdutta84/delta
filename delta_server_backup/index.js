const Controller = require("./src/controller/Controller");
const express = require("express");
const cors = require("cors");
const app = express();
const router = require("./src/routes/Router");
const port = 4000;

// Convert Incoming Data to JSON
app.use(express.json());

app.use(cors());

// Init Router
app.use("/", router);

// Activate Port
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

// Start Server
Controller.initServer();
