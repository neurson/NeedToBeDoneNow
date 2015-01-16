var mongoose = require("mongoose");

var TaskSchema = mongoose.Schema({
    name: { type: String, required: true },
    createdOn: { type: Date, required: true, default: Date.now()},
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    belongTo: { type: mongoose.Schema.Types.ObjectId, ref: "List", required: true }
});

module.exports = mongoose.model('Task', TaskSchema);