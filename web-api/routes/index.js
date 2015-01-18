var express = require("express");
var router = express.Router();

var lists = require("./lists");

router.use("/lists", lists);

module.exports = router;