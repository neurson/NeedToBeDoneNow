var express = require("express");
var router = new express.Router();

var List = require("../lib/task");

// Tasks sub-route
var tasks = require("./tasks");
router.use("/:list_id/tasks", tasks);

router.param("list_id", function (req, res, next, listId) {

	List.findById(listId, function(err, list) {

		if (err) return next(err);

		if (!list) {
			var notFound = new Error('Resource not found')
			notFound.status = 404;
			return next(notFound);
		}

		if (!list.owner.equals(req.user._id)) {
			var fobidden = new Error('Fobidden')
			fobidden.status = 403;
			return next(fobidden);
		}

		req.appData = req.appData || {};
		req.appData.list = list;

		return next();		
	});
});

router.get("/", function (req, res) {
	
	List.find({ owner: req.user}, function(err, lists) {
		if (err) throw err;
		res.status(200).send(lists);
	});
});

router.post("/", function (req, res) {

	var list = new List();

	list.name = req.body.name;
	list.owner = req.user;

	list.save(function(err, newList) {
		if (err) throw err;
		res.status(201).send(newList);
	});	
});

router.get("/:list_id", function (req, res) {
	res.status(200).send(req.appData.list);
});

router.put("/:list_id", function (req, res) {

	req.appData.list.name = req.body.name;
	req.appData.list.save(function(err, updatedDoc) {
		res.status(204).send(updatedDoc);
	});
});

router.delete("/:list_id", function (req, res) {
	
	req.appData.list.remove(function(err, removedDoc) {
		res.status(204).send(removedDoc);
	});
});

module.exports = router;
