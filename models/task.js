var mongoose = require("mongoose");

var TaskSchema = mongoose.Schema({
    name: { type: String, required: true },
    createdOn: { type: Date, required: true},
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
});

module.exports = mongoose.model('Task', TaskSchema);