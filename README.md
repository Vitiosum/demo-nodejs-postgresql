# Node.js + PostgreSQL — démo Clever Cloud

> Une app Express sur le runtime Node.js de Clever Cloud, branchée sur un add-on PostgreSQL managé. Le premier écran est un terminal psql qui lit et écrit pour de vrai dans la base.

---

## Ce que montre la page

| Zone | Contenu |
|---|---|
| Premier écran, à gauche | « N valeurs dans PostgreSQL. », dernière écriture, pouls des écritures sur 24 h (une case par heure), trajet de la requête navigateur → Clever Cloud → Node.js (`instance #N`) → PostgreSQL, « Une seule requête SQL pour cette page. » |
| Premier écran, à droite | Terminal psql : `SELECT` des 6 dernières lignes, `(N lignes)`, `Temps : x ms`, puis un `INSERT INTO values VALUES ('…')` saisissable (Entrée → `INSERT 0 1`). Dessous : variables de démo et variables injectées par Clever Cloud |
| Sous le premier écran | Bloc certification Clever Cloud Academy (badge animé, deux parcours, « Passer la certification ») |
| Plus bas | Toutes les valeurs (document JSONB, âge, suppression → `DELETE 1` dans le terminal) |

Boutons du premier écran : « Écrire une valeur » (focus sur le terminal) et « Se certifier Clever Cloud ↓ » (ancre vers le bloc certification).

---

## Déployer sur Clever Cloud

Application en service du 2026-10-25 au 2026-11-05 (suppression planifiée après le tournage vidéo du 2026-11-04) : `app_f0dd41c9-4aae-4906-9bec-d34f6d537227`, https://app-f0dd41c9-4aae-4906-9bec-d34f6d537227.cleverapps.io/, add-on `demo-node-db` (PostgreSQL `xxs_sml` chiffré). Après cette date, recréer avec la procédure ci-dessous.

```bash
clever create --type node demo-nodejs-postgresql
clever addon create postgresql-addon --plan xxs_sml --option encryption=true demo-node-db
clever service link-addon demo-node-db
clever env set NODE_ENV production
clever env set CC_HEALTH_CHECK_PATH /health
clever env set CC_CACHE_DEPENDENCIES true
clever deploy
```

Déployer une modification : `git push` (sauvegarde GitHub) puis `clever deploy`. Il n'y a pas de liaison GitHub → Clever Cloud : un `git push` seul ne redéploie pas.

Démarrage : `scripts.start` → `node ./bin/www`. Version Node : `engines.node: "24"`. La table `values` est créée (ou complétée par `created_at`) au démarrage.

### Variables Clever recommandées (preuve doc)

| Variable | Valeur | Pourquoi |
|---|---|---|
| `NODE_ENV` | `production` | Doc Node : « You enable production mode by setting the environment variable NODE_ENV=production » (exigence listée dans *Mandatory needs*) |
| `CC_HEALTH_CHECK_PATH` | `/health` | Doc Node : « If these paths don’t return a 2xx response code, the deployment fails. » `/health` fait un `SELECT 1` réel |
| `CC_CACHE_DEPENDENCIES` | `true` | Référence des variables : « Enable caching of your build dependencies to speed up following builds. » (défaut `false`) |

À **ne pas** poser :
- `CC_NODE_BUILD_TOOL=npm-ci` : `npm ci` supprime `node_modules` avant d'installer (doc npm : « If a node_modules is already present, it will be automatically removed before npm ci begins its install »), ce qui annule le cache de dépendances. Le défaut `npm install` (« npm or npm-install : default, uses npm install ») réutilise le cache.
- `CC_NODE_DEV_DEPENDENCIES` : inutile, le projet n'a aucune `devDependency` (doc : « Development dependencies aren’t automatically installed during the deployment »).
- `CC_NODE_VERSION` : doublon d'`engines.node`, qui l'emporte (« the system prioritizes the engines.node value in package.json over the CC_NODE_VERSION environment variable when both are set »).

`node_modules/` est dans `.gitignore` et n'est pas versionné (exigence de la doc : « The folder /node_modules is mentioned in your .gitignore file »).

---

## Variables de démo

À montrer dans l'onglet « Variables d'environnement » de la console, puis `clever restart` et rechargement de la page (lues au démarrage).

| Variable | Défaut | Effet visible |
|---|---|---|
| `APP_ENV` | `local` | Pastille dans la barre du terminal ; dégradé Clever si `production` |
| `ANNOUNCEMENT` | vide | Bandeau en haut de toutes les pages (160 caractères max) |
| `READ_ONLY` | `false` | `true` : pastille « Lecture seule », l'invite `INSERT` devient `-- READ_ONLY=true : écritures refusées`, boutons Supprimer retirés, `POST`/`DELETE` → 403 |
| `VALUE_MAX_LENGTH` | `32` | Longueur maximale d'une valeur (8 à 280) : compteur `0/32 caractères` sous l'invite, `maxlength` du champ et validation serveur (400 au-delà) |

Valeur invalide (texte, hors bornes, vide) → défaut.

### Scénario vidéo

1. `./scripts/reset-demo.sh` juste avant de tourner (16 valeurs, dates relatives à maintenant).
2. Montrer le premier écran, taper une valeur dans le terminal, Entrée : la ligne apparaît, le titre passe à 17.
3. Console → Variables : `ANNOUNCEMENT=Maintenance ce soir à 22 h`, `READ_ONLY=true` → `clever restart` → recharger : bandeau + base gelée.
4. Remettre `READ_ONLY=false`, `clever restart`.
5. Cliquer « Se certifier Clever Cloud ↓ ».

---

## Variables de fonctionnement

| Variable | Origine | Rôle |
|---|---|---|
| `POSTGRESQL_ADDON_DIRECT_URI` | injectée (accès direct activé) | Lue en priorité |
| `POSTGRESQL_ADDON_URI` | injectée | Repli |
| `PORT` | injectée (8080) | Local : 3000 par défaut |
| `PG_POOL_MAX` | optionnelle | Pool par instance (défaut 4, invalide → 4). Règle : `PG_POOL_MAX × instances` (×2 pendant un redéploiement) ≤ connexions du plan (`xxs_sml` = 45) |
| `ENABLE_PRIME` | optionnelle | `true` monte `GET /prime` (charge CPU ~6-8 s) le temps d'une démo de charge |
| `CC_APP_NAME`, `APP_ID`, `INSTANCE_NUMBER`, `CC_PRETTY_INSTANCE_NAME`, `INSTANCE_TYPE`, `CC_COMMIT_ID`, `CC_DEPLOYMENT_ID` | injectées | Affichées sous le terminal ; « injecté au déploiement » en local |

---

## Données de démo

- `scripts/demo-seed.sql` : 16 valeurs, `created_at` relatifs à `now()` (14 dans les dernières 24 h), `TRUNCATE … RESTART IDENTITY`.
- `scripts/reset-demo.sh` : lit `POSTGRESQL_ADDON_URI` de l'app liée via `clever env -F json` (clé `fromAddons[].env[]`, jamais affichée) et rejoue le seed. En local : `DATABASE_URL=postgresql:///demo_node_video ./scripts/reset-demo.sh`.

---

## En local

```bash
npm install
createdb demo_node_video
DATABASE_URL=postgresql:///demo_node_video ./scripts/reset-demo.sh
POSTGRESQL_ADDON_URI=postgresql:///demo_node_video PORT=8101 NODE_ENV=production \
  APP_ENV=production ANNOUNCEMENT="Tournage en cours" npm start
# → http://localhost:8101
```

Aucun fichier `.env` n'est lu : tout passe par les variables d'environnement, comme sur Clever Cloud.

---

## Stack

| Couche | Technologie |
|---|---|
| Runtime | Node.js 24 (`engines.node`) |
| Framework | Express 5 |
| Base | PostgreSQL (`pg` 8) |
| Templates | Pug 3 |
| Design | Clever Brand Kit (`public/cc-brand.css`, non modifié) + `public/demo.css` |

Sécurité : CSP, `nosniff`, `X-Frame-Options`, garde `Sec-Fetch-Site` sur les écritures, validation serveur, arrêt propre sur `SIGTERM`, `/health` qui interroge PostgreSQL (200 / 503).
