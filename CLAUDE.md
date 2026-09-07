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

App CRUD minimaliste Node.js + PostgreSQL.
L'utilisateur peut ajouter et supprimer des valeurs texte via une interface web.
Endpoint `/prime` (tests de charge CPU) monté uniquement si `ENABLE_PRIME=true`.
Conçue comme démo de déploiement sur **Clever Cloud** avec add-on PostgreSQL.

Cible de déploiement : **Clever Cloud** (runtime Node.js + add-on PostgreSQL).
Aucune instance n'est maintenue en service — la procédure ci-dessous est rejouable à la demande.

---

## ☁️ Déploiement Clever Cloud

- **Type d'app** : Node.js
- **Add-on requis** : PostgreSQL (lié à l'application)
- **Démarrage** : `scripts.start` → `node ./bin/www` (`clevercloud/node.json` est historique et redondant, conservé tel quel)
- **Version Node** : `engines.node: ">=20"` → la plateforme installe la version la plus récente satisfaisant la contrainte, pas une LTS figée (Node 26 au dernier déploiement) ; le panneau « Vu depuis Clever Cloud » affiche la version réellement exécutée

### Variables d'environnement
| Variable | Origine | Description |
|---|---|---|
| `POSTGRESQL_ADDON_DIRECT_URI` | injectée | URI PostgreSQL avec accès direct (à activer dans la console) — lue en priorité |
| `POSTGRESQL_ADDON_URI` | injectée | URI PostgreSQL standard (repli) |
| `PORT` | injectée | Port d'écoute (8080 sur Clever, 3000 en local) |
| `NODE_ENV` | **à poser** | `production` (`clever env set NODE_ENV production`) ; seul `development` affiche les stack traces |
| `PG_POOL_MAX` | optionnelle | Taille du pool par instance (défaut 4) ; règle pool × instances ≤ connexions du plan (DEV = 5) |
| `ENABLE_PRIME` | optionnelle | `true` monte `GET /prime` (bloque l'event loop ~8 s) — uniquement le temps d'une démo de charge |
| `CC_HEALTH_CHECK_PATH` | recommandée | `/health` (vérifie PostgreSQL : 200 ou 503) |
| `CC_REVERSE_PROXY_IPS` | injectée | Utilisée pour `trust proxy` (req.ip / req.protocol côté client) |

> ⚠️ Activer "Direct hostname and port" sur l'add-on PostgreSQL dans la console Clever Cloud pour que `POSTGRESQL_ADDON_DIRECT_URI` soit disponible.

---

## 🛠️ Stack

| Élément | Valeur |
|---|---|
| Node.js | >=20 |
| Framework | Express ^5.2 |
| Base de données | PostgreSQL (via `pg` ^8.12, 8.23 installé) |
| Templates | Pug ^3.0 |
| Logs | morgan + console.* sur stdout/stderr (aucune métrique externe) |

---

## 📁 Structure clé

```
bin/www           → point d'entrée HTTP (démarrage serveur)
app.js            → setup Express, trust proxy, en-têtes de sécurité (CSP), gestionnaire d'erreurs
db.js             → pool PostgreSQL (PG_POOL_MAX), init schema (fail-fast), ping/close, requêtes CRUD
routes/routes.js  → GET /, GET /health, POST /values, DELETE /values/:id, GET /prime (si ENABLE_PRIME=true), garde Sec-Fetch-Site
views/            → templates Pug (layout = topbar + footer Clever, index = héro + certification + démo + panneau plateforme)
views/partials/   → logo et badge certification Clever Cloud en SVG (inlinés via app.locals)
public/cc-brand.css → Clever Brand Kit partagé (copié tel quel, ne pas modifier)
public/demo.css   → styles spécifiques à la démo (toast, animations de lignes)
public/js/demo.js → ajout / suppression sans rechargement (POST /values, DELETE /values/:id)
clevercloud/node.json → config historique (redondante avec scripts.start)
```

---

## 🎨 Design — Clever Brand Kit

- Système visuel unique des démos Clever Cloud : Plus Jakarta Sans, navy `#13172e`, dégradé Clever (`#f57461 → #cb1c42 → #a51050`), JetBrains Mono pour les valeurs techniques.
- Structure de la page d'accueil : topbar → héro → bloc certification (academy.clever.cloud) → carte « Valeurs stockées » + panneau « Vu depuis Clever Cloud » → « Ce que Clever Cloud fait » → footer.
- Le panneau plateforme lit `CC_APP_NAME`, `APP_ID`, `INSTANCE_NUMBER`, `INSTANCE_TYPE`, `CC_PRETTY_INSTANCE_NAME`, `CC_COMMIT_ID`, `CC_DEPLOYMENT_ID` (`db.js › platformInfo`). Sans `APP_ID` → « Local · hors Clever Cloud ».
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
- Pool : `PG_POOL_MAX` (défaut 4) × nombre d'instances ≤ connexions du plan add-on (DEV = 5)
- `SIGTERM` géré : arrêt propre en ≤ 8 s à chaque redéploiement

---

## 🔍 Diagnostic rapide

| Symptôme | Cause probable | Correction |
|---|---|---|
| Crash au démarrage | Add-on PostgreSQL non lié | Lier l'add-on dans la console Clever Cloud |
| Erreur de connexion DB | `DIRECT_URI` non disponible | Activer "Direct hostname and port" sur l'add-on |
| `/health` renvoie 503 | PostgreSQL injoignable ou pool saturé | Vérifier l'add-on, `PG_POOL_MAX` × instances ≤ plan |
| `/prime` renvoie 404 | `ENABLE_PRIME` absent | Normal — `clever env set ENABLE_PRIME true` le temps d'une démo de charge |
| `/prime` très lent | Normal — calcul CPU intentionnel | Pas de correction nécessaire |
