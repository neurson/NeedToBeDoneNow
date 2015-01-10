var assert = require("assert");
var request = require("supertest");
var mongoose = require("mongoose");
var base64 =  require('base-64');

var app = require("../app");

var Models = require("../models")
var List = Models.List;
var User = Models.User;

var fakeId = "000000000000000000000000";
var authenticationToken = "Basic " + base64.encode("foo:bar");

describe("Lists route", function() {

	var user;

	var createPersistedList = function (name, user, cb) {

		var newList = new List();

		newList.name = "My list";
		newList.owner = user;

		newList.save(function(err, savedList) {
			if (err) throw err;
			cb(savedList);
		});
	};

	before(function(done) {

		// Clean database
		for (var collection in mongoose.connection.collections) {
      		mongoose.connection.collections[collection].remove(function() {});
    	}

    	// Create a valid user
    	user = new User();

    	user.username = "foo";
    	user.password = "bar";

    	user.save(done);		
	});

	after(function(done) {
		done();
	});

	describe("Getting all lists", function() {

		it("Should return http status 'ok' (200)", function(done) {
			request(app)				
				.get("/api/lists")
				.set("Authorization", authenticationToken)
				.expect("Content-Type", /json/)	
				.expect(200, done);
		});

		it("Should only return the lists which the logged user is the owner", function(done) {

			createPersistedList("My list 1", user, function() {
				createPersistedList("My list 2", new User(), function() {
					request(app)
						.get("/api/lists")
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
				.get("/api/lists")
				.expect(401, done);
		});
	});

	describe("Getting a list by identifier", function() {

		it("Should return http status 'ok' (200) if list exists", function(done) {

			createPersistedList("My list", user, function(savedList) {
				request(app)
					.get("/api/lists/" + savedList._id)
					.set("Authorization", authenticationToken)
					.expect("Content-Type", /json/)	
					.expect(200, done);					
			});			
		});

		it("Should return http status 'forbidden' (403) if the logged user is not the list owner", function(done) {

			createPersistedList("My list", new User(), function(savedList) {
				request(app)
					.get("/api/lists/" + savedList._id)
					.set("Authorization", authenticationToken)
					.expect(403, done);					
			});
		});

		it("Should return http status 'not found' (404) if list is missing", function(done) {
			request(app)
				.get("/api/lists/" + fakeId)
				.set("Authorization", authenticationToken)
				.expect(404, done);
		});

		it("Should return http status 'unauthorized' (401) if credentials are not valid", function(done) {
			request(app)				
				.get("/api/lists/" + fakeId)
				.expect(401, done);
		});
	});

	describe("Creating a new list", function() {

		it("Should return http status 'created' (201)", function(done) {

			createPersistedList("My list", user, function(savedList) {
				request(app)
					.post("/api/lists")
					.send(savedList)
					.set("Authorization", authenticationToken)
					.expect(201, done);
			});
		});

		it("Should return the list created", function(done) {

			createPersistedList("My list", user, function(savedList) {
				request(app)
					.post("/api/lists")
					.send(savedList)
					.set("Authorization", authenticationToken)
					.expect("Content-Type", /json/, done);
			});
		});

		it("Should make the logged user owner's of the list", function(done) {

			createPersistedList("My list", user, function(savedList) {
				request(app)
					.post("/api/lists")
					.send(savedList)
					.set("Authorization", authenticationToken)
					.expect(200)
					.end(function(err, res) {
						assert.equal(user._id, res.body.owner);
						done();
				});
			});
		});

		it("Should return http status 'unauthorized' (401) if credentials are not valid", function(done) {

			createPersistedList("My list", user, function(savedList) {
				request(app)
					.post("/api/lists")
					.send(savedList)
					.expect(401, done);
			});
		});
	});

	describe("Updating a list", function() {

		it("Should return http status 'no content' 204 if list exists", function(done) {

			createPersistedList("My list", user, function(savedList) {

				savedList.name = "my list 2";
				
				request(app)
					.put("/api/lists/"  + savedList._id)
					.send(savedList)
					.set("Authorization", authenticationToken)
					.expect(204, done);
			});
		});

		it("Should return http status 'forbidden' (403) if the logged user is not the list owner", function(done) {

			createPersistedList("My list", new User(), function(savedList) {

				savedList.name = "my list 2";
				
				request(app)
					.put("/api/lists/"  + savedList._id)
					.send(savedList)
					.set("Authorization", authenticationToken)
					.expect(403)
					.end(function(err, res) {
						if (err) return done(err);

						List.findById(savedList._id, function(err2, lst) {
							if (err2) return done(err);
							assert.equal("My list", lst.name);
							done();
						});
					});
			});
		});

		it("Should return http status 'not found' (404) if list is missing", function(done) {

			createPersistedList("My list", user, function(savedList) {
				request(app)
					.put("/api/lists/" + fakeId)
					.send(savedList)
					.set("Authorization", authenticationToken)
					.expect(404, done);
			});
		});

		it("Should return http status 'unauthorized' (401) if credentials are not valid", function(done) {

			createPersistedList("My list", user, function(savedList) {

				savedList.name = "my list 2";
				
				request(app)
					.put("/api/lists/" + fakeId)
					.send(savedList)
					.expect(401, done);
			});
		});
	});

	describe("Deleting a list", function() {

		it("Should return http status 'no content' (204) if list exists", function(done) {

			createPersistedList("My list", user, function(savedList) {
				request(app)
					.delete("/api/lists/" + savedList._id)
					.set("Authorization", authenticationToken)
					.expect(204, done);
			});
		});

		it("Should return http status 'forbidden' (403) if the logged user is not the list owner", function(done) {

			createPersistedList("My list", new User(), function(savedList) {
				request(app)
					.delete("/api/lists/" + savedList._id)
					.set("Authorization", authenticationToken)
					.expect(403)
					.end(function(err, res) {
						if (err) return done(err);

						List.findById(savedList._id, function(err2, lst) {
							if (err2) return done(err2);			
							assert.notEqual(lst, null);
							done();
						});
					});
			});
		});

		it("Should return http status 404 if list is missing", function(done) {
			request(app)
				.delete("/api/lists/" + fakeId)
				.set("Authorization", authenticationToken)
				.expect(404, done);
		});		

		it("Should return http status Unauthorized (401) if credentials are not valid", function(done) {

			createPersistedList("My list", user, function(savedList) {
				request(app)
					.delete("/api/lists/" + savedList._id)
					.expect(401, done);
			});
		});
	});
});