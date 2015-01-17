var assert = require("assert");
var request = require("supertest");
var mongoose = require("mongoose");
var base64 = require('base-64');

var app = require("../app");

var Models = require("../models");
var List = Models.List;
var User = Models.User;

var fakeId = "000000000000000000000000";
var authenticationToken = "Basic " + base64.encode("foo:bar");

describe("Tasks route", function () {

    var user;

    var createPersistedTask = function (name, user, cb) {

        var newList = new List({ name: "My list", owner: user });

        var newTask = newList.task.create({
            name: "My task"
        });

        newList.task.push(newTask);

        newList.save(function (err, newList) {
            if (err) throw err;
            cb(newList, newTask);
        });
    };

    before(function () {

        // Clean database
        for (var collection in mongoose.connection.collections) {
            mongoose.connection.collections[collection].remove(function () {
            });
        }

        // Create a valid user
        user = new User();

        user.username = "foo";
        user.password = "bar";

        user.save();
    });

    after(function (done) {
        done();
    });

    describe("Getting all tasks", function () {
        it("Should return http status 'ok' (200)", function (done) {
            createPersistedTask("My task", user, function (savedList) {
                request(app)
                    .get("/api/lists/" + savedList._id + "/tasks/")
                    .set("Authorization", authenticationToken)
                    .expect("Content-Type", /json/)
                    .expect(200, done);
            });
        });

        it("Should return http status 'Unauthorized' (401) if credentials are not valid", function (done) {
            createPersistedTask("My task", user, function (savedList) {
                request(app)
                    .get("/api/lists/" + savedList._id + "/tasks/" + fakeId)
                    .expect(401, done);
            });
        });
    });

    describe("Getting a task by identifier", function () {
        it("Should return http status 'ok' (200)", function (done) {
            createPersistedTask("My task", user, function (savedList, savedTask) {
                request(app)
                    .get("/api/lists/" + savedList._id + "/tasks/" + savedTask._id)
                    .set("Authorization", authenticationToken)
                    .expect(200, done);
            });
        });

        it("Should return the task", function (done) {
            createPersistedTask("My task", user, function (savedList, savedTask) {
                request(app)
                    .get("/api/lists/" + savedList._id + "/tasks/" + savedTask._id)
                    .set("Authorization", authenticationToken)
                    .expect("Content-Type", /json/)
                    .end(function (err, res) {
                        if (err) throw err;
                        assert.equal(res.body._id, savedTask._id);
                        assert.equal(res.body.name, savedTask.name);
                        done();
                    });
            });
        });

        it("Should return http status 'not found' (404) if task does not exists", function (done) {
            createPersistedTask("My task", user, function (savedList) {
                request(app)
                    .get("/api/lists/" + savedList._id + "/tasks/" + fakeId)
                    .set("Authorization", authenticationToken)
                    .expect(404, done);
            });
        });

        it("Should return http status 'not found' (404) if task does exists but does not belong to the list", function (done) {
            createPersistedTask("My task 1", user, function (savedList1) {
                createPersistedTask("My task 2", user, function (savedList2, savedTask2) {
                    request(app)
                        .get("/api/lists/" + savedList1._id + "/tasks/" + savedTask2._id)
                        .set("Authorization", authenticationToken)
                        .expect(404, done);
                });
            });
        });

        it("Should return http status 'unauthorized' (401) if credentials are not valid", function (done) {
            createPersistedTask("My task", user, function (savedList, savedTask) {
                request(app)
                    .get("/api/lists/" + savedList._id + "/tasks/" + savedTask._id)
                    .expect(401, done);
            });
        });
    });

    describe("Creating a new task", function () {
        it("Should return http status 'created' (201)", function (done) {
            // TODO: You can add a task that as been already persisted... Why your API allows that?!? Why your test does not use a new task instead?!?
            createPersistedTask("My task", user, function (savedList, savedTask) {
                request(app)
                    .post("/api/lists/" + savedList._id + "/tasks/")
                    .send(savedTask)
                    .set("Authorization", authenticationToken)
                    .expect(201, done);
            });
        });

        it("Should return the task created", function (done) {
            createPersistedTask("My task", user, function (savedList, savedTask) {
                request(app)
                    .post("/api/lists/" + savedList._id + "/tasks/")
                    .send(savedTask)
                    .set("Authorization", authenticationToken)
                    .expect("Content-Type", /json/, done);
            });
        });

        it("Should return http status 'unauthorized' (401) if credentials are not valid", function (done) {
            createPersistedTask("My task", user, function (savedList, savedTask) {
                request(app)
                    .post("/api/lists/" + savedList._id + "/tasks/")
                    .send(savedTask)
                    .expect(401, done);
            });
        });
    });

    describe("Updating a task", function () {
        it("Should return http status 'no content' 204", function (done) {
            createPersistedTask("My task", user, function (savedList, savedTask) {
                request(app)
                    .put("/api/lists/" + savedList._id + "/tasks/" + savedTask._id)
                    .send( {name: "my task 2"} )
                    .set("Authorization", authenticationToken)
                    .expect(204, done);
            });
        });

        it("Should update the task in the data store", function (done) {
            createPersistedTask("My task", user, function (savedList, savedTask) {
                request(app)
                    .put("/api/lists/" + savedList._id + "/tasks/" + savedTask._id)
                    .send( {name: "my task 2"} )
                    .set("Authorization", authenticationToken)
                    .end(function () {
                        List.findById(savedList._id, function (err, list) {
                            if (err) throw err;
                            assert.equal(list.task.id(savedTask._id).name, "my task 2");
                            done();
                        })
                    });
            });
        });

        it("Should return http status 'not found' (404) if task does not exists", function (done) {
            createPersistedTask("My task", user, function (savedList, savedTask) {
                request(app)
                    .put("/api/lists/" + savedList._id + "/tasks/" + fakeId)
                    .send( {name: "my task 2"} )
                    .set("Authorization", authenticationToken)
                    .expect(404, done);
            });
        });

        it("Should return http status 'not found' (404) if task does exists but does not belong to the list", function (done) {
            createPersistedTask("My task 1", user, function (savedList1, savedTask1) {
                createPersistedTask("My task 2", user, function (savedList2, savedTask2) {
                    request(app)
                        .put("/api/lists/" + savedList1._id + "/tasks/" + savedTask2._id)
                        .send( {name: "my task 2"} )
                        .set("Authorization", authenticationToken)
                        .expect(404, done);
                });
            });
        });

        it("Should return http status 'unauthorized' (401) if credentials are not valid", function (done) {
            createPersistedTask("My task", user, function (savedList, savedTask) {
                request(app)
                    .put("/api/lists/" + savedList._id + "/tasks/" + savedTask._id)
                    .send( {name: "my task 2"} )
                    .expect(401, done);
            });
        });
    });

    describe("Deleting a task", function () {
        it("Should return http status 'no content' (204)", function (done) {
            createPersistedTask("My task", user, function (savedList, savedTask) {
                request(app)
                    .delete("/api/lists/" + savedList._id + "/tasks/" + savedTask._id)
                    .set("Authorization", authenticationToken)
                    .expect(204, done);
            });
        });

        it("Should delete the task in the data store", function (done) {
            createPersistedTask("My task", user, function (savedList, savedTask) {
                request(app)
                    .delete("/api/lists/" + savedList._id + "/tasks/" + savedTask._id)
                    .set("Authorization", authenticationToken)
                    .end(function () {
                        List.findById(savedList._id, function (err, list) {
                            if (err) throw err;
                            assert.equal(list.task.id(savedTask._id), null);
                            done();
                        })
                    });
            });
        });

        it("Should return http status 404 if task does not exists", function (done) {
            createPersistedTask("My task", user, function (savedList) {
                request(app)
                    .delete("/api/lists/" + savedList._id + "/tasks/" + fakeId)
                    .set("Authorization", authenticationToken)
                    .expect(404, done);
            });
        });

        it("Should return http status 404 if task does exists but does not belong to the list", function (done) {
            createPersistedTask("My task 1", user, function (savedList1, savedTask1) {
                createPersistedTask("My task 2", user, function (savedList2, savedTask2) {
                    request(app)
                        .delete("/api/lists/" + savedList1._id + "/tasks/" + savedTask2._id)
                        .set("Authorization", authenticationToken)
                        .expect(404, done);
                });
            });
        });

        it("Should return http status Unauthorized (401) if credentials are not valid", function (done) {
            createPersistedTask("My task", user, function (savedList, savedTask) {
                request(app)
                    .delete("/api/lists/" + savedList._id + "/tasks/" + savedTask._id)
                    .expect(401, done);
            });
        });
    });
});