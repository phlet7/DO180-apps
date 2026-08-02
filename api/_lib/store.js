'use strict';

var fs = require('fs');
var path = require('path');

var STORE_PATH = path.join('/tmp', 'do180-todo-items.json');
var MEM_KEY = '__do180_todo_items__';

function readItems() {
  if (global[MEM_KEY] && Array.isArray(global[MEM_KEY])) {
    return global[MEM_KEY].slice();
  }
  try {
    if (!fs.existsSync(STORE_PATH)) {
      global[MEM_KEY] = [];
      return [];
    }
    var raw = fs.readFileSync(STORE_PATH, 'utf8');
    var parsed = JSON.parse(raw);
    var items = Array.isArray(parsed) ? parsed : [];
    global[MEM_KEY] = items;
    return items.slice();
  } catch (err) {
    global[MEM_KEY] = [];
    return [];
  }
}

function writeItems(items) {
  global[MEM_KEY] = items.slice();
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(items), 'utf8');
  } catch (err) {
    // Memory still holds the data for this warm isolate.
  }
}

function nextId(items) {
  var max = 0;
  for (var i = 0; i < items.length; i++) {
    var id = Number(items[i].id) || 0;
    if (id > max) {
      max = id;
    }
  }
  return max + 1;
}

function sortItems(items, sortField, sortDirection) {
  var field = sortField || 'id';
  var direction = (sortDirection || 'asc').toLowerCase() === 'desc' ? -1 : 1;
  return items.slice().sort(function (a, b) {
    var av = a[field];
    var bv = b[field];
    if (av === bv) {
      return 0;
    }
    if (av > bv) {
      return direction;
    }
    return -direction;
  });
}

exports.listPage = function (page, sortField, sortDirection) {
  var pageNo = Math.max(1, parseInt(page, 10) || 1);
  var items = sortItems(readItems(), sortField, sortDirection);
  var pageSize = 10;
  var start = pageSize * (pageNo - 1);
  return {
    currentPage: pageNo,
    list: items.slice(start, start + pageSize),
    pageSize: pageSize,
    sortDirections: sortDirection || 'asc',
    sortFields: sortField || 'id',
    totalResults: items.length
  };
};

exports.read = function (id) {
  var key = String(id);
  var items = readItems();
  for (var i = 0; i < items.length; i++) {
    if (String(items[i].id) === key) {
      return items[i];
    }
  }
  return null;
};

exports.create = function (description, done) {
  var items = readItems();
  var item = {
    id: nextId(items),
    description: description || '',
    done: !!done
  };
  items.push(item);
  writeItems(items);
  return item;
};

exports.update = function (id, description, done) {
  var key = String(id);
  var items = readItems();
  for (var i = 0; i < items.length; i++) {
    if (String(items[i].id) === key) {
      items[i].description = description || '';
      items[i].done = !!done;
      writeItems(items);
      return items[i];
    }
  }
  return null;
};

exports.destroy = function (id) {
  var key = String(id);
  var items = readItems();
  for (var i = 0; i < items.length; i++) {
    if (String(items[i].id) === key) {
      var removed = items.splice(i, 1)[0];
      writeItems(items);
      return removed;
    }
  }
  return null;
};
