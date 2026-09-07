var express       = require('express');
var path          = require('path');
var fs            = require('fs');
var logger        = require('morgan');
var pg       = require('./db');

var routes = require('./routes/routes');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Clever Brand Kit : logo et badge certification en SVG inline (aucune requête externe)
app.locals.ccLogo = fs.readFileSync(path.join(__dirname, 'views/partials/cc-logo.svg'), 'utf8');
app.locals.ccBadge = fs.readFileSync(path.join(__dirname, 'views/partials/cc-badge.svg'), 'utf8');

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

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
  app.locals.pretty = true;
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

pg.connectDB();

module.exports = app;
