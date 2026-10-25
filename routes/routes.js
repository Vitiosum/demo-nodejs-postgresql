var express = require('express');
var pg = require('../db');
var cfg = require('../config');

var router = express.Router();

// Garde anti-CSRF sans dépendance : les navigateurs envoient Sec-Fetch-Site ;
// un formulaire hébergé sur un autre site vaut « cross-site ».
function rejectCrossSite(req, res, next) {
  if (req.get('Sec-Fetch-Site') === 'cross-site') {
    return res.status(403).json({ status: 'error', value: 'Requête cross-site refusée' });
  }
  next();
}

// READ_ONLY=true : la base est gelée (démo de variable d'environnement)
function rejectReadOnly(req, res, next) {
  if (cfg.readOnly) {
    return res.status(403).json({ status: 'error', value: 'Base en lecture seule (READ_ONLY=true).' });
  }
  next();
}

// Formulaire envoyé sans JavaScript : on revient sur la page plutôt que d'afficher du JSON
function wantsHtml(req) {
  return !req.xhr && (req.get('Accept') || '').indexOf('text/html') !== -1;
}

function ms(n) {
  return Math.round(n * 100) / 100;
}

// Vérifie réellement PostgreSQL (SELECT 1, timeout 2 s) : 200 ou 503
router.get('/health', function (req, res) {
  pg.ping()
    .then(function () { res.json({ status: 'ok', db: 'up' }); })
    .catch(function (err) {
      console.error('[health] PostgreSQL injoignable :', err.message);
      res.status(503).json({ status: 'degraded', db: 'down' });
    });
});

router.get('/', function (req, res, next) {
  pg.overview()
    .then(function (data) {
      res.render('index', {
        title: 'Node.js + PostgreSQL · Démo Clever Cloud',
        data: data,
        sqlMs: ms(data.sqlMs),
      });
    })
    .catch(function (err) {
      console.error('[db] lecture impossible :', err.message);
      var e = new Error('Erreur base de données');
      e.status = 500;
      next(e);
    });
});

// Charge CPU volontaire (~7-9 s par appel, bloque l'event loop).
// Servie uniquement si ENABLE_PRIME=true, le temps d'une démo de charge.
if (process.env.ENABLE_PRIME === 'true') {
  router.get('/prime', function (req, res) {
    function slowFunction(baseNumber) {
      console.time('slowFunction');
      var result = 0;
      for (var i = Math.pow(baseNumber, 7); i >= 0; i--) {
        result += Math.atan(i) * Math.tan(i);
      }
      console.timeEnd('slowFunction');
      return result;
    }

    var value = slowFunction(12); // higher number => more iterations => slower
    res.json({ status: 'ok', value: value });
  });
}

router.post('/values', rejectCrossSite, rejectReadOnly, function (req, res) {
  var val = req.body ? req.body.value : undefined;
  var html = wantsHtml(req);
  var fail = function (msg) {
    return html ? res.redirect(303, '/#psql-input') : res.status(400).json({ status: 'error', value: msg });
  };

  if (typeof val !== 'string') return fail('La valeur doit être une chaîne de caractères.');
  val = val.trim();
  if (val === '') return fail('Saisissez une valeur avant d\'envoyer.');
  if (val.length > cfg.valueMaxLength) return fail('La valeur dépasse ' + cfg.valueMaxLength + ' caractères (VALUE_MAX_LENGTH).');

  pg.insert(val)
    .then(function (out) {
      if (html) return res.redirect(303, '/#psql-input');
      res.status(201).json({ status: 'ok', id: out.row.id, value: out.row.value, createdAt: out.row.createdAt, sqlMs: ms(out.sqlMs) });
    })
    .catch(function (err) {
      console.error('[db] insertion impossible :', err.message);
      res.status(500).json({ status: 'error', value: 'Erreur base de données' });
    });
});

router.delete('/values/:id', rejectCrossSite, rejectReadOnly, function (req, res) {
  var id = req.params.id;

  if (!/^\d{1,10}$/.test(id) || Number(id) > 2147483647) {
    return res.status(400).json({ status: 'error', value: 'Identifiant invalide.' });
  }
  pg.remove(id)
    .then(function (out) {
      res.json({ status: 'ok', value: id, count: out.count, sqlMs: ms(out.sqlMs) });
    })
    .catch(function (err) {
      console.error('[db] suppression impossible :', err.message);
      res.status(500).json({ status: 'error', value: 'Erreur base de données' });
    });
});

module.exports = router;
