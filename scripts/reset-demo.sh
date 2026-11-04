#!/usr/bin/env bash
# Recharge la base PostgreSQL de l'app Clever liée (.clever.json) avec le jeu de démo.
# À lancer juste avant un tournage : les âges et le pouls des 24 h repartent de maintenant.
# En local : DATABASE_URL=postgresql:///demo_node_video ./scripts/reset-demo.sh
# Plusieurs apps liées au même clone : CLEVER_ALIAS=<alias> ./scripts/reset-demo.sh
# (défaut demo-nodejs-postgresql, l'alias que crée `clever create … demo-nodejs-postgresql`).
set -euo pipefail
cd "$(dirname "$0")/.."

uri="${DATABASE_URL:-}"
if [ -z "$uri" ]; then
  uri="$(clever env --alias "${CLEVER_ALIAS:-demo-nodejs-postgresql}" -F json | python3 -c '
import json, sys
d = json.load(sys.stdin)
for addon in d.get("fromAddons", []):
    for v in addon.get("env", []):
        if v.get("name") == "POSTGRESQL_ADDON_URI":
            print(v["value"])
')"
fi
[ -n "$uri" ] || { echo "POSTGRESQL_ADDON_URI introuvable : app liée ? (clever link, ou CLEVER_ALIAS=<alias>)" >&2; exit 1; }

psql -q -v ON_ERROR_STOP=1 "$uri" -f scripts/demo-seed.sql
psql -tA "$uri" -c "SELECT count(*) || ' valeurs, dont ' || count(*) FILTER (WHERE created_at > now() - interval '24 hours') || ' sur les dernières 24 h' FROM values"
