var pg = require('pg');
var pool;
var pgVersion = null;

var createTableText = `

CREATE TABLE IF NOT EXISTS values (
  id SERIAL PRIMARY KEY,
  data JSONB
);
`;

function loadPgVersion() {
  pool.query('SELECT version()', [], function (err, res) {
    if (!err && res.rows[0]) {
      pgVersion = (res.rows[0].version.match(/PostgreSQL (\S+)/) || [])[1] || null;
    }
  });
}

function rowsLabel(n) {
  return n + ' ligne' + (n > 1 ? 's' : '');
}

// Ce que Clever Cloud injecte dans l'environnement de l'app (panneau « Vu depuis Clever Cloud »).
// Sans APP_ID → exécution locale : le panneau affiche « Local · hors Clever Cloud ».
function platformInfo(rowCount) {
  var e = process.env;
  var short = function (v, n) { return v ? String(v).slice(0, n) : null; };
  var nodeMajor = process.versions.node.split('.')[0];
  var expressVersion = require('express/package.json').version;
  var pgMajor = pgVersion ? pgVersion.split('.')[0] : null;
  return {
    live: !!e.APP_ID,
    appName: e.CC_APP_NAME || null,
    appId: e.APP_ID || null,
    instance: e.INSTANCE_NUMBER != null
      ? '#' + e.INSTANCE_NUMBER + (e.CC_PRETTY_INSTANCE_NAME ? ' · ' + e.CC_PRETTY_INSTANCE_NAME : '')
      : null,
    instanceType: e.INSTANCE_TYPE || null,
    commit: short(e.CC_COMMIT_ID, 7),
    deployment: short(e.CC_DEPLOYMENT_ID, 16),
    pgVersion: pgVersion,
    rows: rowCount != null ? rowsLabel(rowCount) : null,
    nodeVersion: process.version,
    expressVersion: expressVersion,
    stack: 'Node.js ' + nodeMajor + ' · Express ' + expressVersion.split('.')[0] + ' · PostgreSQL' + (pgMajor ? ' ' + pgMajor : ''),
  };
}

module.exports = {
    connectDB : function() {
        pool = new pg.Pool({
            connectionString: process.env.POSTGRESQL_ADDON_DIRECT_URI || process.env.POSTGRESQL_ADDON_URI,
        })
        pool.query(createTableText, [], (err, res) => {
            if (err) {
              throw err
            }
            loadPgVersion();
          })
    },

    platformInfo : platformInfo,


    getVal : function(result) {
        pool.query('SELECT * FROM values ORDER BY id;', [], (err, res) => {
            if (err) {
                console.log(err);
                result.status(500).render('error', { message: 'Erreur base de données', error: {} });
                return
            }
            var values = res.rows.map(function (row) {
                return { id: row.id, value: row.data && row.data.value };
            });
            result.render('index', {
                title: 'Node.js + PostgreSQL · Démo Clever Cloud',
                values: values,
                cc: platformInfo(res.rows.length)
            });
          });
    },

    sendVal : function(val, res) {
        pool.query('INSERT INTO values(data) VALUES($1) RETURNING *', [{'value': val}], (err, queryData) => {
            if (err) {
                console.log(err);
                res.send(JSON.stringify({status: "error", value: "Error, db request failed"}));
                return
            }
            var result = queryData.rows[0];
            res.status(201).send(JSON.stringify({status: "ok", value: result["data"].value, id: result["id"]}));
          });
    },

    delVal : function(id) {
        pool.query('DELETE FROM values where id = $1', [id], (err, result) => {
            if (err) {
                console.log(err);
            }
          });
    }
};
