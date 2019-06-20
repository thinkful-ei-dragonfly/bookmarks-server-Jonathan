require('dotenv').config()
const express = require('express')
const bodyParser = express.json()
const { bookmarks } = require('./store')
const uuid = require('uuid/v4')
const logger = require('./logger')
const { isWebUri } = require('valid-url')
const BookmarksService = require('./bookmarks-service')

const bookmarksRouter = express.Router()

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
  .post(bodyParser, (req, res) => {
    const { title, url, desc, rating } = req.body

    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
      logger.error(`Invalid rating '${rating}' supplied`)
      return res
        .status(400)
        .send(`Invalid data`)
    }

    if (!isWebUri(url)) {
      logger.error(`Invalid url '${url}' supplied`)
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

    if (!url) {
      logger.error(`URL is required.`)
      return res
        .status(400)
        .send('Invalid data')
    }

    if (!desc) {
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

    const id = uuid()

    const bookmark = {
      id,
      title,
      url,
      desc,
      rating
    }

    bookmarks.push(bookmark)

    logger.info(`Bookmark with id ${id}created`)

    res
      .status(201)
      .location(`http://localhost:8000/${id}`)
      .json(bookmark)

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
