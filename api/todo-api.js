'use strict';

/**
 * Single serverless entrypoint for all /todo/api/* routes.
 * Routed via vercel.json rewrite so create/list/read/delete share one isolate.
 */
var store = require('./_lib/store');
var os = require('os');
var url = require('url');

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

function resolveApiPath(req) {
  // Prefer explicit rewrite query (?p=items/1)
  if (req.query && typeof req.query.p === 'string' && req.query.p.length) {
    return req.query.p.replace(/^\/+/, '').split('/').filter(Boolean);
  }

  // x-forwarded-uri / original URL when available
  var original =
    (req.headers && (req.headers['x-forwarded-uri'] || req.headers['x-invoke-path'])) ||
    req.url ||
    '';
  var pathname = String(original).split('?')[0];

  var markers = ['/todo/api/', '/api/todo/'];
  for (var i = 0; i < markers.length; i++) {
    var idx = pathname.indexOf(markers[i]);
    if (idx !== -1) {
      return pathname.slice(idx + markers[i].length).split('/').filter(Boolean);
    }
  }
  return [];
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  // Ensure query is parsed if runtime did not
  if (!req.query) {
    req.query = url.parse(req.url || '', true).query || {};
  }

  var parts = resolveApiPath(req);
  var resource = parts[0] || '';
  var id = parts[1];

  console.log(JSON.stringify({
    msg: 'todo-api',
    method: req.method,
    url: req.url,
    parts: parts,
    query: req.query
  }));

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
    return sendJson(res, 404, { error: 'Not found', parts: parts });
  }

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

  if (req.method === 'GET') {
    var item = store.read(id);
    if (!item) {
      return sendJson(res, 404, { error: 'Item not found', id: id });
    }
    return sendJson(res, 200, item);
  }

  if (req.method === 'DELETE') {
    var removed = store.destroy(id);
    if (!removed) {
      return sendJson(res, 404, { error: 'Item not found', id: id });
    }
    return sendJson(res, 200, removed);
  }

  return sendJson(res, 405, { error: 'Method not allowed' });
};
