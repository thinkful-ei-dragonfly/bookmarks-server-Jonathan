require('dotenv').config()
const express = require('express')
const xss = require('xss')
const { bookmarks } = require('../store')
const uuid = require('uuid/v4')
const logger = require('../logger')
const { isWebUri } = require('valid-url')
const BookmarksService = require('./bookmarks-service')

const bookmarksRouter = express.Router()
const jsonParser = express.json()

const serializeBookmark = bookmark => ({
  id: bookmark.id,
  title: bookmark.title,
  uri: bookmark.uri,
  descript: xss(bookmark.descript),
  rating: bookmark.rating,

})

bookmarksRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res
          .json(bookmarks.map(serializeBookmark))
      })
      .catch(next)
  })
  .post(jsonParser, (req, res, next) => {
    const knexInstance = req.app.get('db')
    const { title, uri, descript, rating } = req.body
    const newBookmark = { title, uri, descript, rating }

    for (const [key, value] of Object.entries(newBookmark)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        })
      }
    }

    if (rating < 0 || rating > 5) {
      logger.error(`Invalid rating '${rating}' supplied`)
      return res
        .status(400)
        .json({
          error: { message: `The rating is not between 0 and 5` }
        })
    }

    if (!Number.isInteger(rating)) {
      logger.error(`Invalid rating '${rating}' supplied`)
      return res
        .status(400)
        .json({
          error: { message: `The rating is not an integer` }
        })
    }

    if (!isWebUri(uri)) {
      logger.error(`Invalid uri '${uri}' supplied`)
      return res
        .status(400)
        .json({
          error: { message: `The uri is invalid` }
        })
    }

    BookmarksService.addBookmark(
      knexInstance,
      newBookmark
    )
      .then(bookmark => {
        res
          .status(201)
          .location(`/bookmarks/${bookmark.id}`)
          .json(serializeBookmark(bookmark))
      })
      .catch(next)

  })

bookmarksRouter
  .route('/bookmarks/:id')
  .all((req, res, next) => {
    BookmarksService.getById(
      req.app.get('db'),
      req.params.id)
      .then(bookmark => {
        if (!bookmark) {
          return res
            .status(404)
            .json({
              error: { message: `Bookmark doesn't exist` }
            })
        }
        res.bookmark = bookmark
        next()
      })
      .catch(next)
  })
  .get((req, res, next) => {
    res.json(serializeBookmark(res.bookmark))
  })
  .delete ((req, res, next) => {
  BookmarksService.deleteBookmark(
    req.app.get('db'),
    req.params.id
  )
    .then(() => {
      res
        .status(204)
        .end()
    })
    .catch(next)
})

module.exports = bookmarksRouter
