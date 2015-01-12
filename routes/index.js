var express = require("express");
var router = express.Router();

var lists = require("./lists");
var tasks = require("./tasks");

router.use("/lists", lists);
router.use("/tasks", tasks);

module.exports = router;