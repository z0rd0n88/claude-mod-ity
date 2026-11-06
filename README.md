# claude-mod-ity

Claude Code mods. They are commodities. Tested with Claude Code 2.1.316.

## mod-divider

Draws one dim line across the panel between the bands other mods show above the prompt, repeating a character you choose. With fewer than two mods showing there is nothing to divide, so it draws nothing.

Install, at the Claude Code prompt:

```
/plugin install mod-divider --marketplace z0rd0n88/claude-mod-ity
```

**It has to load before the mods it divides.** Mods wrap each other in load order, and this one only sees the mods that load after it. A link in `~/.claude/skills` loads last, so `/mod-divider` responds but no line appears. A `/plugin install` has not been tested and may have the same problem if your other mods come first.

To load it first, clone this repo and name the mod's folder in the `env` block of `~/.claude/settings.json`, separating several folders with `:`:

```json
"CLAUDE_CODE_PLUGIN_DIRS": "/path/to/claude-mod-ity/mods/mod-divider"
```

Start a new session afterwards. A value set in `settings.json` takes priority over the same variable set in your shell.

| Command | What it does |
|---|---|
| `/mod-divider` | Shows the current settings |
| `/mod-divider on` | Draws the line. This is the default |
| `/mod-divider off` | Stops drawing the line |
| `/mod-divider set <character>` | Repeats that character. The default is `-` |
| `/mod-divider set space` | Draws a blank line |
| `/mod-divider length <columns>` | Draws that many terminal columns instead of filling the panel |
| `/mod-divider length full` | Fills the panel again. This is the default |
| `/mod-divider align left`, `center` or `right` | Moves a shorter line within the panel. The default is `center` |

Your settings persist across sessions and apply in every project. Another session that is already open picks up a change when it restarts, or the next time it runs `/mod-divider` with no arguments or changes a setting.

### Length

A length is in terminal columns and must be under the panel's width. Most emojis take 2 columns, so `length 10` draws 5 🔥, and an odd length rounds down. The exception is `length 1` with a 2-column character, which still draws one.

- A value at or past the panel's width is shortened to one column under it, with a note. Before the first draw, or just after a reload, the panel's width is not known, so the length is checked against an estimate from the terminal's width, and the line may still be shortened at draw time.
- Zero, negative numbers, decimals and anything else that is not a whole number are rejected, with a message and no change to your settings.
- If the panel gets as narrow as your length or narrower, the line stops at the panel's edge and ends in `…`, as the full-width line does. A blank line just fills the panel. Your length comes back when the panel widens.

Character widths are estimated, as Claude Code has no helper for them. A wrong guess makes the line longer or shorter than you asked and can misplace `center` and `right`. If it reaches the panel's edge it is cut there with `…`, and it never draws past the edge.

### Alignment

Alignment moves only the divider, not other mods. A line with no spare columns, such as the default full width, stays as it is whatever the alignment. Center puts an odd spare column on the right. Anything other than exactly `left`, `center` or `right` is rejected, with a message and no change to your settings.

### Which characters work

Exactly one visible character, including emojis that are built from several code points: `-`, `=`, `─`, `é`, `語`, `🔥`, `👍🏽`, `🇺🇸`, `👨‍👩‍👧`.

Rejected, with a message and no change to your settings:

- More or less than one character, or over 32 UTF-16 units
- Control characters, newlines, tabs and every blank except the plain space
- Invisible characters and text-direction controls
- Lone combining marks, Hangul conjoining vowels and finals on their own, private-use characters and unassigned code points

An emoji newer than the Unicode version your Claude Code knows may be rejected too.

### Changes from band-divider

This mod was called `band-divider`. Its `pattern` setting, which allowed several characters, is gone, and `/mod-divider set` replaces it. Everyone starts at the default `-`.

## github-panel

Shows the GitHub issues assigned to you in a pane beside the chat, inside the terminal or Claude Desktop. The GitHub mark sits in the prompt footer, beside the model name on Desktop, and toggles the pane on click. `/github` toggles it too.

The pane lists your open issues, newest first, each a link to GitHub, with a Refresh button. Data comes from the GitHub CLI: `gh search issues --assignee @me --state open`. `gh` must be installed and logged in (`gh auth status`).

Install, at the Claude Code prompt:

```
/plugin install github-panel --marketplace z0rd0n88/claude-mod-ity
```

Or load it from a clone, in the `env` block of `~/.claude/settings.json`:

```json
"CLAUDE_CODE_PLUGIN_DIRS": "/path/to/claude-mod-ity/mods/github-panel"
```

The footer slot is the session-mode labels (`focus`, `memory paused`); the mod draws the mark first and keeps those labels after it. Only a button takes a click, so the mark has a blank one-character button laid over it. Tracer bullet so far; planned: PRs tab, repo filter, search, opening an issue inside the pane.
