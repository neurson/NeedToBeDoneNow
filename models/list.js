var mongoose = require("mongoose");

var ListSchema = mongoose.Schema({
	name: { type: String, required: true },
	owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
	createdOn: { type: Date, required: true, default: Date.now()}
});

module.exports = mongoose.model('List', ListSchema);