// Variables de démo : lues une fois au démarrage, toute valeur invalide retombe sur son défaut.
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DEMO_VARS = ['APP_ENV', 'ANNOUNCEMENT', 'READ_ONLY', 'VALUE_MAX_LENGTH'];

// config.js lit l'environnement au chargement : un processus neuf par jeu de variables
function load(env) {
  const clean = { ...process.env };
  DEMO_VARS.forEach((k) => delete clean[k]);
  const out = execFileSync(process.execPath, ['-p', 'JSON.stringify(require("./config"))'], {
    cwd: ROOT,
    env: { ...clean, ...env },
  });
  return JSON.parse(out);
}

test('défauts sans variable', () => {
  assert.deepEqual(load({}), { appEnv: 'local', announcement: '', readOnly: false, valueMaxLength: 32 });
});

test('READ_ONLY accepte true, 1, yes, on, oui ; le reste vaut false', () => {
  for (const v of ['true', 'TRUE', '1', 'yes', 'on', 'oui']) assert.equal(load({ READ_ONLY: v }).readOnly, true, v);
  for (const v of ['false', '0', 'non', 'vrai', '']) assert.equal(load({ READ_ONLY: v }).readOnly, false, v);
});

test('VALUE_MAX_LENGTH borné à 8..280, sinon 32', () => {
  assert.equal(load({ VALUE_MAX_LENGTH: '8' }).valueMaxLength, 8);
  assert.equal(load({ VALUE_MAX_LENGTH: '280' }).valueMaxLength, 280);
  for (const v of ['7', '281', '-5', '12.5', 'abc']) assert.equal(load({ VALUE_MAX_LENGTH: v }).valueMaxLength, 32, v);
});

test('ANNOUNCEMENT et APP_ENV rognés et tronqués', () => {
  const cfg = load({ ANNOUNCEMENT: '  ' + 'x'.repeat(200) + '  ', APP_ENV: '  ' + 'p'.repeat(40) });
  assert.equal(cfg.announcement.length, 160);
  assert.equal(cfg.appEnv.length, 24);
});
