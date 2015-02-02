var assert = require("assert");
var request = require("supertest");
var mongoose = require("mongoose");
var base64 = require('base-64');

var app = require("../app");

var User = require("../../lib/user");
var List = require("../../lib/task");

var authenticationToken = "Basic " + base64.encode("foo:bar");

var cleanDatabase = function () {
    for (var collection in mongoose.connection.collections) {
        mongoose.connection.collections[collection].remove(function () {
        });
    }
};

describe("Getting all tasks", function () {

    var user;
    var list;
    var task;

    before(function () {
        cleanDatabase();

        user = new User({username: "foo", password: "bar"});
        user.save();

        list = new List({name: "My list", owner: user});
        task = list.task.create({name: "My task"});

        list.task.push(task);

        list.save();
    });

    it("Should return http status 'ok' (200)", function (done) {
        request(app)
            .get("/api/lists/" + list._id + "/tasks/")
            .set("Authorization", authenticationToken)
            .expect("Content-Type", /json/)
            .expect(200, done);
    });
});

describe("Getting a task by identifier", function () {

    var user;
    var list;
    var task;

    before(function () {
        cleanDatabase();

        user = new User({username: "foo", password: "bar"});
        user.save();

        list = new List({name: "My list", owner: user});
        task = list.task.create({name: "My task"});

        list.task.push(task);

        list.save();
    });

    it("Should return http status 'ok' (200)", function (done) {
        request(app)
            .get("/api/lists/" + list._id + "/tasks/" + task._id)
            .set("Authorization", authenticationToken)
            .expect(200, done);
    });

    it("Should return the task", function (done) {
        request(app)
            .get("/api/lists/" + list._id + "/tasks/" + task._id)
            .set("Authorization", authenticationToken)
            .expect("Content-Type", /json/)
            .end(function (err, res) {
                if (err) return done(err);
                assert.equal(res.body._id, task._id);
                assert.equal(res.body.name, task.name);
                done();
            });
    });
});

describe("Creating a new task", function () {

    var user;
    var list;
    var task;

    before(function () {
        cleanDatabase();

        user = new User({username: "foo", password: "bar"});
        user.save();

        list = new List({name: "My list", owner: user});
        list.save();

        task = list.task.create({name: "My task"});
    });

    it("Should return http status 'created' (201)", function (done) {
        request(app)
            .post("/api/lists/" + list._id + "/tasks/")
            .send(task)
            .set("Authorization", authenticationToken)
            .expect(201, done);
    });

    it("Should return the task created", function (done) {
        request(app)
            .post("/api/lists/" + list._id + "/tasks/")
            .send(task)
            .set("Authorization", authenticationToken)
            .expect("Content-Type", /json/, done);
    });
});

describe("Updating a task", function () {

    var user;
    var list;
    var task;

    before(function () {
        cleanDatabase();

        user = new User({username: "foo", password: "bar"});
        user.save();

        list = new List({name: "My list", owner: user});
        task = list.task.create({name: "My task"});

        list.task.push(task);

        list.save();
    });

    it("Should return http status 'no content' 204", function (done) {
        request(app)
            .put("/api/lists/" + list._id + "/tasks/" + task._id)
            .send({name: "my task 2"})
            .set("Authorization", authenticationToken)
            .expect(204, done);
    });

    it("Should update the task in the data store", function (done) {
        request(app)
            .put("/api/lists/" + list._id + "/tasks/" + task._id)
            .send({name: "my task 2", isDone: true})
            .set("Authorization", authenticationToken)
            .end(function () {
                List.findById(list._id, function (err, fetchedList) {
                    if (err) return done(err);
                    var fetchedTask = fetchedList.task.id(task._id);
                    assert.equal(fetchedTask.name, "my task 2");
                    assert.equal(fetchedTask.isDone, true);
                    done();
                })
            });
    });
});

describe("Deleting a task", function () {

    var user;
    var list;
    var task;

    before(function () {
        cleanDatabase();

        user = new User({username: "foo", password: "bar"});
        user.save();

        list = new List({name: "My list", owner: user});
        task = list.task.create({name: "My task"});

        list.task.push(task);

        list.save();
    });

    it("Should return http status 'no content' (204)", function (done) {
        request(app)
            .delete("/api/lists/" + list._id + "/tasks/" + task._id)
            .set("Authorization", authenticationToken)
            .expect(204, done);
    });

    it("Should delete the task in the data store", function (done) {
        request(app)
            .delete("/api/lists/" + list._id + "/tasks/" + task._id)
            .set("Authorization", authenticationToken)
            .end(function () {
                List.findById(list._id, function (err, list) {
                    if (err) return done(err);
                    assert.equal(list.task.id(task._id), null);
                    done();
                })
            });
    });
});

describe("Credentials are not valid", function () {

    var user;
    var list;
    var task;

    before(function () {
        cleanDatabase();

        user = new User({username: "foo", password: "bar"});
        user.save();

        list = new List({name: "My list", owner: user});
        task = list.task.create({name: "My task"});

        list.task.push(task);

        list.save();
    });

    it("Getting all lists returns http status 'Unauthorized' (401)", function (done) {
        request(app)
            .get("/api/lists/" + list._id + "/tasks/" + task._id)
            .expect(401, done);
    });

    it("Getting a list returns http status 'unauthorized' (401)", function (done) {
        request(app)
            .get("/api/lists/" + list._id + "/tasks/" + task._id)
            .expect(401, done);
    });

    it("Creating a list returns http status 'unauthorized' (401)", function (done) {
        request(app)
            .post("/api/lists/" + list._id + "/tasks/")
            .send(list.task.create({name: "My task2"}))
            .expect(401, done);
    });

    it("Updating a list returns http status 'unauthorized' (401)", function (done) {
        request(app)
            .put("/api/lists/" + list._id + "/tasks/" + task._id)
            .send({name: "my task 2"})
            .expect(401, done);
    });

    it("Deleting a list returns http status Unauthorized (401)", function (done) {
        request(app)
            .delete("/api/lists/" + list._id + "/tasks/" + task._id)
            .expect(401, done);
    });
});

describe("Task does not exists", function () {

    var user;
    var list;
    var fakeId = "000000000000000000000000";

    before(function () {
        cleanDatabase();

        user = new User({username: "foo", password: "bar"});
        user.save();

        list = new List({name: "My list", owner: user});
        task = list.task.create({name: "My task"});

        list.task.push(task);

        list.save();
    });

    it("Getting a task returns http status 'not found' (404)", function (done) {
        request(app)
            .get("/api/lists/" + list._id + "/tasks/" + fakeId)
            .set("Authorization", authenticationToken)
            .expect(404, done);
    });

    it("Updating a task returns http status 'not found' (404)", function (done) {
        request(app)
            .put("/api/lists/" + list._id + "/tasks/" + fakeId)
            .send({name: "my task 2"})
            .set("Authorization", authenticationToken)
            .expect(404, done);
    });

    it("Deleting a task returns http status 'not found' (404)", function (done) {
        request(app)
            .delete("/api/lists/" + list._id + "/tasks/" + fakeId)
            .set("Authorization", authenticationToken)
            .expect(404, done);
    });
});

describe("Task does not belong to the user list", function () {

    var user;
    var list;
    var task;

    before(function () {
        cleanDatabase();

        user = new User({username: "foo", password: "bar"});
        user.save();

        list = new List({name: "My list", owner: user});
        list.save();

        var anotherList = new List({name: "My another list", owner: user});
        task = anotherList.task.create({name: "My task"});

        anotherList.task.push(task);

        anotherList.save();
    });

    it("Getting a task returns http status 'not found' (404)", function (done) {
        request(app)
            .get("/api/lists/" + list._id + "/tasks/" + task._id)
            .set("Authorization", authenticationToken)
            .expect(404, done);
    });

    it("Updating a task returns http status 'not found' (404)", function (done) {
        request(app)
            .put("/api/lists/" + list._id + "/tasks/" + task._id)
            .send({name: "my task 2"})
            .set("Authorization", authenticationToken)
            .expect(404, done);
    });

    it("Delete a task returns http status 'not found' (404)", function (done) {
        request(app)
            .delete("/api/lists/" + list._id + "/tasks/" + task._id)
            .set("Authorization", authenticationToken)
            .expect(404, done);
    });
});