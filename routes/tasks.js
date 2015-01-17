var express = require("express");
var router = new express.Router();

router.param("task_id", function (req, res, next, taskId) {

    var tasks = req.appData.list.task.id(taskId);

    if (!tasks) {
        var notFound = new Error('Resource not found')
        notFound.status = 404;
        return next(notFound);
    }

    req.appData.task = tasks;

    return next();
});

router.get("/", function (req, res) {
    return res.status(200).send(req.appData.list.task);
});

router.post("/", function (req, res) {

    var list = req.appData.list;
    var task = list.task.create({
        name: req.body.name,
        owner: req.user
    });

    list.task.push(task);

    list.save(function(err) {
        if (err) throw err;
        res.status(201).send(task);
    });
});

router.get("/:task_id", function (req, res) {
    res.status(200).send(req.appData.task);
});

router.put("/:task_id", function (req, res) {

    var list = req.appData.list;
    var tasks = req.appData.task;

    tasks.name = req.body.name;

    list.save(function(err, list) {
        if (err) throw err;
        res.status(204).send(list.task.id(req.params.task_id));
    });
});

router.delete("/:task_id", function (req, res) {

    var task = req.appData.task;
    var list = req.appData.list;

    list.task.remove(task);

    list.save(function(err) {
        if (err) throw err;
        res.status(204).send(task);
    });
});

module.exports = router;