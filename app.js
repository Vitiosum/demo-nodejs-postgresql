var express       = require('express');
var path          = require('path');
var fs            = require('fs');
var logger        = require('morgan');
var pg       = require('./db');

var routes = require('./routes/routes');

var app = express();

// Derrière le reverse proxy Clever Cloud : req.ip / req.protocol reflètent le client
var proxies = (process.env.CC_REVERSE_PROXY_IPS || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
if (proxies.length) app.set('trust proxy', proxies);

// Ne pas annoncer le framework
app.disable('x-powered-by');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Clever Brand Kit : logo et badge certification en SVG inline (aucune requête externe)
app.locals.ccLogo = fs.readFileSync(path.join(__dirname, 'views/partials/cc-logo.svg'), 'utf8');
app.locals.ccBadge = fs.readFileSync(path.join(__dirname, 'views/partials/cc-badge.svg'), 'utf8');

// En-têtes de sécurité (CSP adaptée à la démo : Google Fonts, SVG inline, styles inline du kit)
var CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
].join('; ');
app.use(function (req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', CSP);
  next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Infos plateforme disponibles dans tous les templates (topbar, page d'erreur)
app.use(function(req, res, next) {
  res.locals.cc = pg.platformInfo();
  next();
});

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Gestionnaire d'erreurs : la stack n'est rendue que si NODE_ENV=development
// est posé explicitement ; en 5xx le message interne n'est jamais exposé.
var isDevelopment = process.env.NODE_ENV === 'development';
if (isDevelopment) app.locals.pretty = true;

app.use(function(err, req, res, next) {
  var status = Number(err.status || err.statusCode) || 500;
  if (status >= 500) console.error('[app] erreur non gérée :', err.stack || err);
  res.status(status);
  res.render('error', {
    message: status < 500 ? err.message : 'Erreur interne',
    error: { status: status, stack: isDevelopment ? err.stack : undefined }
  });
});

pg.connectDB();

module.exports = app;
