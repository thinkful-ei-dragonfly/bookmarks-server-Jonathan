const express = require('express')
const bodyParser = express.json()

const bookmarksRouter = express.Router()

bookmarksRouter
.route('/bookmarks')
.get((req, res) => {

})
.post(bodyParser, (req, res) => {

})

bookmarksRouter
.route('/bookmarks/:id')
.get((req, res) => {

})
.delete((req, res) => {

})

module.exports = bookmarksRouter
