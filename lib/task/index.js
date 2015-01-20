var mongoose = require("mongoose");

var TaskSchema = mongoose.Schema({
    name: { type: String, required: true },
    isDone: { type: Boolean, required: true, default: false },
    createdOn: { type: Date, required: true, default: Date.now()}
});

var ListSchema = mongoose.Schema({
    name: {type: String, required: true},
    owner: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    createdOn: {type: Date, required: true, default: Date.now()},
    task: [TaskSchema]
});

module.exports = mongoose.model('List', ListSchema);