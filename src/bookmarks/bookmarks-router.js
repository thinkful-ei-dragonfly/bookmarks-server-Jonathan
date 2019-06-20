require('dotenv').config()
const express = require('express')
const { bookmarks } = require('../store')
const uuid = require('uuid/v4')
const logger = require('../logger')
const { isWebUri } = require('valid-url')
const BookmarksService = require('./bookmarks-service')

const bookmarksRouter = express.Router()
const jsonParser = express.json()

bookmarksRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res
          .json(bookmarks)
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

    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
      logger.error(`Invalid rating '${rating}' supplied`)
      return res
        .status(400)
        .send(`Invalid data`)
    }

    if (!isWebUri(uri)) {
      logger.error(`Invalid url '${uri}' supplied`)
      return res
        .status(400)
        .send(`Invalid data`)
    }

    if (!title) {
      logger.error(`Title is required.`)
      return res
        .status(400)
        .send('Invalid data')
    }

    if (!uri) {
      logger.error(`URL is required.`)
      return res
        .status(400)
        .send('Invalid data')
    }

    if (!descript) {
      logger.error(`Description is required.`)
      return res
        .status(400)
        .send('Invalid data')
    }

    if (!rating) {
      logger.error(`Rating is required.`)
      return res
        .status(400)
        .send('Invalid data')
    }

    BookmarksService.addBookmark(
      knexInstance,
      newBookmark
    )
      .then(bookmark => {
        res
          .status(201)
          .location(`/bookmarks/${bookmark.id}`)
          .json(bookmark)
      })
      .catch(next)

  })

bookmarksRouter
  .route('/bookmarks/:id')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getById(knexInstance, req.params.id)
      .then(bookmark => {
        if (!bookmark) {
          logger.error(`Bookmark with id ${req.params.id}`)
          return res
            .status(404)
            .send('Bookmark Not Found')
        }
        res.json(bookmark)
      })
      .catch(next)
  })
  .delete((req, res) => {
    const { id } = req.params
    const bookmark = bookmarks.find(b => b.id === id)

    if (!bookmark) {
      logger.error(`Bookmark with id ${id} not found.`)
      return res
        .status(404)
        .send('Bookmark Not Found')
    }

    const index = bookmarks.indexOf(bookmark)

    bookmarks.splice(index, 1)

    logger.info(`Bookmark with id ${id} deleted`)

    res
      .status(204)
      .end()
  })

module.exports = bookmarksRouter
