#!/usr/bin/env bash
# Validate, test, and type-check every mod. tsc runs only where the engine has written .claude-plugin/types/.
set -uo pipefail
cd "$(dirname "$0")/.."
rc=0
for mod in mods/*/; do
  echo "== $mod"
  # Skipped until it works on Claude Code 2.1.323+: https://github.com/z0rd0n88/claude-mod-ity/issues/10
  if [ "$mod" = "mods/mod-divider/" ]; then echo "skipped: see issue #10"; continue; fi
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
