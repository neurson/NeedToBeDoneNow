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

    before(function () {

        // Clean database
        for (var collection in mongoose.connection.collections) {
            mongoose.connection.collections[collection].remove(function () {
            });
        }

        // Create a valid user
        user = new User( { username: "foo", password: "bar"} );
        user.save();
    });

    after(function (done) {
        done();
    });

    describe("Getting all tasks", function () {

        it("Should return http status 'ok' (200)", function (done) {

            var newList = new List( { name: "My list", owner: user } );
            var newTask = newList.task.create( { name: "My task" } );

            newList.task.push(newTask);

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .get("/api/lists/" + savedList._id + "/tasks/")
                    .set("Authorization", authenticationToken)
                    .expect("Content-Type", /json/)
                    .expect(200, done);
            });
        });

        it("Should return http status 'Unauthorized' (401) if credentials are not valid", function (done) {

            var newList = new List( { name: "My list", owner: user } );
            var newTask = newList.task.create( { name: "My task" } );

            newList.task.push(newTask);

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .get("/api/lists/" + savedList._id + "/tasks/" + fakeId)
                    .expect(401, done);
            });
        });
    });

    describe("Getting a task by identifier", function () {
        it("Should return http status 'ok' (200)", function (done) {

            var newList = new List( { name: "My list", owner: user } );
            var newTask = newList.task.create( { name: "My task" } );

            newList.task.push(newTask);

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .get("/api/lists/" + savedList._id + "/tasks/" + newTask._id)
                    .set("Authorization", authenticationToken)
                    .expect(200, done);
            });
        });

        it("Should return the task", function (done) {

            var newList = new List( { name: "My list", owner: user } );
            var newTask = newList.task.create( { name: "My task" } );

            newList.task.push(newTask);

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .get("/api/lists/" + savedList._id + "/tasks/" + newTask._id)
                    .set("Authorization", authenticationToken)
                    .expect("Content-Type", /json/)
                    .end(function (err, res) {
                        if (err) throw err;
                        assert.equal(res.body._id, newTask._id);
                        assert.equal(res.body.name, newTask.name);
                        done();
                    });
            });
        });

        it("Should return http status 'not found' (404) if task does not exists", function (done) {

            var newList = new List( { name: "My list", owner: user } );

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .get("/api/lists/" + savedList._id + "/tasks/" + fakeId)
                    .set("Authorization", authenticationToken)
                    .expect(404, done);
            });
        });

        it("Should return http status 'not found' (404) if task does exists but does not belong to the list", function (done) {

            var newList1 = new List( { name: "My list", owner: user } );
            var newTask1 = newList1.task.create( { name: "My task" } );

            newList1.task.push(newTask1);

            newList1.save(function (err, savedList1) {
                if (err) throw err;

                var newList2 = new List( { name: "My list", owner: user } );
                var newTask2 = newList2.task.create( { name: "My task" } );

                newList2.task.push(newTask2);

                newList2.save(function (err) {
                    if (err) throw err;

                    request(app)
                        .get("/api/lists/" + savedList1._id + "/tasks/" + newTask2._id)
                        .set("Authorization", authenticationToken)
                        .expect(404, done);
                });
            });
        });

        it("Should return http status 'unauthorized' (401) if credentials are not valid", function (done) {

            var newList = new List( { name: "My list", owner: user } );
            var newTask = newList.task.create( { name: "My task" } );

            newList.task.push(newTask);

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .get("/api/lists/" + savedList._id + "/tasks/" + newTask._id)
                    .expect(401, done);
            });
        });
    });

    describe("Creating a new task", function () {

        it("Should return http status 'created' (201)", function (done) {

            var newList = new List( { name: "My list", owner: user } );
            var newTask = newList.task.create( { name: "My task" } );

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .post("/api/lists/" + savedList._id + "/tasks/")
                    .send(newTask)
                    .set("Authorization", authenticationToken)
                    .expect(201, done);
            });
        });

        it("Should return the task created", function (done) {

            var newList = new List( { name: "My list", owner: user } );
            var newTask = newList.task.create( { name: "My task" } );

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .post("/api/lists/" + savedList._id + "/tasks/")
                    .send(newTask)
                    .set("Authorization", authenticationToken)
                    .expect("Content-Type", /json/, done);
            });
        });

        it("Should return http status 'unauthorized' (401) if credentials are not valid", function (done) {

            var newList = new List( { name: "My list", owner: new User() } );
            var newTask = newList.task.create( { name: "My task" } );

            newList.save(function (err) {
                if (err) throw err;

                request(app)
                    .post("/api/lists/" + newTask._id + "/tasks/")
                    .send(newTask)
                    .expect(401, done);
            });
        });
    });

    describe("Updating a task", function () {

        it("Should return http status 'no content' 204", function (done) {

            var newList = new List( { name: "My list", owner:  user } );
            var newTask = newList.task.create( { name: "My task" } );

            newList.task.push(newTask);

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .put("/api/lists/" + savedList._id + "/tasks/" + newTask._id)
                    .send( {name: "my task 2"} )
                    .set("Authorization", authenticationToken)
                    .expect(204, done);
            });
        });

        it("Should update the task in the data store", function (done) {

            var newList = new List( { name: "My list", owner: user } );
            var newTask = newList.task.create( { name: "My task" } );

            newList.task.push(newTask);

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .put("/api/lists/" + savedList._id + "/tasks/" + newTask._id)
                    .send( {name: "my task 2"} )
                    .set("Authorization", authenticationToken)
                    .end(function () {
                        List.findById(savedList._id, function (err, list) {
                            if (err) throw err;
                            assert.equal(list.task.id(newTask._id).name, "my task 2");
                            done();
                        })
                    });
            });
        });

        it("Should return http status 'not found' (404) if task does not exists", function (done) {

            var newList = new List( { name: "My list", owner: user } );

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .put("/api/lists/" + savedList._id + "/tasks/" + fakeId)
                    .send( {name: "my task 2"} )
                    .set("Authorization", authenticationToken)
                    .expect(404, done);
            });
        });

        it("Should return http status 'not found' (404) if task does exists but does not belong to the list", function (done) {

            var newList1 = new List( { name: "My list", owner: user } );
            var newTask1 = newList1.task.create( { name: "My task" } );

            newList1.task.push(newTask1);

            newList1.save(function (err, savedList1) {
                if (err) throw err;

                var newList2 = new List( { name: "My list", owner: user } );
                var newTask2 = newList2.task.create( { name: "My task" } );

                newList2.task.push(newTask2);

                newList2.save(function (err, savedList2) {
                    if (err) throw err;

                    request(app)
                        .put("/api/lists/" + savedList1._id + "/tasks/" + newTask2._id)
                        .send( {name: "my task 2"} )
                        .set("Authorization", authenticationToken)
                        .expect(404, done);
                });
            });
        });

        it("Should return http status 'unauthorized' (401) if credentials are not valid", function (done) {

            var newList = new List( { name: "My list", owner: user } );
            var newTask = newList.task.create( { name: "My task" } );

            newList.task.push(newTask);

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .put("/api/lists/" + savedList._id + "/tasks/" + newTask._id)
                    .send( {name: "my task 2"} )
                    .expect(401, done);
            });
        });
    });

    describe("Deleting a task", function () {

        it("Should return http status 'no content' (204)", function (done) {

            var newList = new List( { name: "My list", owner: user } );
            var newTask = newList.task.create( { name: "My task" } );

            newList.task.push(newTask);

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .delete("/api/lists/" + savedList._id + "/tasks/" + newTask._id)
                    .set("Authorization", authenticationToken)
                    .expect(204, done);
            });
        });

        it("Should delete the task in the data store", function (done) {

            var newList = new List( { name: "My list", owner: user } );
            var newTask = newList.task.create( { name: "My task" } );

            newList.task.push(newTask);

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .delete("/api/lists/" + savedList._id + "/tasks/" + newTask._id)
                    .set("Authorization", authenticationToken)
                    .end(function () {
                        List.findById(savedList._id, function (err, list) {
                            if (err) throw err;
                            assert.equal(list.task.id(newTask._id), null);
                            done();
                        })
                    });
            });
        });

        it("Should return http status 404 if task does not exists", function (done) {

            var newList = new List( { name: "My list", owner: user } );

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .delete("/api/lists/" + savedList._id + "/tasks/" + fakeId)
                    .set("Authorization", authenticationToken)
                    .expect(404, done);
            });
        });

        it("Should return http status 404 if task does exists but does not belong to the list", function (done) {

            var newList1 = new List( { name: "My list 1", owner: user } );
            var newTask1 = newList1.task.create( { name: "My task 1" } );

            newList1.task.push(newTask1);

            newList1.save(function (err, savedList1) {
                if (err) throw err;

                var newList2 = new List( { name: "My list 2", owner: user } );
                var newTask2 = newList2.task.create( { name: "My task 2" } );

                newList2.task.push(newTask2);

                newList2.save(function (err) {
                    if (err) throw err;

                    request(app)
                        .delete("/api/lists/" + savedList1._id + "/tasks/" + newTask2._id)
                        .set("Authorization", authenticationToken)
                        .expect(404, done);
                });
            });
        });

        it("Should return http status Unauthorized (401) if credentials are not valid", function (done) {

            var newList = new List( { name: "My list", owner: user } );
            var newTask = newList.task.create( { name: "My task" } );

            newList.task.push(newTask);

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .delete("/api/lists/" + savedList._id + "/tasks/" + newTask._id)
                    .expect(401, done);
            });
        });
    });
});