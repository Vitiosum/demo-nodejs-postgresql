// Bout en bout contre une vraie base : TEST_DATABASE_URL=postgresql://… npm test
// Sans cette variable, ces tests sont ignorés (les autres tournent sans base).
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');

const DB = process.env.TEST_DATABASE_URL;
const skip = DB ? false : 'TEST_DATABASE_URL absent';
const ROOT = path.join(__dirname, '..');

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    }).on('error', reject);
  });
}

async function start(extraEnv = {}) {
  const port = await freePort();
  const env = { ...process.env, POSTGRESQL_ADDON_URI: DB, PORT: String(port), NODE_ENV: 'production', ...extraEnv };
  ['POSTGRESQL_ADDON_DIRECT_URI', 'APP_ID', 'ENABLE_PRIME', 'READ_ONLY', 'VALUE_MAX_LENGTH'].forEach((k) => { if (!(k in extraEnv)) delete env[k]; });
  const child = spawn(process.execPath, ['bin/www'], { cwd: ROOT, env, stdio: 'ignore' });
  const base = 'http://127.0.0.1:' + port;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(base + '/health')).ok) return { base, stop: () => child.kill('SIGTERM') }; } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  child.kill('SIGKILL');
  throw new Error('app non démarrée');
}

const ajax = { 'X-Requested-With': 'fetch', 'Content-Type': 'application/x-www-form-urlencoded' };

test('écriture et lecture réelles dans PostgreSQL', { skip }, async (t) => {
  const app = await start();
  t.after(app.stop);

  const health = await fetch(app.base + '/health');
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok', db: 'up' });

  const page = await fetch(app.base + '/');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(page.headers.get('x-frame-options'), 'DENY');
  assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(!page.headers.has('x-powered-by'));
  const html = await page.text();
  assert.match(html, /fiches? dans PostgreSQL\./);
  assert.match(html, /Une seule requête SQL pour cette page\./);

  const value = 'test-' + Date.now();
  const created = await fetch(app.base + '/values', { method: 'POST', headers: ajax, body: 'value=' + encodeURIComponent('  ' + value + '  ') });
  assert.equal(created.status, 201);
  const row = await created.json();
  assert.equal(row.status, 'ok');
  assert.equal(row.value, value);
  assert.ok(Number.isInteger(row.id) && typeof row.sqlMs === 'number' && row.createdAt);

  assert.ok((await (await fetch(app.base + '/')).text()).includes(value));

  const removed = await fetch(app.base + '/values/' + row.id, { method: 'DELETE', headers: ajax });
  assert.equal(removed.status, 200);
  assert.equal((await removed.json()).count, 1);
  assert.equal((await (await fetch(app.base + '/values/' + row.id, { method: 'DELETE', headers: ajax })).json()).count, 0);
});

test('validation et gardes des écritures', { skip }, async (t) => {
  const app = await start();
  t.after(app.stop);
  const post = (body, headers = {}) => fetch(app.base + '/values', { method: 'POST', headers: { ...ajax, ...headers }, body, redirect: 'manual' });

  assert.equal((await post('value=')).status, 400);
  assert.equal((await post('value=%20%20')).status, 400);
  assert.equal((await post('value=' + 'x'.repeat(33))).status, 400);
  assert.equal((await post('value=x', { 'Sec-Fetch-Site': 'cross-site' })).status, 403);

  const exact = await post('value=' + 'y'.repeat(32));
  assert.equal(exact.status, 201);
  const id = (await exact.json()).id;
  await fetch(app.base + '/values/' + id, { method: 'DELETE', headers: ajax });

  const form = await fetch(app.base + '/values', { method: 'POST', redirect: 'manual', headers: { Accept: 'text/html', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'value=' });
  assert.equal(form.status, 303);
  assert.equal(form.headers.get('location'), '/#psql-input');

  for (const bad of ['abc', '0x1', '99999999999', '2147483648']) {
    assert.equal((await fetch(app.base + '/values/' + bad, { method: 'DELETE', headers: ajax })).status, 400, bad);
  }
  assert.equal((await fetch(app.base + '/prime')).status, 404);
  assert.equal((await fetch(app.base + '/nope')).status, 404);
});

test('READ_ONLY=true gèle la base', { skip }, async (t) => {
  const app = await start({ READ_ONLY: 'true', VALUE_MAX_LENGTH: '64' });
  t.after(app.stop);
  assert.equal((await fetch(app.base + '/values', { method: 'POST', headers: ajax, body: 'value=x' })).status, 403);
  assert.equal((await fetch(app.base + '/values/1', { method: 'DELETE', headers: ajax })).status, 403);
  const html = await (await fetch(app.base + '/')).text();
  assert.match(html, /READ_ONLY=true : écritures refusées/);
  assert.ok(!html.includes('data-delete'));
});
