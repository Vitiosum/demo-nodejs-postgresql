var express = require('express');
var pg = require('../db');

var router = express.Router();

var VALUE_MAX_LENGTH = 32; // cohérent avec maxlength du formulaire (views/index.pug)

// Garde anti-CSRF sans dépendance : les navigateurs envoient Sec-Fetch-Site ;
// un formulaire hébergé sur un autre site vaut « cross-site ».
function rejectCrossSite(req, res, next) {
  if (req.get('Sec-Fetch-Site') === 'cross-site') {
    return res.status(403).json({ status: 'error', value: 'Requête cross-site refusée' });
  }
  next();
}

// Vérifie réellement PostgreSQL (SELECT 1, timeout 2 s) : 200 ou 503
router.get('/health', function(req, res) {
  pg.ping()
    .then(function () { res.json({ status: 'ok', db: 'up' }); })
    .catch(function (err) {
      console.error('[health] PostgreSQL injoignable :', err.message);
      res.status(503).json({ status: 'degraded', db: 'down' });
    });
});

/* GET home page. */
router.get('/', function(req, res) {
  pg.getVal(res);
});

// Charge CPU volontaire (~7-9 s par appel, bloque l'event loop).
// Servie uniquement si ENABLE_PRIME=true, le temps d'une démo de charge.
if (process.env.ENABLE_PRIME === 'true') {
  router.get('/prime', function(req, res) {
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

router.post('/values', rejectCrossSite, function(req, res) {
  var val = req.body ? req.body.value : undefined;

  if (typeof val !== 'string') {
    return res.status(400).json({ status: 'error', value: 'La valeur doit être une chaîne de caractères.' });
  }
  val = val.trim();
  if (val === '') {
    return res.status(400).json({ status: 'error', value: 'Saisissez une valeur avant d\'ajouter.' });
  }
  if (val.length > VALUE_MAX_LENGTH) {
    return res.status(400).json({ status: 'error', value: 'La valeur dépasse ' + VALUE_MAX_LENGTH + ' caractères.' });
  }
  pg.sendVal(val, res);
});

router.delete('/values/:id', rejectCrossSite, function(req, res) {
  var id = req.params.id;

  if (!/^\d{1,10}$/.test(id) || Number(id) > 2147483647) {
    return res.status(400).json({ status: 'error', value: 'Identifiant invalide.' });
  }
  pg.delVal(id, function (err) {
    if (err) {
      return res.status(500).json({ status: 'error', value: 'Erreur base de données' });
    }
    res.json({ status: 'ok', value: id });
  });
});

module.exports = router;
