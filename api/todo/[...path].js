'use strict';

/**
 * Single serverless entrypoint for all /todo/api/* routes.
 * Important: create/list/read/delete must share one function so /tmp storage
 * is visible across operations (separate lambdas have isolated filesystems).
 */
var store = require('../_lib/store');
var os = require('os');

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string' && req.body) {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return {};
    }
  }
  return {};
}

function pathParts(req) {
  // Catch-all: /api/todo/[...path] → req.query.path is string or string[]
  var path = req.query && req.query.path;
  if (Array.isArray(path)) {
    return path.filter(Boolean);
  }
  if (typeof path === 'string' && path.length) {
    return path.split('/').filter(Boolean);
  }
  // Fallback: parse URL path after /api/todo/ or /todo/api/
  var url = String(req.url || '').split('?')[0];
  var marker = url.indexOf('/todo/api/');
  if (marker === -1) {
    marker = url.indexOf('/api/todo/');
    if (marker !== -1) {
      return url.slice(marker + '/api/todo/'.length).split('/').filter(Boolean);
    }
    return [];
  }
  return url.slice(marker + '/todo/api/'.length).split('/').filter(Boolean);
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  var parts = pathParts(req);
  var resource = parts[0] || '';
  var id = parts[1];

  if (resource === 'host') {
    if (req.method !== 'GET') {
      return sendJson(res, 405, { error: 'Method not allowed' });
    }
    return sendJson(res, 200, {
      ip: process.env.VERCEL_REGION || '0.0.0.0',
      hostname: process.env.VERCEL_URL || os.hostname()
    });
  }

  if (resource !== 'items') {
    return sendJson(res, 404, { error: 'Not found' });
  }

  // Collection: GET list / POST create-or-update
  if (!id) {
    if (req.method === 'GET') {
      return sendJson(
        res,
        200,
        store.listPage(
          req.query && req.query.page,
          req.query && req.query.sortFields,
          req.query && req.query.sortDirections
        )
      );
    }

    if (req.method === 'POST') {
      var body = readBody(req);
      if (body.id != null && body.id !== '') {
        var updated = store.update(body.id, body.description, body.done);
        if (!updated) {
          return sendJson(res, 404, { error: 'Item not found' });
        }
        return sendJson(res, 200, updated);
      }
      return sendJson(res, 200, store.create(body.description, body.done));
    }

    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  // Item by id: GET / DELETE
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
