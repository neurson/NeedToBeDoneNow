var assert = require("assert");
var request = require("supertest");
var mongoose = require("mongoose");
var base64 = require('base-64');

var app = require("../app");

var User = require("../lib/user");
var List = require("../lib/task");

var fakeId = "000000000000000000000000";
var authenticationToken = "Basic " + base64.encode("foo:bar");

describe("Lists route", function () {

    var user;

    before(function () {

        // Clean database
        for (var collection in mongoose.connection.collections) {
            mongoose.connection.collections[collection].remove(function () {
            });
        }

        // Create a valid user
        user = new User( { username: "foo", password: "bar" } );
        user.save();
    });

    after(function (done) {
        done();
    });

    describe("Getting all lists", function () {
        it("Should return http status 'ok' (200)", function (done) {
            request(app)
                .get("/api/lists")
                .set("Authorization", authenticationToken)
                .expect("Content-Type", /json/)
                .expect(200, done);
        });

        it("Should only return the lists which the logged user is the owner", function (done) {

            var newList = new List( { name: "My list 1", owner: user } );

            newList.save(function (err) {
                if (err) throw err;

                var newList = new List( { name: "My list 2", owner: new User() } );

                newList.save(function (err) {
                    if (err) throw err;

                    request(app)
                        .get("/api/lists")
                        .set("Authorization", authenticationToken)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) throw err;

                            assert.equal(1, res.body.length);
                            assert.equal(user._id, res.body[0].owner);

                            done();
                        });
                });
            });
        });

        it("Should return http status 'Unauthorized' (401) if credentials are not valid", function (done) {

            var newList = new List( { name: "My list", owner: user } );

            newList.save(function (err) {

                if (err) throw err;
                request(app)
                    .get("/api/lists")
                    .expect(401, done);
            });
        });
    });

    describe("Getting a list by identifier", function () {

        it("Should return http status 'ok' (200)", function (done) {

            var newList = new List( { name: "My list", owner: user } );

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .get("/api/lists/" + savedList._id)
                    .set("Authorization", authenticationToken)
                    .expect(200, done);
            });
        });

        it("Should return the list", function (done) {

            var newList = new List( { name: "My list", owner: user } );

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .get("/api/lists/" + savedList._id)
                    .set("Authorization", authenticationToken)
                    .expect("Content-Type", /json/)
                    .end(function (err, res) {
                        assert.equal(res.body._id, savedList._id);
                        assert.equal(res.body.name, savedList.name);
                        done();
                    });
            });
        });

        it("Should return http status 'forbidden' (403) if the logged user is not the list owner", function (done) {

            var newList = new List( { name: "My list", owner: new User() } );

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .get("/api/lists/" + savedList._id)
                    .set("Authorization", authenticationToken)
                    .expect(403, done);
            });
        });

        it("Should return http status 'not found' (404) if list does not exists", function (done) {
            request(app)
                .get("/api/lists/" + fakeId)
                .set("Authorization", authenticationToken)
                .expect(404, done);
        });

        it("Should return http status 'unauthorized' (401) if credentials are not valid", function (done) {

            var newList = new List( { name: "My list", owner: user } );

            newList.save(function (err) {
                if (err) throw err;

                request(app)
                    .get("/api/lists/" + fakeId)
                    .expect(401, done);
            });
        });
    });

    describe("Creating a new list", function () {

        it("Should return http status 'created' (201)", function (done) {

            var newList = new List( { name: "My list", owner: user } );

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .post("/api/lists")
                    .send(savedList)
                    .set("Authorization", authenticationToken)
                    .expect(201, done);
            });
        });

        it("Should return the list created", function (done) {

            var newList = new List( { name: "My list", owner: user } );

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .post("/api/lists")
                    .send(savedList)
                    .set("Authorization", authenticationToken)
                    .expect("Content-Type", /json/, done);
            });
        });

        it("Should add the created list in the data store", function (done) {

            var newList = new List( { name: "My list", owner: user } );

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

        it("Should make the logged user owner's of the list", function (done) {

            var newList = new List( { name: "My list", owner: user } );

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

        it("Should return http status 'unauthorized' (401) if credentials are not valid", function (done) {

            var newList = new List( { name: "My list", owner: user } );

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .post("/api/lists")
                    .send(savedList)
                    .expect(401, done);
            });
        });
    });

    describe("Updating a list", function () {

        it("Should return http status 'no content' 204", function (done) {

            var newList = new List( { name: "My list", owner: user } );

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .put("/api/lists/" + savedList._id)
                    .send({name: "my list 2"})
                    .set("Authorization", authenticationToken)
                    .expect(204, done);
            });
        });

        it("Should update the list in the data store", function (done) {

            var newList = new List( { name: "My list", owner: user } );

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .put("/api/lists/" + savedList._id)
                    .send({name: "my list 2"})
                    .set("Authorization", authenticationToken)
                    .end(function () {
                        List.findById(savedList._id, function (err, updatedList) {
                            assert.equal(updatedList.name, "my list 2");
                            done();
                        })
                    });
            });
        });

        it("Should return http status 'forbidden' (403) if the logged user is not the list owner", function (done) {

            var newList = new List( { name: "My list", owner: new User() } );

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .put("/api/lists/" + savedList._id)
                    .send({name: "my list 2"})
                    .set("Authorization", authenticationToken)
                    .expect(403)
                    .end(function (err, res) {
                        if (err) return done(err);

                        List.findById(savedList._id, function (err2, lst) {
                            if (err2) return done(err);
                            assert.equal("My list", lst.name);
                            done();
                        });
                    });
            });
        });

        it("Should return http status 'not found' (404) if list does not exists", function (done) {
            request(app)
                .put("/api/lists/" + fakeId)
                .send({name: "my list 2"})
                .set("Authorization", authenticationToken)
                .expect(404, done);
        });

        it("Should return http status 'unauthorized' (401) if credentials are not valid", function (done) {

            var newList = new List( { name: "My list", owner: user } );

            newList.save(function (err) {
                if (err) throw err;

                request(app)
                    .put("/api/lists/" + fakeId)
                    .send({name: "my list 2"})
                    .expect(401, done);
            });
        });
    });

    describe("Deleting a list", function () {

        it("Should return http status 'no content' (204)", function (done) {

            var newList = new List( { name: "My list", owner: user } );

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .delete("/api/lists/" + savedList._id)
                    .set("Authorization", authenticationToken)
                    .expect(204, done);
            });
        });

        it("Should delete the list in the data store", function (done) {

            var newList = new List( { name: "My list", owner: user } );

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .delete("/api/lists/" + savedList._id)
                    .set("Authorization", authenticationToken)
                    .end(function () {
                        List.findById(savedList._id, function (err, deletedList) {
                            assert.equal(deletedList, null);
                            done();
                        });
                    });
            });
        });

        it("Should return http status 'forbidden' (403) if the logged user is not the list owner", function (done) {

            var newList = new List( { name: "My list", owner: new User() } );

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .delete("/api/lists/" + savedList._id)
                    .set("Authorization", authenticationToken)
                    .expect(403)
                    .end(function (err, res) {
                        if (err) return done(err);

                        List.findById(savedList._id, function (err2, lst) {
                            if (err2) return done(err2);
                            assert.notEqual(lst, null);
                            done();
                        });
                    });
            });
        });

        it("Should return http status 404 if list does not exists", function (done) {
            request(app)
                .delete("/api/lists/" + fakeId)
                .set("Authorization", authenticationToken)
                .expect(404, done);
        });

        it("Should return http status Unauthorized (401) if credentials are not valid", function (done) {

            var newList = new List( { name: "My list", owner: user } );

            newList.save(function (err, savedList) {
                if (err) throw err;

                request(app)
                    .delete("/api/lists/" + savedList._id)
                    .expect(401, done);
            });
        });
    });
});
