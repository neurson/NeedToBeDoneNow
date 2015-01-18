var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require("mongoose");
var passport = require("passport");
var authenticator = require("./../lib/authenticator/index");
var epa = require("epa").getEnvironment();

var dbConnectionString = epa.get("DBConnectionString");
mongoose.connect(dbConnectionString);

var routes = require("./routes");
var app = express();

app.use(bodyParser.json());
app.use(passport.initialize());

app.use("/api", authenticator.isAuthenticated, routes);

// Error handler
app.use(function(err, req, res, next) {

	if (err.status !== 403) {
		return next(err);
	}
	
	res.status(403);
	res.send(err.message);
});

app.use(function(err, req, res, next) {

	if (err.status !== 404) {
		return next(err);
	}	
	
	res.status(404);
	res.send(err.message);
});

module.exports = app;