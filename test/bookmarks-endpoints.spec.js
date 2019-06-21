const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeBookmarksArray, makeMaliciousBookmark } = require('./bookmarks.fixtures')



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

    context(`Given an XSS attack bookmark`, () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()

      beforeEach('insert malicious bookmark', () => {
        return db
          .into('bookmarks')
          .insert([maliciousBookmark])
      })

      it(`removes XSS attack content`, () => {
        return supertest(app)
          .get(`/bookmarks`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200)
          .expect(res => {
            expect(res.body[0].descript).to.eql(expectedBookmark.descript)
          })
      })
    })
  })



  describe(`GET /bookmarks/:bookmark_id`, () => {

    context(`Given no bookmarks`, () => {
      it(`responds with 404`, () => {
        const bookmarkId = 123456789
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: `Bookmark doesn't exist` } })
      })
    })

    context(`Given there are bookmarks in the database`, () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('responds with 200 and the specified bookmark', () => {
        const bookmarkId = 2
        const expectedBookmark = testBookmarks[bookmarkId - 1]
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedBookmark)
      })
    })

    context(`Given an XSS attack bookmark`, () => {
      const maliciousBookmark = {
        id: 911,
        title: 'Malicious Bookmark',
        uri: 'http://malicious-bookmark.com',
        descript: '<img src="https://a.page.to.nowhere.com" onerror="alert("gotcha");">',
        rating: '0'
      }

      beforeEach('insert malicious bookmark', () => {
        return db
          .into('bookmarks')
          .insert([maliciousBookmark])
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/bookmarks/${maliciousBookmark.id}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200)
          .expect(res => {
            expect(res.body.descript).to.eql('<img src="https://a.page.to.nowhere.com">')
          })
      })
    })

  })



  describe(`POST /bookmarks`, () => {
    it(`creates a bookmark, responding with 201 and the new bookmark`, function () {
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
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(postRes.body)
        )
    })

    const requiredFields = ['title', 'uri', 'descript', 'rating']

    requiredFields.forEach(field => {
      const newBookmark = {
        title: 'Test new bookmark',
        uri: 'http://test-bookmark.com',
        descript: 'Test new bookmark description',
        rating: 4
      }
      it(`responds with a 400 and an error message when the '${field} is missing`, () => {
        delete newBookmark[field]

        return supertest(app)
          .post('/bookmarks')
          .send(newBookmark)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          })
      })
    })

    it(`responds with a 400 and an error message when the 'uri' is not a valid uri`, () => {
      const newBookmark = {
        title: 'Test new bookmark',
        uri: 'Not a valid uri',
        descript: 'Test new bookmark description',
        rating: 4
      }
      return supertest(app)
        .post('/bookmarks')
        .send(newBookmark)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, {
          error: { message: `The uri is invalid` }
        })
    })

    it(`responds with a 400 and an error message when the rating is not between 0 and 5`, () => {
      const newBookmark = {
        title: 'Test new bookmark',
        uri: 'Not a valid uri',
        descript: 'Test new bookmark description',
        rating: 6
      }
      return supertest(app)
        .post('/bookmarks')
        .send(newBookmark)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, {
          error: { message: `The rating is not between 0 and 5` }
        })
    })

    it(`responds with a 400 and an error mssage when the rating is not an integer`, () => {
      const newBookmark = {
        title: 'Test new bookmark',
        uri: 'Not a valid uri',
        descript: 'Test new bookmark description',
        rating: 'Hello, world!'
      }
      return supertest(app)
        .post('/bookmarks')
        .send(newBookmark)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, {
          error: { message: `The rating is not an integer` }
        })
    })

    it(`removes XSS attack content from response`, () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()
      return supertest(app)
        .post(`/bookmarks`)
        .send(maliciousBookmark)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(201)
        .expect(res => {
          expect(res.body.descript).to.eql(expectedBookmark.descript)
        })
    })
  })



  describe(`DELETE /bookmarks/:bookmark_id`, () => {
    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert articles', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('responds with 204 and removes the article', () => {
        const idToRemove = 2
        const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove)
        return supertest(app)
          .delete(`/bookmarks/${idToRemove}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/bookmarks`)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedBookmarks)
          )
      })
    })

    context('Given no bookmarks', () => {
      it(`responds with 404`, () => {
        const bookmarkId = 75
        return supertest(app)
          .delete(`/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, {
            error: { message: `Bookmark doesn't exist` }
          })
      })
    })
  })
})