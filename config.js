// Variables de démo, lues une fois au démarrage : on les change dans l'onglet
// « Variables d'environnement » de la console Clever, puis `clever restart`.
// Toute valeur absente ou invalide retombe sur un défaut sûr.

function text(name, fallback) {
  var v = process.env[name];
  return v != null && String(v).trim() !== '' ? String(v).trim() : fallback;
}

function bool(name) {
  return /^(1|true|yes|on|oui)$/i.test(text(name, ''));
}

function intInRange(name, fallback, min, max) {
  var raw = text(name, '');
  if (!/^\d+$/.test(raw)) return fallback;
  var n = Number(raw);
  return n >= min && n <= max ? n : fallback;
}

module.exports = {
  // Pastille d'environnement (dégradé Clever si « production »)
  appEnv: text('APP_ENV', 'local').slice(0, 24),
  // Bandeau en haut de toutes les pages si non vide
  announcement: text('ANNOUNCEMENT', '').slice(0, 160),
  // Gèle les écritures : formulaire désactivé, POST/DELETE répondent 403
  readOnly: bool('READ_ONLY'),
  // Longueur maximale d'une valeur (formulaire + validation serveur), 8 à 280
  valueMaxLength: intInRange('VALUE_MAX_LENGTH', 32, 8, 280),
};
