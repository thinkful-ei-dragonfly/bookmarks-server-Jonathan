function makeBookmarksArray() {
  return [{
    id: 1,
    title: 'Facebook.com',
    uri: 'http://www.facebook.com',
    descript: 'Facebook home page',
    rating: '5'
  },
  {
    id: 2,
    title: 'MLB.com',
    uri: 'http://www.mlb.com',
    descript: 'MLB home page',
    rating: '5'
  }]
}

function makeMaliciousBookmark() {
  const maliciousBookmark = {
    id: 911,
    title: 'Malicious Bookmark',
    uri: 'http://malicious-bookmark.com',
    descript: '<img src="https://a.page.to.nowhere.com" onerror="alert("gotcha");">',
    rating: 0
  }

  const expectedBookmark = {
    ...maliciousBookmark,
    descript: '<img src="https://a.page.to.nowhere.com">'
  }

  return {
    maliciousBookmark,
    expectedBookmark,
  }
}

module.exports = {
  makeBookmarksArray,
  makeMaliciousBookmark
}