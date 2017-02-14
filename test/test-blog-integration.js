const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

// this makes the should syntax available throughout
// this module
const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogData() {
    console.info('Seeding blog post data')
    const seedData = [];

    for(let i = 1; i <= 10; i++) {
        seedData.push(genBlogData())
    }
    return BlogPost.insertMany(seedData);
}

// function genBlogTitle() {
//     const titles = [
//         "I like cat litter", "I like candy", "I like milk", "I like Mountain Dew"
//     ]
//     return titles[Math.floor(Math.random() * titles.length)]
// }
//
// function genBlogContent() {
//     const content = [
//         "This is content", "This is not content"
//     ]
//     return content[Math.floor(Math.random() * titles.length)]
// }


function genBlogData() {
    return {
        author: {firstName: faker.name.firstName(), lastName: faker.name.lastName()},
        content: faker.lorem.paragraph(),
        title: faker.lorem.sentence(),
        created: faker.date.past()
    }
}

function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('Blog Post API resource', function() {
    before(function() {
   return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function() {
   return seedBlogData();
    });

    afterEach(function() {
   return tearDownDb();
    });

    after(function() {
   return closeServer();
    })

    describe('GET endpoint', function() {

        it('should return all existing blog posts', function() {
            let res;
            return chai.request(app)
            .get('/posts')
            .then(function(_res) {
                res = _res;
                res.should.have.status(200);
                res.body.should.have.length.of.at.least(1);
                return BlogPost.count();
            })
            .then(function(count) {
                res.body.should.have.length.of(count);
            });

        });
        it('should return blog posts with the correct fields', function() {
            let resBlogPost;
            return chai.request(app)
            .get('/posts')
            .then(function(res) {
                res.should.have.status(200);
                res.should.be.json;
                res.body.should.be.a('array');
                res.body.should.have.length.of.at.least(1);

                res.body.forEach(function(blogPost) {
                  blogPost.should.be.a('object');
                  blogPost.should.include.keys(
                    'id', 'author', 'title', 'content', 'created');
                });
                resBlogPost = res.body[0];
                return BlogPost.findById(resBlogPost.id);
              })
              .then(function(blogPost) {
                resBlogPost.id.should.equal(blogPost.id);
                // resBlogPost.author.should.equal(blogPost.author);
                resBlogPost.content.should.equal(blogPost.content);
                resBlogPost.title.should.equal(blogPost.title);
                resBlogPost.author.should.contain(blogPost.author.firstName);
                resBlogPost.author.should.contain(blogPost.author.lastName);
                // resBlogPost.created.should.equal(blogPost.created);
              });
          });
      });
      describe('POST endpoint', function() {
          it('should add a new blog post', function() {

      const newBlogPost = genBlogData();

      return chai.request(app)
        .post('/posts')
        .send(newBlogPost)
        .then(function(res) {
          res.should.have.status(201);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.should.include.keys(
              'id', 'author', 'title', 'content', 'created');
        //   res.body.author.should.equal(newBlogPost.author);
          // cause Mongo should have created id on insertion
          res.body.id.should.not.be.null;
          res.body.title.should.equal(newBlogPost.title);
          res.body.content.should.equal(newBlogPost.content);

          return BlogPost.findById(res.body.id);
        })
        .then(function(blogPost) {
        //   blogPost.author.should.equal(newBlogPost.author);
          blogPost.title.should.equal(newBlogPost.title);
          blogPost.content.should.equal(newBlogPost.content);
        // blogPost.author.firstName.should.equal(newBlogPost.author.firstName);
        // blogPost.author.lastName.should.equal(newBlogPost.author.lastName);
        });
    });
  });

  describe('PUT endpoint', function() {

    it('should update fields you send over', function() {
      const updateData = {
        title: 'fofofofofofofof',
        content: 'futuristic fusion futuristic fusion futuristic fusion futuristic fusion futuristic fusion'
      };

      return BlogPost.findOne().exec()
        .then(function(blogPost) {
          updateData.id = blogPost.id;
          return chai.request(app)
            .put(`/posts/${blogPost.id}`)
            .send(updateData);
        })
        .then(function(res) {
          res.should.have.status(204);

          return BlogPost.findById(updateData.id).exec();
        })
        .then(function(blogPost) {
          blogPost.title.should.equal(updateData.title);
          blogPost.content.should.equal(updateData.content);
        });
      });
  });

  describe('DELETE endpoint', function() {

    it('delete a blog post by id', function() {

      let blogPost;

      return BlogPost
        .findOne()
        .exec()
        .then(function(_blogPost) {
          blogPost = _blogPost;
          return chai.request(app).delete(`/posts/${blogPost.id}`);
        })
        .then(function(res) {
          res.should.have.status(204);
          return BlogPost.findById(blogPost.id).exec();
        })
        .then(function(_blogPost) {
          // when a variable's value is null, chaining `should`
          // doesn't work. so `_blogPost.should.be.null` would raise
          // an error. `should.be.null(_blogPost)` is how we can
          // make assertions about a null value.
          should.not.exist(_blogPost);
        });
        });
     })
  })
