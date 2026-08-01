# DO180-apps

Red Hat DO180/DO276 sample applications. This is a collection of independent demo apps
(not a single product). The one real multi-tier product is `todoapp/` (3 tiers:
AngularJS frontend + Node.js REST API + MySQL/MariaDB database).

## Cursor Cloud specific instructions

### Services & how to run them (todoapp — the main product)

The stack is: Browser → AngularJS static frontend → Node.js Restify API → MariaDB.

| Tier | Path | Run command | Port |
|------|------|-------------|------|
| Database | (MariaDB) | `sudo mariadbd --user=mysql` | 3306 |
| REST API | `todoapp/nodejs_api` (preferred; has CORS) or `todoapp/nodejs` | `node app.js` | 30080 |
| Frontend | `todoapp/html5/src` | any static server serving the dir at path `/todo` | e.g. 30000 |

Non-obvious caveats (these bite you if you don't know them):

- **Node runtime version matters.** These deps are Node-0.10 era. `restify 4.0.3` pulls in
  `spdy@1.x`, which crashes on modern Node (`ERR_INVALID_ARG_TYPE ... superCtor`). Run the
  backend with a legacy Node (Node 6 works): `~/.nvm/versions/node/v6.17.1/bin/node app.js`.
  `npm install` itself works fine under the default modern Node — only the *runtime* needs Node 6.
- **Hardcoded hostnames via `/etc/hosts`.** `todoapp/nodejs_api/models/db.js` hardcodes the DB
  host as `mysql`, and `todoapp/html5/src/script/item.js` hardcodes the API host as
  `api.lab.example.com:30080`. Both must resolve to `127.0.0.1`. Add (idempotently):
  `echo "127.0.0.1 mysql" | sudo tee -a /etc/hosts` and
  `echo "127.0.0.1 api.lab.example.com" | sudo tee -a /etc/hosts`. `/etc/hosts` is not
  guaranteed to persist across fresh VMs, so re-check it at session start.
- **Backend DB config is via env vars** read by `models/db.js`:
  `MYSQL_ENV_MYSQL_DATABASE`, `MYSQL_ENV_MYSQL_USER`, `MYSQL_ENV_MYSQL_PASSWORD`
  (this setup used `items` / `user1` / `mypa55`).
- **The `Item` table is not auto-created.** `Item.sync()` is commented out in
  `todoapp/nodejs_api/models/items.js`, so create the table manually once:
  `CREATE TABLE Item (id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, description VARCHAR(255), done TINYINT(1));`
- **REST route trailing-slash quirk.** Hit the collection without a trailing slash
  (`GET/POST http://api.lab.example.com:30080/todo/api/items`). A trailing slash gets
  misrouted to the `/:id` handler. The AngularJS `$resource` frontend already does the right
  thing, so the UI is unaffected.
- Open the UI at `http://localhost:<frontend-port>/todo/index.html`.

### Lint / test / build

There are no linters, tests, or build tooling in this repo (no test scripts, no CI configs,
no bundler). The `compile.sh` / `run.sh` scripts assume Red Hat SCL paths
(`/opt/rh/nodejs010`, `httpd24`) that do not exist here — run `node app.js` and a plain static
server directly instead. "Build" for the frontend is just copying `src/` to a webroot.

### Other apps (optional, independent single-file demos)

`nodejs-helloworld/` (Express, port 8080), `php-helloworld/` and `temps/` (PHP, need PHP
installed), and `nodejs-app/` (Express but buggy: `require('http-error')` /
`process.environment` do not exist). None relate to `todoapp`.
