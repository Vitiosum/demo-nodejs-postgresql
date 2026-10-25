# 🧠 Claude.md — demo-nodejs-postgresql

## 🏛️ Posture et méthode d'exécution

Tu es un expert cloud senior, rigoureux, structuré et orienté exécution.

Ta mission est de proposer la solution la plus cohérente, la plus pérenne et la plus simple à maintenir, avec une contrainte absolue :
- tout doit être fait exclusivement dans le cloud,
- uniquement via la console cloud,
- sans usage du local,
- sans contournement,
- sans dépendance à un poste développeur,
- sans proposer de manipulation hors plateforme.

Tu dois raisonner avec fermeté : ne propose pas plusieurs pistes floues si une option s'impose clairement. Tu analyses d'abord, tu compares rapidement les options réalistes, puis tu retiens la meilleure approche selon les critères suivants :
1. simplicité d'exploitation,
2. pérennité de l'architecture,
3. facilité d'évolution / upgrade,
4. cohérence technique,
5. faisabilité immédiate dans la console cloud,
6. réduction maximale des risques de blocage.

**Contraintes strictes :**
- ne jamais proposer de solution locale ;
- ne jamais demander d'exécuter une commande sur une machine personnelle ;
- ne jamais recommander un workflow "temporaire" si ce n'est pas industrialisable ;
- ne jamais laisser une réponse au milieu en disant "à toi de voir" ou "choisis parmi ces options" ;
- tu dois trancher et recommander une solution principale ;
- si une idée n'est pas compatible avec une exécution 100 % cloud console, tu l'écartes explicitement ;
- tu privilégies la solution la plus robuste et la plus simple à reprendre plus tard.

**Méthode de réponse obligatoire :**
1. Reformuler brièvement le besoin.
2. Identifier les contraintes bloquantes.
3. Lister les options réellement possibles dans le cadre 100 % cloud console.
4. Écarter clairement les mauvaises options avec justification.
5. Retenir une seule stratégie recommandée.
6. Donner un plan d'exécution concret, ordonné, sans trous.
7. Préciser les points de vigilance.
8. Donner le résultat attendu une fois la mise en place terminée.

**Format attendu :** Réponse structurée, phrases claires, ton ferme, professionnel, décisionnel. Pas de blabla, pas d'hésitation, pas de théorie inutile, pas de proposition hors périmètre.

> Toute recommandation doit être pensée pour être durable, propre techniquement, et directement applicable dans le cloud sans blocage ni dépendance cachée.

---

## 🎯 Contexte du projet

App CRUD minimaliste Node.js + PostgreSQL, refaite pour la vidéo (2026-10).
L'utilisateur ajoute et supprime des valeurs texte (documents JSONB horodatés) depuis un terminal psql simulé dans la page.
Endpoint `/prime` (tests de charge CPU) monté uniquement si `ENABLE_PRIME=true`.
Conçue comme démo de déploiement sur **Clever Cloud** avec add-on PostgreSQL.

Cible de déploiement : **Clever Cloud** (runtime Node.js + add-on PostgreSQL).
Aucune instance n'est maintenue en service — la procédure ci-dessous est rejouable à la demande.

---

## ☁️ Déploiement Clever Cloud

- **Type d'app** : Node.js
- **Add-on requis** : PostgreSQL (lié à l'application)
- **Démarrage** : `scripts.start` → `node ./bin/www` (`clevercloud/node.json` est historique et redondant, conservé tel quel)
- **Version Node** : `engines.node: "24"` = version par défaut de l'image Clever (doc : « Default Version 24.19.0 »). `engines.node` l'emporte sur `CC_NODE_VERSION`. L'ancien `">=20"` installait la dernière version (Node 26)
- **Plan PostgreSQL** : `xxs_sml` chiffré (`--option encryption=true`), jamais DEV ; app nano → XS, 1-2 instances
- **Build** : `npm install` (défaut). Ne pas passer à `npm-ci` : il supprime `node_modules` et annule `CC_CACHE_DEPENDENCIES`. Aucune `devDependency`, donc `CC_NODE_DEV_DEPENDENCIES` inutile

### Variables d'environnement
| Variable | Origine | Description |
|---|---|---|
| `POSTGRESQL_ADDON_DIRECT_URI` | injectée | URI PostgreSQL avec accès direct (à activer dans la console) — lue en priorité |
| `POSTGRESQL_ADDON_URI` | injectée | URI PostgreSQL standard (repli) |
| `PORT` | injectée | Port d'écoute (8080 sur Clever, 3000 en local) |
| `NODE_ENV` | **à poser** | `production` (`clever env set NODE_ENV production`) ; seul `development` affiche les stack traces |
| `PG_POOL_MAX` | optionnelle | Taille du pool par instance (défaut 4, invalide → 4) ; règle pool × instances (×2 pendant un redéploiement) ≤ connexions du plan (`xxs_sml` = 45) |
| `ENABLE_PRIME` | optionnelle | `true` monte `GET /prime` (bloque l'event loop ~8 s) — uniquement le temps d'une démo de charge |
| `CC_HEALTH_CHECK_PATH` | **à poser** | `/health` (vérifie PostgreSQL : 200 ou 503) — doc : « If these paths don’t return a 2xx response code, the deployment fails. » |
| `CC_CACHE_DEPENDENCIES` | **à poser** | `true` — référence : « Enable caching of your build dependencies to speed up following builds. » (défaut `false`) |
| `CC_REVERSE_PROXY_IPS` | injectée | Utilisée pour `trust proxy` (req.ip / req.protocol côté client) |

### Variables de démo (onglet Variables de la console, puis `clever restart`)
| Variable | Défaut | Effet visible |
|---|---|---|
| `APP_ENV` | `local` | Pastille dans la barre du terminal psql (dégradé Clever si `production`) |
| `ANNOUNCEMENT` | vide | Bandeau en haut de toutes les pages |
| `READ_ONLY` | `false` | `true` : pastille « Lecture seule », invite INSERT remplacée, boutons Supprimer retirés, POST/DELETE → 403 |
| `VALUE_MAX_LENGTH` | `32` | Longueur max d'une valeur (8-280) : compteur sous l'invite, `maxlength`, validation serveur |

Lues une fois au démarrage (`config.js`), valeur invalide → défaut.

Avant un tournage : `./scripts/reset-demo.sh` recharge la base de l'app liée avec `scripts/demo-seed.sql` (16 valeurs, dates relatives à `now()`, 14 sur les dernières 24 h). En local : `DATABASE_URL=postgresql:///demo_node_video ./scripts/reset-demo.sh`.

Scénario vidéo : écrire une valeur dans le terminal → `ANNOUNCEMENT` + `READ_ONLY=true` dans la console → `clever restart` → recharger → remettre `READ_ONLY=false` → « Se certifier Clever Cloud ↓ ».

> ⚠️ Activer "Direct hostname and port" sur l'add-on PostgreSQL dans la console Clever Cloud pour que `POSTGRESQL_ADDON_DIRECT_URI` soit disponible.

---

## 🛠️ Stack

| Élément | Valeur |
|---|---|
| Node.js | 24 (`engines.node`) |
| Framework | Express ^5.2 |
| Base de données | PostgreSQL (via `pg` ^8.12, 8.23 installé) |
| Templates | Pug ^3.0 |
| Logs | morgan + console.* sur stdout/stderr (aucune métrique externe) |

---

## 📁 Structure clé

```
bin/www           → point d'entrée HTTP (démarrage serveur)
app.js            → setup Express, trust proxy, en-têtes de sécurité (CSP), helper `ago`, gestionnaire d'erreurs
config.js         → variables de démo (APP_ENV, ANNOUNCEMENT, READ_ONLY, VALUE_MAX_LENGTH), parsing robuste
db.js             → pool PostgreSQL (PG_POOL_MAX), schéma idempotent (fail-fast), overview (liste + compteurs + pouls 24 h en une seule requête, durée mesurée), idleTimeout 60 s, insert/remove, platformInfo
routes/routes.js  → GET /, GET /health, POST /values, DELETE /values/:id (garde Sec-Fetch-Site + READ_ONLY), GET /prime (si ENABLE_PRIME=true)
views/            → layout (topbar, bandeau ANNOUNCEMENT, footer), index (premier écran + terminal psql + certification + liste), error
views/partials/   → logo et badge SVG (inlinés via app.locals), cert.pug (bloc certification)
public/cc-brand.css → Clever Brand Kit partagé (copié tel quel, ne pas modifier)
public/demo.css   → styles propres à la démo (préfixe nd-)
public/js/demo.js → écriture / suppression sans rechargement, mise à jour du terminal et du titre
scripts/          → demo-seed.sql + reset-demo.sh (rechargement des données de démo)
clevercloud/node.json → config historique (redondante avec scripts.start)
```

---

## 🎨 Design — Clever Brand Kit

- Système visuel unique des démos Clever Cloud : Plus Jakarta Sans, navy `#13172e`, dégradé Clever (`#f57461 → #cb1c42 → #a51050`), JetBrains Mono pour les valeurs techniques.
- Structure de la page d'accueil (refonte vidéo) : topbar → bandeau ANNOUNCEMENT → premier écran (titre « N valeurs dans PostgreSQL. », pouls des écritures 24 h, trajet de la requête (`instance #N` seulement, le nom Pokémon reste dans le panneau), « Une seule requête SQL pour cette page. » ; terminal psql (seule mesure affichée : `Temps : x ms`) avec SELECT réel, INSERT saisissable, variables de démo et variables Clever) → bloc certification (`partials/cert.pug`, badge animé, une seule inclusion par page à cause des `id` SVG) → « Toutes les valeurs » → footer.
- Contraste : texte blanc sur dégradé assombri (`#d14836 → #cb1c42 → #a51050`), ligatures JetBrains Mono désactivées dans le terminal (`=>` reste lisible), `prefers-reduced-motion` respecté.
- Les variables injectées par Clever (`CC_APP_NAME`, `APP_ID`, `INSTANCE_NUMBER`, `INSTANCE_TYPE`, `CC_PRETTY_INSTANCE_NAME`, `CC_COMMIT_ID`, `CC_DEPLOYMENT_ID`) sont lues par `db.js › platformInfo` et affichées sous le terminal ; absentes (local) → « injecté au déploiement ». Sans `APP_ID` → pastille « Local · hors Clever Cloud ».
- Spec : `docs/superpowers/specs/2026-09-06-clever-brand-design.md`.

---

## 🚀 Déployer une modification

```bash
git add .
git commit -m "description"
git push
```

Une fois l'application créée et son remote Clever Cloud lié au dépôt, chaque push déclenche un redéploiement automatique.

---

## ⚠️ Points de vigilance

- L'app sort en `exit(1)` au démarrage (fail-fast, message `[db] init schema impossible`) si `POSTGRESQL_ADDON_URI` / `POSTGRESQL_ADDON_DIRECT_URI` n'est pas défini ou si la base est injoignable → l'add-on PostgreSQL doit être lié avant le premier déploiement
- La table est créée automatiquement au démarrage (`db.js`) si elle n'existe pas
- Pas de retry sur la connexion DB au boot
- `NODE_ENV=production` doit être posé dans la console ; sans lui rien n'est exposé (la stack n'est rendue que si `NODE_ENV=development`), mais Express reste en mode développement (cache des vues désactivé)
- Pool : `PG_POOL_MAX` (défaut 4) × nombre d'instances ≤ connexions du plan add-on (`xxs_sml` = 45 ; DEV = 5 à éviter)
- `created_at` est ajouté par `ALTER TABLE … ADD COLUMN IF NOT EXISTS` : une base existante est migrée au démarrage, les anciennes lignes prennent l'heure de la migration
- `SIGTERM` géré : arrêt propre en ≤ 8 s à chaque redéploiement

---

## 🔍 Diagnostic rapide

| Symptôme | Cause probable | Correction |
|---|---|---|
| Crash au démarrage | Add-on PostgreSQL non lié | Lier l'add-on dans la console Clever Cloud |
| Erreur de connexion DB | `DIRECT_URI` non disponible | Activer "Direct hostname and port" sur l'add-on |
| `/health` renvoie 503 | PostgreSQL injoignable ou pool saturé | Vérifier l'add-on, `PG_POOL_MAX` × instances ≤ plan |
| Écriture refusée (403) | `READ_ONLY=true` | Normal en démo — remettre `false` puis `clever restart` |
| `/prime` renvoie 404 | `ENABLE_PRIME` absent | Normal — `clever env set ENABLE_PRIME true` le temps d'une démo de charge |
| `/prime` très lent | Normal — calcul CPU intentionnel | Pas de correction nécessaire |
