var mongoose = require("mongoose");

var TaskSchema = mongoose.Schema({
    name: { type: String, required: true },
    createdOn: { type: Date, required: true, default: Date.now()}
});

module.exports = mongoose.model('Task', TaskSchema);