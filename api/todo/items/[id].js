'use strict';

var store = require('../../_lib/store');

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(body));
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  var id = req.query && req.query.id;
  if (id == null || id === '') {
    return sendJson(res, 400, { error: 'Missing id' });
  }

  if (req.method === 'GET') {
    var item = store.read(id);
    if (!item) {
      return sendJson(res, 404, { error: 'Item not found' });
    }
    return sendJson(res, 200, item);
  }

  if (req.method === 'DELETE') {
    var removed = store.destroy(id);
    if (!removed) {
      return sendJson(res, 404, { error: 'Item not found' });
    }
    return sendJson(res, 200, removed);
  }

  return sendJson(res, 405, { error: 'Method not allowed' });
};
