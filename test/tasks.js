var assert = require("assert");
var request = require("supertest");
var mongoose = require("mongoose");
var base64 =  require('base-64');

var app = require("../app");

var Models = require("../models")
var Task = Models.Task;
var User = Models.User;

var fakeId = "000000000000000000000000";
var authenticationToken = "Basic " + base64.encode("foo:bar");

describe("Tasks route", function() {

	var user;

	var createPersistedTask = function (name, user, cb) {

		var newTask = new Task();

		newTask.name = "My task";
		newTask.owner = user;
		newTask.createdOn = new Date();

		newTask.save(function(err, savedTask) {
			if (err) throw err;
			cb(savedTask);
		});
	};

	before(function() {

		// Clean database
		for (var collection in mongoose.connection.collections) {
      		mongoose.connection.collections[collection].remove(function() {});
    	}

    	// Create a valid user
    	user = new User();

    	user.username = "foo";
    	user.password = "bar";

    	user.save();
	});

	after(function(done) {
		for (var collection in mongoose.connection.collections) {
			mongoose.connection.collections[collection].remove(function() {});
		}

		done();
	});

	describe("Getting all tasks", function() {

		it("Should return http status 'ok' (200)", function(done) {
			request(app)				
				.get("/api/tasks")
				.set("Authorization", authenticationToken)
				.expect("Content-Type", /json/)	
				.expect(200, done);
		});

		it("Should only return the tasks which the logged user is the owner", function(done) {

			createPersistedTask("My task 1", user, function() {
				createPersistedTask("My task 2", new User(), function() {
					request(app)
						.get("/api/tasks")
						.set("Authorization", authenticationToken)					
						.expect(200)
						.end(function(err, res) {
							if (err) throw err;						

							assert.equal(1, res.body.length);
							assert.equal(user._id, res.body[0].owner);

							done();
						});
				});
			});
		});

		it("Should return http status 'Unauthorized' (401) if credentials are not valid", function(done) {
			request(app)				
				.get("/api/tasks")
				.expect(401, done);
		});
	});

	describe("Getting a task by identifier", function() {

		it("Should return http status 'ok' (200)", function(done) {

			createPersistedTask("My task", user, function(savedTask) {
				request(app)
					.get("/api/tasks/" + savedTask._id)
					.set("Authorization", authenticationToken)
					.expect(200, done);					
			});			
		});

		it("Should return the task", function(done) {

			createPersistedTask("My task", user, function(savedTask) {
				request(app)
					.get("/api/tasks/" + savedTask._id)
					.set("Authorization", authenticationToken)
					.expect("Content-Type", /json/)
					.end(function(err, res) {

						assert.equal(res.body._id, savedTask._id);
						assert.equal(res.body.name, savedTask.name);

						done();
					});
			});
		});

		it("Should return http status 'forbidden' (403) if the logged user is not the task owner", function(done) {

			createPersistedTask("My task", new User(), function(savedTask) {
				request(app)
					.get("/api/tasks/" + savedTask._id)
					.set("Authorization", authenticationToken)
					.expect(403, done);					
			});
		});

		it("Should return http status 'not found' (404) if task is missing", function(done) {
			request(app)
				.get("/api/tasks/" + fakeId)
				.set("Authorization", authenticationToken)
				.expect(404, done);
		});

		it("Should return http status 'unauthorized' (401) if credentials are not valid", function(done) {
			request(app)				
				.get("/api/tasks/" + fakeId)
				.expect(401, done);
		});
	});

	describe("Creating a new task", function(done) {

		it("Should return http status 'created' (201)", function(done) {

			createPersistedTask("My task", user, function(savedTask) {
				request(app)
					.post("/api/tasks")
					.send(savedTask)
					.set("Authorization", authenticationToken)
					.expect(201, done);
			});
		});

		it("Should return the task created", function(done) {

			createPersistedTask("My task", user, function(savedTask) {
				request(app)
					.post("/api/tasks")
					.send(savedTask)
					.set("Authorization", authenticationToken)
					.expect("Content-Type", /json/, done);
			});
		});

		it("Should add the created task in the data store", function(done) {

			createPersistedTask("My task", user, function(savedTask) {
				request(app)
					.post("/api/tasks")
					.send(savedTask)
					.set("Authorization", authenticationToken)
					.expect(200)
					.end(function(err, res) {
						Task.findById(res.body._id, function(err, createdTask) {
							assert.notEqual(createdTask, null);
							done();
						});
					});
			});
		});

		it("Should make the logged user owner's of the task", function(done) {

			createPersistedTask("My task", user, function(savedTask) {
				request(app)
					.post("/api/tasks")
					.send(savedTask)
					.set("Authorization", authenticationToken)
					.expect(200)
					.end(function(err, res) {
						assert.equal(user._id, res.body.owner);
						done();
				});
			});
		});

		it("Should return http status 'unauthorized' (401) if credentials are not valid", function(done) {

			createPersistedTask("My task", user, function(savedTask) {
				request(app)
					.post("/api/tasks")
					.send(savedTask)
					.expect(401, done);
			});
		});
	});

	describe("Updating a task", function() {

		it("Should return http status 'no content' 204", function(done) {

			createPersistedTask("My task", user, function(savedTask) {

				savedTask.name = "my task 2";
				
				request(app)
					.put("/api/tasks/"  + savedTask._id)
					.send(savedTask)
					.set("Authorization", authenticationToken)
					.expect(204, done);
			});
		});

		it("Should update the task in the data store", function(done) {

			createPersistedTask("My task", user, function(savedTask) {

				savedTask.name = "my task 2";

				request(app)
					.put("/api/tasks/"  + savedTask._id)
					.send(savedTask)
					.set("Authorization", authenticationToken)
					.end(function() {
						Task.findById(savedTask._id, function(err, updatedTask) {
							assert.equal(updatedTask.name, savedTask.name);
							done();
						})
					});
			});
		});

		it("Should return http status 'forbidden' (403) if the logged user is not the task owner", function(done) {

			createPersistedTask("My task", new User(), function(savedTask) {

				savedTask.name = "my task 2";
				
				request(app)
					.put("/api/tasks/"  + savedTask._id)
					.send(savedTask)
					.set("Authorization", authenticationToken)
					.expect(403)
					.end(function(err, res) {
						if (err) return done(err);

						Task.findById(savedTask._id, function(err2, lst) {
							if (err2) return done(err);
							assert.equal("My task", lst.name);
							done();
						});
					});
			});
		});

		it("Should return http status 'not found' (404) if task is missing", function(done) {

			createPersistedTask("My task", user, function(savedTask) {
				request(app)
					.put("/api/tasks/" + fakeId)
					.send(savedTask)
					.set("Authorization", authenticationToken)
					.expect(404, done);
			});
		});

		it("Should return http status 'unauthorized' (401) if credentials are not valid", function(done) {

			createPersistedTask("My task", user, function(savedTask) {

				savedTask.name = "my task 2";
				
				request(app)
					.put("/api/tasks/" + fakeId)
					.send(savedTask)
					.expect(401, done);
			});
		});
	});

	describe("Deleting a task", function() {

		it("Should return http status 'no content' (204)", function(done) {

			createPersistedTask("My task", user, function(savedTask) {
				request(app)
					.delete("/api/tasks/" + savedTask._id)
					.set("Authorization", authenticationToken)
					.expect(204, done);
			});
		});

		it("Should delete the task in the data store", function(done) {

			createPersistedTask("My task", user, function(savedTask) {
				request(app)
					.delete("/api/tasks/" + savedTask._id)
					.set("Authorization", authenticationToken)
					.end(function() {
						Task.findById(savedTask._id, function(err, deletedTask) {
							assert.equal(deletedTask, null);
							done();
						});
					});
			});
		});

		it("Should return http status 'forbidden' (403) if the logged user is not the task owner", function(done) {

			createPersistedTask("My task", new User(), function(savedTask) {
				request(app)
					.delete("/api/tasks/" + savedTask._id)
					.set("Authorization", authenticationToken)
					.expect(403)
					.end(function(err) {
						if (err) return done(err);

						Task.findById(savedTask._id, function(err2, task) {
							if (err2) return done(err2);			
							assert.notEqual(task, null);
							done();
						});
					});
			});
		});

		it("Should return http status 404 if task is missing", function(done) {
			request(app)
				.delete("/api/tasks/" + fakeId)
				.set("Authorization", authenticationToken)
				.expect(404, done);
		});		

		it("Should return http status Unauthorized (401) if credentials are not valid", function(done) {

			createPersistedTask("My task", user, function(savedTask) {
				request(app)
					.delete("/api/tasks/" + savedTask._id)
					.expect(401, done);
			});
		});
	});
});