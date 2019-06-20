const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeBookmarksArray } = require('./bookmarks.fixtures')



describe('Bookmarks Endpoints', () => {
  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())
  before('clean the table', () => db('bookmarks').truncate())
  

  afterEach('cleanup', () => db('bookmarks').truncate())
 

  describe(`GET /bookmarks`, () => {

    context(`Given no bookmarks`, () => {
      
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, [])
      })
    })

    context(`Given there are bookmarks in the database`, () => {

      const testBookmarks = makeBookmarksArray()
      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })
      it('responds with 200 and all of the bookmarks', () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testBookmarks)
      })
    })
  })

  
  
  describe(`GET /bookmarks/:bookmark_id`, () => {

    context(`Given no bookmarks`, () => {
      it(`responds with 404`, () => {
        const bookmarkId = 123456789
        return supertest(app)
        .get(`/bookmarks/${bookmarkId}`)
        .expect(404, { error: { message: `Bookmark doesn't exist` }})
      })
    })
  })



  describe.only(`POST /bookmarks`, () => {
    console.log('API_TOKEN',process.env.API_TOKEN)
    it(`creates a bookmark, responding with 201 and the new bookmark`, function() {
      const newBookmark = {
        title: 'Test new Bookmark',
        uri: 'http://www.test-bookmark.com',
        descript: 'A test bookmark',
        rating: 5,
      }
      return supertest(app)
      .post('/bookmarks')
      .send(newBookmark)
      .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
      .expect(201)
      .expect(res => {
        expect(res.body.title).to.eql(newBookmark.title)
        expect(res.body.uri).to.eql(newBookmark.uri)
        expect(res.body.descript).to.eql(newBookmark.descript)
        expect(res.body.rating).to.eql(newBookmark.rating.toString())
      })
      .then(postRes => 
        supertest(app)
        .get(`/bookmarks/${postRes.body.id}`)
        .expect(postRes.body)
        )
    })
  })
})