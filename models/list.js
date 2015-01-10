var mongoose = require("mongoose");

var ListSchema = mongoose.Schema({
	name: { type: String, required: true },
	owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
});

module.exports = mongoose.model('List', ListSchema);