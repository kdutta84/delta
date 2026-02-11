const Controller = require("../controller/Controller");
const express = require("express");
const router = express.Router();

// Default
router.get("/", (req, res) => Controller.handleConnection(req, res));

// Layout
router.get("/layout", (req, res) => Controller.handleLayout(req, res));

// Parameter
router.post("/para", (req, res) => Controller.handlePara(req, res));

// Action
router.post("/action", (req, res) => Controller.handleAction(req, res));

// Data
router.get("/data", (req, res) => Controller.handleData(req, res));

// Records
router.post("/records", (req, res) => Controller.handleRecords(req, res));

// Record Item
router.post("/item", (req, res) => Controller.handleItem(req, res));

module.exports = router;
