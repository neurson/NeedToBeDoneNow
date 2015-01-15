var express = require("express");
var Models = require("../models");

var router = new express.Router();
var Task = Models.Task;

router.param("task_id", function (req, res, next, taskId) {

    Task.findOne({"_id": taskId, belongTo : req.appData.list}, function(err, task) {

        if (err) return next(err);

        if (!task) {
            var notFound = new Error('Resource not found')
            notFound.status = 404;
            return next(notFound);
        }

        if (!task.owner.equals(req.user._id)) {
            var fobidden = new Error('Fobidden')
            fobidden.status = 403;
            return next(fobidden);
        }

        // TODO: Ensure that data already in appData will not be overwritten.
        req.appData = {
            task: task
        };

        return next();
    });
});

router.get("/", function (req, res) {

    Task.find({ owner : req.user, belongTo : req.appData.list}, function(err, tasks) {
        if (err) throw err;
        res.status(200).send(tasks);
    });
});

router.post("/", function (req, res) {

    var task = new Task();

    task.name = req.body.name;
    task.createdOn = new Date();
    task.owner = req.user;
    task.belongTo = req.appData.list;

    task.save(function(err, newTask) {
        if (err) throw err;
        res.status(201).send(newTask);
    });
});

router.get("/:task_id", function (req, res) {
    res.status(200).send(req.appData.task);
});

router.put("/:task_id", function (req, res) {

    req.appData.task.name = req.body.name;
    req.appData.task.save(function(err, updatedDoc) {
        res.status(204).send(updatedDoc);
    });
});

router.delete("/:task_id", function (req, res) {

    req.appData.task.remove(function(err, removedDoc) {
        res.status(204).send(removedDoc);
    });
});

module.exports = router;