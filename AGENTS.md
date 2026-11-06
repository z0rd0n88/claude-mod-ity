# AGENTS.md

Every mod must work in Claude Desktop on Windows via WSL, not only in a terminal session. Desktop draws fewer render slots than the terminal; what each slot does there is in [`docs/desktop-slots.md`](docs/desktop-slots.md). Read it before placing anything in the UI.

Develop from the worktree: point `CLAUDE_CODE_PLUGIN_DIRS` in `~/.claude/settings.json` at `<worktree>/mods/<mod>` and start a session. The engine writes `.claude-plugin/types/` there (gitignored), which `tsc` needs. A copy under `~/.claude/dev-mods/` drifts from the repo; edit the worktree only.

Before a PR run `scripts/check.sh`: validate, test, and tsc for every mod. CI runs the same script.
