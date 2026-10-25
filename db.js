var pg = require('pg');
var pool;
var meta = { pgVersion: null, database: null };

// Schéma idempotent : created_at est ajouté aux tables créées avant la refonte.
var schemaText = `
CREATE TABLE IF NOT EXISTS values (
  id SERIAL PRIMARY KEY,
  data JSONB
);
ALTER TABLE values ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
`;

// Une seule requête pour la page : total, dernière écriture, écritures par heure sur 24 h
// et les LIST_LIMIT lignes les plus récentes (agrégées en JSON).
var overviewText = `
SELECT (SELECT count(*)::int FROM values) AS total,
       (SELECT max(created_at) FROM values) AS last_at,
       ARRAY(
         SELECT count(v.id)::int
         FROM generate_series(23, 0, -1) AS h
         LEFT JOIN values v
           ON v.created_at >= date_trunc('hour', now()) - h * interval '1 hour'
          AND v.created_at <  date_trunc('hour', now()) - (h - 1) * interval '1 hour'
         GROUP BY h
         ORDER BY h DESC
       ) AS hourly,
       (SELECT coalesce(json_agg(r ORDER BY r.id DESC), '[]'::json)
        FROM (SELECT id, data->>'value' AS value, created_at
              FROM values ORDER BY id DESC LIMIT $1) AS r) AS rows
`;

var LIST_LIMIT = 200;

function elapsedMs(start) {
  return Number(process.hrtime.bigint() - start) / 1e6;
}

function toRow(r) {
  return { id: r.id, value: r.value, createdAt: r.created_at };
}

// Ce que Clever Cloud injecte dans l'environnement de l'app.
// Sans APP_ID → exécution locale : les champs restent null (« injecté au déploiement »).
function platformInfo() {
  var e = process.env;
  var short = function (v, n) { return v ? String(v).slice(0, n) : null; };
  var expressVersion = require('express/package.json').version;
  var pgMajor = meta.pgVersion ? meta.pgVersion.split('.')[0] : null;
  return {
    live: !!e.APP_ID,
    appName: e.CC_APP_NAME || null,
    appId: e.APP_ID || null,
    instance: e.INSTANCE_NUMBER != null
      ? '#' + e.INSTANCE_NUMBER + (e.CC_PRETTY_INSTANCE_NAME ? ' · ' + e.CC_PRETTY_INSTANCE_NAME : '')
      : null,
    instanceNumber: e.INSTANCE_NUMBER != null ? '#' + e.INSTANCE_NUMBER : null,
    instanceType: e.INSTANCE_TYPE || null,
    commit: short(e.CC_COMMIT_ID, 7),
    deployment: short(e.CC_DEPLOYMENT_ID, 16),
    pgVersion: meta.pgVersion,
    pgMajor: pgMajor,
    database: meta.database,
    nodeVersion: process.version,
    nodeMajor: process.versions.node.split('.')[0],
    expressVersion: expressVersion,
    stack: 'Node.js ' + process.versions.node.split('.')[0] + ' · Express ' + expressVersion.split('.')[0] + ' · PostgreSQL' + (pgMajor ? ' ' + pgMajor : ''),
  };
}

module.exports = {
  // Pool dimensionné pour le plan add-on : règle pool × instances ≤ connexions du plan.
  // PG_POOL_MAX permet d'ajuster sans toucher au code (valeur invalide → 4).
  connectDB: function () {
    var max = Number(process.env.PG_POOL_MAX);
    pool = new pg.Pool({
      connectionString: process.env.POSTGRESQL_ADDON_DIRECT_URI || process.env.POSTGRESQL_ADDON_URI,
      max: Number.isInteger(max) && max > 0 ? max : 4,
      idleTimeoutMillis: 60000, // garde la connexion chaude entre deux rechargements (« Temps » stable à l'écran)
      connectionTimeoutMillis: 5000,
    });
    // Une connexion idle coupée par l'add-on ne doit pas tuer le process
    pool.on('error', function (err) {
      console.error('[pg] idle client error', err.message);
    });
    return pool.query(schemaText)
      .then(function () {
        return pool.query("SELECT current_setting('server_version') AS v, current_database() AS db");
      })
      .then(function (res) {
        meta.pgVersion = (res.rows[0].v || '').split(' ')[0] || null;
        meta.database = res.rows[0].db || null;
      })
      .catch(function (err) {
        // Fail-fast explicite au boot : sans schéma, l'app ne peut rien servir
        console.error('[db] init schema impossible :', err.message);
        process.exit(1);
      });
  },

  // Utilisé par /health : SELECT 1 avec timeout court
  ping: function () {
    return pool.query({ text: 'SELECT 1', query_timeout: 2000 });
  },

  // Utilisé à l'arrêt (SIGTERM) pour rendre les connexions proprement
  close: function () {
    return pool ? pool.end() : Promise.resolve();
  },

  platformInfo: platformInfo,

  // Liste + compteurs en une requête ; sqlMs = sa durée (affichée façon \timing de psql)
  overview: function () {
    var start = process.hrtime.bigint();
    return pool.query(overviewText, [LIST_LIMIT]).then(function (res) {
      var s = res.rows[0];
      return {
        values: s.rows.map(toRow),
        sqlMs: elapsedMs(start),
        total: s.total,
        lastAt: s.last_at,
        hourly: s.hourly,
      };
    });
  },

  insert: function (value) {
    var start = process.hrtime.bigint();
    return pool.query(
      "INSERT INTO values(data) VALUES($1) RETURNING id, data->>'value' AS value, created_at",
      [{ value: value }]
    ).then(function (res) {
      return { row: toRow(res.rows[0]), sqlMs: elapsedMs(start) };
    });
  },

  remove: function (id) {
    var start = process.hrtime.bigint();
    return pool.query('DELETE FROM values WHERE id = $1', [id]).then(function (res) {
      return { count: res.rowCount, sqlMs: elapsedMs(start) };
    });
  },
};
