'use strict';

var store = require('../_lib/store');

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  return {};
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method === 'GET') {
    var page = store.listPage(
      req.query && req.query.page,
      req.query && req.query.sortFields,
      req.query && req.query.sortDirections
    );
    return sendJson(res, 200, page);
  }

  if (req.method === 'POST') {
    var body = readBody(req);
    var description = body.description;
    var done = body.done;
    var id = body.id;

    if (id != null && id !== '') {
      var updated = store.update(id, description, done);
      if (!updated) {
        return sendJson(res, 404, { error: 'Item not found' });
      }
      return sendJson(res, 200, updated);
    }

    var created = store.create(description, done);
    return sendJson(res, 200, created);
  }

  return sendJson(res, 405, { error: 'Method not allowed' });
};
