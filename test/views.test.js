// Rendu des vues sans base de données : le fichier, la machine à écrire, les variables de démo.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pug = require('pug');

const VIEWS = path.join(__dirname, '..', 'views');
const svg = (f) => fs.readFileSync(path.join(VIEWS, 'partials', f), 'utf8');

const localCc = {
  live: false, appName: null, appId: null, instance: null, instanceNumber: null, instanceType: null,
  commit: null, deployment: null, pgVersion: '17.6', pgMajor: '17', database: 'demo_db',
  nodeVersion: 'v24.0.0', nodeMajor: '24', expressVersion: '5.2.1', stack: 'Node.js 24 · Express 5 · PostgreSQL 17',
};

function render(view, opts = {}) {
  const now = Date.now();
  const values = opts.values || [
    { id: 3, value: '<script>alert(1)</script>', createdAt: new Date(now - 60e3) },
    { id: 2, value: 'Bonjour de Nantes', createdAt: new Date(now - 3 * 3600e3) },
    { id: 1, value: 'Premier déploiement', createdAt: new Date(now - 30 * 3600e3) },
  ];
  const hourly = Array(24).fill(0);
  hourly[23] = 1;
  hourly[20] = 1;
  return pug.renderFile(path.join(VIEWS, view + '.pug'), {
    title: 'test',
    data: { values, total: opts.total ?? values.length, lastAt: values[0] && values[0].createdAt, hourly },
    sqlMs: 1.23,
    overviewSql: 'SELECT (SELECT count(*)::int FROM values) AS total',
    listLimit: 200,
    cc: { ...localCc, ...(opts.cc || {}) },
    cfg: { appEnv: 'local', announcement: '', readOnly: false, valueMaxLength: 32, ...(opts.cfg || {}) },
    ago: () => 'il y a 1 min',
    hourLabel: (h) => (24 - h) % 24 + ' h',
    ccLogo: svg('cc-logo.svg'),
    ccBadge: svg('cc-badge.svg'),
    message: 'Page introuvable',
    error: { status: 404 },
  });
}

test('premier écran : terminal psql, compteur et INSERT saisissable', () => {
  const html = render('index');
  assert.match(html, /3 fiches dans PostgreSQL\./);
  assert.match(html, /SELECT id, value, created_at FROM values ORDER BY id DESC LIMIT 6;/);
  assert.match(html, /INSERT INTO values VALUES \('/);
  assert.match(html, /id="psql-input"[^>]*maxlength="32"|maxlength="32"[^>]*id="psql-input"/);
  assert.match(html, /0\/32 caractères · VALUE_MAX_LENGTH/);
  assert.match(html, /Temps : 1,23 ms/);
});

test('un tiroir par heure, le tiroir en cours marqué', () => {
  const html = render('index');
  assert.equal((html.match(/class="fi-drawer[ "]/g) || []).length, 24);
  assert.match(html, /id="fi-now"[^>]*data-h="0"[^>]*data-count="1"/);
});

test('les valeurs sont échappées (fiches, terminal, tiroir ouvert)', () => {
  const html = render('index');
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
});

test('variables de démo visibles sur la machine', () => {
  const html = render('index', { cfg: { appEnv: 'production', announcement: 'Tournage en cours', valueMaxLength: 64 } });
  assert.match(html, /class="fi-env is-production">production</);
  assert.match(html, /<code>ANNOUNCEMENT<\/code><span>Tournage en cours<\/span>/);
  assert.match(html, /maxlength="64"/);
  assert.match(html, /<span>ANNOUNCEMENT<\/span><b>définie<\/b>/);
});

test('READ_ONLY=true : plus d\'INSERT ni de bouton Retirer', () => {
  const html = render('index', { cfg: { readOnly: true } });
  assert.match(html, /-- READ_ONLY=true : écritures refusées par l'application/);
  assert.match(html, /Lecture seule · READ_ONLY=true/);
  assert.ok(!html.includes('id="psql-input"'));
  assert.ok(!html.includes('data-delete'));
});

test('tiroir vide', () => {
  const html = render('index', { values: [], total: 0 });
  assert.match(html, /0 fiche dans PostgreSQL\./);
  assert.match(html, /Le tiroir est vide\./);
});

test('Running on Clever Cloud : Local hors plateforme, variables injectées sur Clever', () => {
  const local = render('index');
  assert.match(local, /Running on Clever Cloud/);
  assert.match(local, /class="fi-plaque__tag">Local</);
  assert.match(local, /injecté au déploiement/);

  const live = render('index', { cc: { live: true, appName: 'demo-nodejs-postgresql', appId: 'app_123', instance: '#0 · Brave Pikachu', instanceNumber: '#0', instanceType: 'build-less', commit: 'abc1234', deployment: 'deployment_1234' } });
  assert.match(live, /fi-plaque__tag is-live">Live</);
  for (const v of ['app_123', '#0 · Brave Pikachu', 'build-less', 'abc1234', 'deployment_1234']) assert.ok(live.includes(v), v);
  assert.match(live, /Live on Clever Cloud/);
});

test('certification Clever Cloud Academy : badge, message et lien', () => {
  const html = render('index');
  assert.match(html, /id="cert-title">Cette app tourne sur Clever Cloud\. Vous aussi, certifiez-vous\./);
  assert.match(html, /class="cc-cert__badge"/);
  assert.match(html, /href="https:\/\/academy\.clever\.cloud\/"/);
  assert.equal((html.match(/id="ccBadgeGrad"/g) || []).length, 1);
});

test('page d\'erreur', () => {
  const html = render('error');
  assert.match(html, /Erreur 404/);
  assert.match(html, /Page introuvable/);
});
