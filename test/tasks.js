var assert = require("assert");
var request = require("supertest");
var mongoose = require("mongoose");
var base64 = require('base-64');

var app = require("../app");

var Models = require("../models");
var List = Models.List;
var Task = Models.Task;
var User = Models.User;

var fakeId = "000000000000000000000000";
var authenticationToken = "Basic " + base64.encode("foo:bar");

describe("Tasks route", function () {

    var user;

    var createPersistedTask = function (name, user, cb) {

        var newList = new List();

        newList.name = "My list";
        newList.owner = user;

        newList.save(function (err, savedList) {
            if (err) throw err;

            var newTask = new Task();

            newTask.name = "My task";
            newTask.owner = user;
            newTask.createdOn = new Date();
            newTask.belongTo = savedList;

            newTask.save(function (err, savedTask) {
                if (err) throw err;
                cb(savedTask);
            });
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
            createPersistedTask("My task", user, function (savedTask) {
                request(app)
                    .get("/api/lists/" + savedTask.belongTo + "/tasks/")
                    .set("Authorization", authenticationToken)
                    .expect("Content-Type", /json/)
                    .expect(200, done);
            });
        });

        it("Should only return the tasks which the logged user is the owner", function (done) {

            var newList = new List();

            newList.name = "My list";
            newList.owner = user;

            newList.save(function (err, savedList) {
                if (err) throw err;

                var newTask1 = new Task();

                newTask1.name = "My task #1";
                newTask1.owner = user;
                newTask1.createdOn = new Date();
                newTask1.belongTo = savedList;

                newTask1.save(function (err, savedTask) {
                    if (err) throw err;

                    var newTask2 = new Task();

                    newTask2.name = "My task #2";
                    newTask2.owner = new User();
                    newTask2.createdOn = new Date();
                    newTask2.belongTo = savedList;

                    newTask2.save(function (err) {
                        if (err) throw err;

                        request(app)
                            .get("/api/lists/" + savedTask.belongTo + "/tasks/")
                            .set("Authorization", authenticationToken)
                            .expect(200)
                            .end(function (err, res) {
                                if (err) throw err;

                                assert.equal(res.body.length, 1);
                                assert.equal(res.body[0].owner, user._id);

                                done();
                            });
                    });
                });
            });
        });

        it("Should only return the tasks that belong to the list", function (done) {

            var newList1 = new List();

            newList1.name = "My list";
            newList1.owner = user;

            newList1.save(function (err, savedList1) {
                if (err) throw err;

                var newTask1 = new Task();

                newTask1.name = "My task #1";
                newTask1.owner = user;
                newTask1.createdOn = new Date();
                newTask1.belongTo = savedList1;

                newTask1.save(function (err, savedTask) {
                    if (err) throw err;

                    var newList2 = new List();

                    newList2.name = "My list";
                    newList2.owner = user;

                    newList2.save(function (err, savedList2) {

                        var newTask2 = new Task();

                        newTask2.name = "My task #2";
                        newTask2.owner = user;
                        newTask2.createdOn = new Date();
                        newTask2.belongTo = savedList2;

                        newTask2.save(function (err) {
                            if (err) throw err;

                            request(app)
                                .get("/api/lists/" + savedTask.belongTo + "/tasks/")
                                .set("Authorization", authenticationToken)
                                .expect(200)
                                .end(function (err, res) {
                                    if (err) throw err;

                                    assert.equal(res.body.length, 1);
                                    assert.equal(res.body[0].belongTo, savedTask.belongTo);

                                    done();
                                });
                        });
                    });
                });
            });
        });

        it("Should return http status 'Unauthorized' (401) if credentials are not valid", function (done) {
            createPersistedTask("My task", user, function (savedTask) {
                request(app)
                    .get("/api/lists/" + savedTask.belongTo + "/tasks/" + fakeId)
                    .expect(401, done);
            });
        });
    });

    describe("Getting a task by identifier", function () {

        it("Should return http status 'ok' (200)", function (done) {

            createPersistedTask("My task", user, function (savedTask) {
                request(app)
                    .get("/api/lists/" + savedTask.belongTo + "/tasks/" + savedTask._id)
                    .set("Authorization", authenticationToken)
                    .expect(200, done);
            });
        });

        it("Should return the task", function (done) {

            createPersistedTask("My task", user, function (savedTask) {
                request(app)
                    .get("/api/lists/" + savedTask.belongTo + "/tasks/" + savedTask._id)
                    .set("Authorization", authenticationToken)
                    .expect("Content-Type", /json/)
                    .end(function (err, res) {

                        assert.equal(res.body._id, savedTask._id);
                        assert.equal(res.body.name, savedTask.name);

                        done();
                    });
            });
        });

        it("Should return http status 'forbidden' (403) if the logged user is not the task owner", function (done) {
            createPersistedTask("My task", new User(), function (savedTask) {
                request(app)
                    .get("/api/lists/" + savedTask.belongTo + "/tasks/" + savedTask._id)
                    .set("Authorization", authenticationToken)
                    .expect(403, done);
            });
        });

        it("Should return http status 'not found' (404) if task does not exists", function (done) {
            createPersistedTask("My task", user, function (savedTask) {
                request(app)
                    .get("/api/lists/" + savedTask.belongTo + "/tasks/" + fakeId)
                    .set("Authorization", authenticationToken)
                    .expect(404, done);
            });
        });

        it("Should return http status 'not found' (404) if task does exists but does not belong to the list", function (done) {
            createPersistedTask("My task 1", user, function (savedTask1) {
                createPersistedTask("My task 2", user, function (savedTask2) {
                    request(app)
                        .get("/api/lists/" + savedTask1.belongTo + "/tasks/" + savedTask2._id)
                        .set("Authorization", authenticationToken)
                        .expect(404, done);
                });
            });
        });

        it("Should return http status 'unauthorized' (401) if credentials are not valid", function (done) {
            createPersistedTask("My task", user, function (savedTask) {
                request(app)
                    .get("/api/lists/" + savedTask.belongTo + "/tasks/" + savedTask._id)
                    .expect(401, done);
            });
        });
    });

    describe("Creating a new task", function (done) {

        it("Should return http status 'created' (201)", function (done) {
            createPersistedTask("My task", user, function (savedTask) {
                request(app)
                    .post("/api/lists/" + savedTask.belongTo + "/tasks/")
                    .send(savedTask)
                    .set("Authorization", authenticationToken)
                    .expect(201, done);
            });
        });

        it("Should return the task created", function (done) {
            createPersistedTask("My task", user, function (savedTask) {
                request(app)
                    .post("/api/lists/" + savedTask.belongTo + "/tasks/")
                    .send(savedTask)
                    .set("Authorization", authenticationToken)
                    .expect("Content-Type", /json/, done);
            });
        });

        it("Should add the created task in the data store", function (done) {
            createPersistedTask("My task", user, function (savedTask) {
                request(app)
                    .post("/api/lists/" + savedTask.belongTo + "/tasks/")
                    .send(savedTask)
                    .set("Authorization", authenticationToken)
                    .expect(200)
                    .end(function (err, res) {
                        Task.findById(res.body._id, function (err, createdTask) {
                            assert.notEqual(createdTask, null);
                            done();
                        });
                    });
            });
        });

        it("Should make the logged user owner's of the task", function (done) {
            createPersistedTask("My task", user, function (savedTask) {
                request(app)
                    .post("/api/lists/" + savedTask.belongTo + "/tasks/")
                    .send(savedTask)
                    .set("Authorization", authenticationToken)
                    .expect(200)
                    .end(function (err, res) {
                        assert.equal(user._id, res.body.owner);
                        done();
                    });
            });
        });

        it("Should make the tasks belong to the list", function (done) {
            createPersistedTask("My task", user, function (savedTask) {
                request(app)
                    .post("/api/lists/" + savedTask.belongTo + "/tasks/")
                    .send(savedTask)
                    .set("Authorization", authenticationToken)
                    .expect(200)
                    .end(function (err, res) {
                        assert.equal(res.body.belongTo, savedTask.belongTo);
                        done();
                    });
            });
        });

        it("Should return http status 'unauthorized' (401) if credentials are not valid", function (done) {
            createPersistedTask("My task", user, function (savedTask) {
                request(app)
                    .post("/api/lists/" + savedTask.belongTo + "/tasks/")
                    .send(savedTask)
                    .expect(401, done);
            });
        });
    });

    describe("Updating a task", function () {

        it("Should return http status 'no content' 204", function (done) {
            createPersistedTask("My task", user, function (savedTask) {
                savedTask.name = "my task 2";
                request(app)
                    .put("/api/lists/" + savedTask.belongTo + "/tasks/" + savedTask._id)
                    .send(savedTask)
                    .set("Authorization", authenticationToken)
                    .expect(204, done);
            });
        });

        it("Should update the task in the data store", function (done) {
            createPersistedTask("My task", user, function (savedTask) {
                savedTask.name = "my task 2";
                request(app)
                    .put("/api/lists/" + savedTask.belongTo + "/tasks/" + savedTask._id)
                    .send(savedTask)
                    .set("Authorization", authenticationToken)
                    .end(function () {
                        Task.findById(savedTask._id, function (err, updatedTask) {
                            assert.equal(updatedTask.name, savedTask.name);
                            done();
                        })
                    });
            });
        });

        it("Should return http status 'forbidden' (403) if the logged user is not the task owner", function (done) {
            createPersistedTask("My task", new User(), function (savedTask) {
                savedTask.name = "my task 2";
                request(app)
                    .put("/api/lists/" + savedTask.belongTo + "/tasks/" + savedTask._id)
                    .send(savedTask)
                    .set("Authorization", authenticationToken)
                    .expect(403)
                    .end(function (err, res) {
                        if (err) return done(err);

                        Task.findById(savedTask._id, function (err2, lst) {
                            if (err2) return done(err);
                            assert.equal("My task", lst.name);
                            done();
                        });
                    });
            });
        });

        it("Should return http status 'not found' (404) if task does not exists", function (done) {
            createPersistedTask("My task", user, function (savedTask) {
                request(app)
                    .put("/api/lists/" + savedTask.belongTo + "/tasks/" + fakeId)
                    .send(savedTask)
                    .set("Authorization", authenticationToken)
                    .expect(404, done);
            });
        });

        it("Should return http status 'not found' (404) if task does exists but does not belong to the list", function (done) {
            createPersistedTask("My task 1", user, function (savedTask1) {
                createPersistedTask("My task 2", user, function (savedTask2) {
                    savedTask2.name = "My task 3";
                    request(app)
                        .put("/api/lists/" + savedTask1.belongTo + "/tasks/" + savedTask2._id)
                        .send(savedTask2)
                        .set("Authorization", authenticationToken)
                        .expect(404, done);
                });
            });
        });

        it("Should return http status 'unauthorized' (401) if credentials are not valid", function (done) {
            createPersistedTask("My task", user, function (savedTask) {
                savedTask.name = "my task 2";
                request(app)
                    .put("/api/lists/" + savedTask.belongTo + "/tasks/" + savedTask._id)
                    .send(savedTask)
                    .expect(401, done);
            });
        });
    });

    describe("Deleting a task", function () {

        it("Should return http status 'no content' (204)", function (done) {
            createPersistedTask("My task", user, function (savedTask) {
                request(app)
                    .delete("/api/lists/" + savedTask.belongTo + "/tasks/" + savedTask._id)
                    .set("Authorization", authenticationToken)
                    .expect(204, done);
            });
        });

        it("Should delete the task in the data store", function (done) {
            createPersistedTask("My task", user, function (savedTask) {
                request(app)
                    .delete("/api/lists/" + savedTask.belongTo + "/tasks/" + savedTask._id)
                    .set("Authorization", authenticationToken)
                    .end(function () {
                        Task.findById(savedTask._id, function (err, deletedTask) {
                            assert.equal(deletedTask, null);
                            done();
                        });
                    });
            });
        });

        it("Should return http status 'forbidden' (403) if the logged user is not the task owner", function (done) {
            createPersistedTask("My task", new User(), function (savedTask) {
                request(app)
                    .delete("/api/lists/" + savedTask.belongTo + "/tasks/" + savedTask._id)
                    .set("Authorization", authenticationToken)
                    .expect(403)
                    .end(function (err) {
                        if (err) return done(err);

                        Task.findById(savedTask._id, function (err2, task) {
                            if (err2) return done(err2);
                            assert.notEqual(task, null);
                            done();
                        });
                    });
            });
        });

        it("Should return http status 404 if task does not exists", function (done) {
            createPersistedTask("My task", user, function (savedTask) {
                request(app)
                    .delete("/api/lists/" + savedTask.belongTo + "/tasks/" + fakeId)
                    .set("Authorization", authenticationToken)
                    .expect(404, done);
            });
        });

        it("Should return http status 404 if task does exists but does not belong to the list", function (done) {
            createPersistedTask("My task 1", user, function (savedTask1) {
                createPersistedTask("My task 2", user, function (savedTask2) {
                    request(app)
                        .delete("/api/lists/" + savedTask1.belongTo + "/tasks/" + savedTask2._id)
                        .set("Authorization", authenticationToken)
                        .expect(404, done);
                });
            });
        });

        it("Should return http status Unauthorized (401) if credentials are not valid", function (done) {
            createPersistedTask("My task", user, function (savedTask) {
                request(app)
                    .delete("/api/lists/" + savedTask.belongTo + "/tasks/" + savedTask._id)
                    .expect(401, done);
            });
        });
    });
});