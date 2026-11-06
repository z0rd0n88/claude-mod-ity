#!/usr/bin/env bash
# Validate, test, and type-check every mod. tsc runs only where the engine has written .claude-plugin/types/.
set -uo pipefail
cd "$(dirname "$0")/.."
rc=0
for mod in mods/*/; do
  echo "== $mod"
  claude plugin validate "$mod" || rc=1
  claude plugin test "$mod" || rc=1
  if [ -d "$mod/.claude-plugin/types" ]; then
    [ -f "$mod/tsconfig.json" ] || printf '{\n  "extends": "./.claude-plugin/types/tsconfig.json"\n}\n' > "$mod/tsconfig.json"
    npx -y -p typescript tsc -p "$mod" || rc=1
  else
    echo "tsc skipped: no .claude-plugin/types (load the mod in a session once)"
  fi
done
exit $rc
