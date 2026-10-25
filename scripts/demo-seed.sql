-- Jeu de démo : 16 valeurs, dates relatives à now() (le pouls des 24 h et les âges repartent de maintenant).
-- Rejouable : vide la table et remet la séquence à 1. Lancé par scripts/reset-demo.sh.
SET client_min_messages = warning;
BEGIN;

CREATE TABLE IF NOT EXISTS values (
  id SERIAL PRIMARY KEY,
  data JSONB
);
ALTER TABLE values ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

TRUNCATE values RESTART IDENTITY;

INSERT INTO values (data, created_at)
SELECT jsonb_build_object('value', v), now() - ago
FROM (VALUES
  ('Premier déploiement sur Clever', interval '2 days 3 hours'),
  ('Add-on PostgreSQL lié', interval '2 days 2 hours 40 minutes'),
  ('Bonjour depuis Nantes', interval '23 hours 10 minutes'),
  ('Hello from Lisbon', interval '21 hours 25 minutes'),
  ('Rebuild plus court avec le cache', interval '18 hours 5 minutes'),
  ('Café ou thé ? Café.', interval '15 hours 50 minutes'),
  ('Salut l''équipe avant-vente', interval '11 hours 30 minutes'),
  ('Test depuis mon téléphone', interval '9 hours 12 minutes'),
  ('Grüße aus Berlin', interval '8 hours 40 minutes'),
  ('Démo client à 14 h', interval '6 hours 5 minutes'),
  ('git push et c''est en ligne', interval '4 hours 20 minutes'),
  ('Instance #1 répond aussi', interval '3 hours 2 minutes'),
  ('Vu au stand Clever Cloud', interval '2 hours 15 minutes'),
  ('Bonjour de Toulouse', interval '58 minutes'),
  ('Rechargé après clever restart', interval '17 minutes'),
  ('Prêt pour le tournage', interval '3 minutes')
) AS seed(v, ago)
ORDER BY ago DESC;

COMMIT;
