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

describe("Getting all lists", function () {

    var user;
    var list;

    before(function () {
        cleanDatabase();

        user = new User({username: "foo", password: "bar"});
        user.save();

        list = new List({name: "My list", owner: user});
        list.save();
    });

    it("Returns http status 'ok' (200)", function (done) {
        request(app)
            .get("/api/lists")
            .set("Authorization", authenticationToken)
            .expect(200, done);
    });

    it("Return all list owned by the user", function (done) {
        request(app)
            .get("/api/lists")
            .set("Authorization", authenticationToken)
            .expect("Content-Type", /json/)
            .end(function (err, res) {
                assert.equal(res.body.length, 1);
                done();
            });
    });
});

describe("Getting a list", function () {

    var user;
    var list;

    before(function () {
        cleanDatabase();

        user = new User({username: "foo", password: "bar"});
        user.save();

        list = new List({name: "My list", owner: user});
        list.save();
    });

    it("Returns http status 'ok' (200)", function (done) {
        request(app)
            .get("/api/lists/" + list._id)
            .set("Authorization", authenticationToken)
            .expect(200, done);
    });

    it("Returns the list", function (done) {
        request(app)
            .get("/api/lists/" + list._id)
            .set("Authorization", authenticationToken)
            .expect("Content-Type", /json/)
            .end(function (err, res) {
                assert.equal(res.body._id, list._id);
                assert.equal(res.body.name, list.name);
                done();
            });
    });
});

describe("Creating a new list", function () {

    var user;
    var newList;

    before(function () {
        cleanDatabase();

        user = new User({username: "foo", password: "bar"});
        user.save();

        newList = new List({name: "My list", owner: user});
    });

    it("Returns http status 'created' (201)", function (done) {
        newList.save(function (err, savedList) {

            if (err) throw err;

            request(app)
                .post("/api/lists")
                .send(savedList)
                .set("Authorization", authenticationToken)
                .expect(201, done);
        });
    });

    it("Return the list created", function (done) {
        newList.save(function (err, savedList) {
            if (err) throw err;

            request(app)
                .post("/api/lists")
                .send(savedList)
                .set("Authorization", authenticationToken)
                .expect("Content-Type", /json/, done);
        });
    });

    it("Add the created list in the data store", function (done) {
        newList.save(function (err, savedList) {
            if (err) throw err;

            request(app)
                .post("/api/lists")
                .send(savedList)
                .set("Authorization", authenticationToken)
                .expect(200)
                .end(function (err, res) {
                    List.findById(res.body._id, function (err, createdList) {
                        assert.notEqual(createdList, null);
                        done();
                    });
                });
        });
    });

    it("Makes the logged user owner's of the list", function (done) {
        newList.save(function (err, savedList) {
            if (err) throw err;

            request(app)
                .post("/api/lists")
                .send(savedList)
                .set("Authorization", authenticationToken)
                .expect(200)
                .end(function (err, res) {
                    assert.equal(user._id, res.body.owner);
                    done();
                });
        });
    });
});

describe("Updating a list", function () {

    var user;
    var list;

    before(function () {
        cleanDatabase();

        user = new User({username: "foo", password: "bar"});
        user.save();

        list = new List({name: "My list", owner: user});
        list.save();
    });


    it("Returns http status 'no content' 204", function (done) {
        request(app)
            .put("/api/lists/" + list._id)
            .send({name: "my list 2"})
            .set("Authorization", authenticationToken)
            .expect(204, done);
    });

    it("Updates the list in the data store", function (done) {
        request(app)
            .put("/api/lists/" + list._id)
            .send({name: "my list 2"})
            .set("Authorization", authenticationToken)
            .end(function () {
                List.findById(list._id, function (err, updatedList) {
                    assert.equal(updatedList.name, "my list 2");
                    done();
                })
            });
    });
});

describe("Deleting a list", function () {

    var user;
    var list;

    before(function () {
        cleanDatabase();

        user = new User({username: "foo", password: "bar"});
        user.save();

        list = new List({name: "My list", owner: user});
        list.save();
    });


    it("Returns http status 'no content' (204)", function (done) {
        request(app)
            .delete("/api/lists/" + list._id)
            .set("Authorization", authenticationToken)
            .expect(204, done);
    });

    it("Deletes the list in the data store", function (done) {
        request(app)
            .delete("/api/lists/" + list._id)
            .set("Authorization", authenticationToken)
            .end(function () {
                List.findById(list._id, function (err, deletedList) {
                    assert.equal(deletedList, null);
                    done();
                });
            });
    });
});

describe("Credentials are not valid", function () {

    var user;
    var list;

    before(function () {
        cleanDatabase();

        user = new User({username: "foo", password: "baz"});
        user.save();

        list = new List({name: "My list", owner: user});
        list.save();
    });

    it("Getting all, lists Http status 'Unauthorized' (401)", function (done) {
        request(app)
            .get("/api/lists")
            .expect(401, done);
    });

    it("Getting a list, Http status 'unauthorized' (401)", function (done) {
        request(app)
            .get("/api/lists/" + list._id)
            .expect(401, done);
    });

    it("Creating a list Http status 'unauthorized' (401)", function (done) {
        request(app)
            .post("/api/lists")
            .send(list)
            .expect(401, done);
    });

    it("Updating a list, Http status 'unauthorized' (401)", function (done) {
        request(app)
            .put("/api/lists/" + list._id)
            .send({name: "my list 2"})
            .expect(401, done);
    });

    it("Deleting a list, Http status 'unauthorized' (401)", function (done) {
        request(app)
            .delete("/api/lists/" + list._id)
            .expect(401, done);
    });
});

describe("List does not exists", function () {

    var user;
    var fakeId = "000000000000000000000000";

    before(function () {
        cleanDatabase();

        user = new User({username: "foo", password: "bar"});
        user.save();
    });

    it("Getting a list, Http status 'not found' (404)", function (done) {
        request(app)
            .get("/api/lists/" + fakeId)
            .set("Authorization", authenticationToken)
            .expect(404, done);
    });

    it("Updating a list, Http status 'not found' (404)", function (done) {
        request(app)
            .put("/api/lists/" + fakeId)
            .send({name: "my list 2"})
            .set("Authorization", authenticationToken)
            .expect(404, done);
    });

    it("Deleting a list, Http status 'not found' (404)", function (done) {
        request(app)
            .delete("/api/lists/" + fakeId)
            .set("Authorization", authenticationToken)
            .expect(404, done);
    });
});

describe("User is not the list owners", function () {

    var user;
    var list;

    before(function () {
        cleanDatabase();

        user = new User({username: "foo", password: "bar"});
        user.save();

        list = new List({name: "My list", owner: new User()});
        list.save();
    });

    it("Get all list returns an empty list", function (done) {
        request(app)
            .get("/api/lists")
            .set("Authorization", authenticationToken)
            .expect(200)
            .end(function (err, res) {
                assert.equal(0, res.body.length);
                done();
            });
    });

    it("Getting a list, Http status 'forbidden' (403)", function (done) {
        request(app)
            .get("/api/lists/" + list._id)
            .set("Authorization", authenticationToken)
            .expect(403, done);
    });

    it("Updating a list, Http status 'forbidden' (403)", function (done) {
        request(app)
            .put("/api/lists/" + list._id)
            .send({name: "my list 2"})
            .set("Authorization", authenticationToken)
            .expect(403, done);
    });

    it("Deleting a list, Http status 'forbidden' (403)", function (done) {
        request(app)
            .delete("/api/lists/" + list._id)
            .set("Authorization", authenticationToken)
            .expect(403, done);
    });
});