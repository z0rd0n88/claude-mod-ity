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

Shows the GitHub issues assigned to you in a pane beside the chat, inside the terminal or Claude Desktop. A `𝔊ℌ` mark sits in the prompt footer, beside the model name on Desktop, and toggles the pane on click. `/github` toggles it too.

The pane lists your open issues, newest first, each a link to GitHub, with a Refresh button. Data comes from the GitHub CLI: `gh search issues --assignee @me --state open`. `gh` must be installed and logged in (`gh auth status`).

Install, at the Claude Code prompt:

```
/plugin install github-panel --marketplace z0rd0n88/claude-mod-ity
```

Or load it from a clone, in the `env` block of `~/.claude/settings.json`:

```json
"CLAUDE_CODE_PLUGIN_DIRS": "/path/to/claude-mod-ity/mods/github-panel"
```

The footer slot is the session-mode labels (`focus`, `memory paused`); the mod draws the mark first and keeps those labels after it. That slot draws no images on Desktop (an SVG comes out as an empty frame), so the mark is a glyph, not GitHub's favicon. Tracer bullet so far; planned: PRs tab, repo filter, search, opening an issue inside the pane.

## compact-courier

A `Compact` button in the prompt footer, beside the model name on Desktop. Clicking it has Haiku write a detailed summary of the session (your requests, decisions, files changed, commands and errors, current state and the next step), then sends `/compact <that summary>` as if you typed it. The mod answers that compaction with Haiku's summary itself, so your main model makes no call for it. The button is written in the same Fraktur letters as the GH mark, `ℭ𝔬𝔪𝔭𝔞𝔠𝔱`, and reads `ℭ𝔬𝔪𝔭𝔞𝔠𝔱𝔦𝔫𝔤…` while it works. A `/compact` you type yourself, and auto-compact, still use Claude Code's own summarizer.

Install, at the Claude Code prompt:

```
/plugin install compact-courier --marketplace z0rd0n88/claude-mod-ity
```

Or load it from a clone, in the `env` block of `~/.claude/settings.json`:

```json
"CLAUDE_CODE_PLUGIN_DIRS": "/path/to/claude-mod-ity/mods/compact-courier"
```

The command is queued like a typed one, so a click mid-turn compacts when the turn ends. Haiku reads the newest ~400,000 characters of the transcript (about 100k tokens); on a longer session the oldest part is left out of the summary. If Haiku returns nothing, no `/compact` is sent and a toast says why.

`github-panel` (0.1.1 and later) draws the same footer slot and passes it on with `next`, so both buttons draw in either load order (seen live in Desktop, 2026-11-20).

## fraktur-footer

Draws the prompt footer's mode labels (`focus`, `memory paused`) in the same Fraktur letters as the GH and Compact buttons: `𝔣𝔬𝔠𝔲𝔰`. The labels are rewritten before the engine draws them, so each shows once, in place. Digits and punctuation have no Fraktur form and stay as they are.

The model name and effort ("Opus 5.5 High") and the permission mode ("Auto") are not touched: they are the app's own buttons, and none of the engine's render slots reaches them. With no mode label on, the mod changes nothing you can see.

Install, at the Claude Code prompt:

```
/plugin install fraktur-footer --marketplace z0rd0n88/claude-mod-ity
```

Or load it from a clone, in the `env` block of `~/.claude/settings.json`:

```json
"CLAUDE_CODE_PLUGIN_DIRS": "/path/to/claude-mod-ity/mods/fraktur-footer"
```

It passes every footer render on with `next`, so `github-panel` and `compact-courier` still draw their buttons.

## Themes

A theme is a mod that sets how the Claude Desktop app looks, with `$.theme.set`: colors, a backdrop and the style of the conversation's rows. Themes live in `themes/`, apart from the mods in `mods/`, and install the same way. The terminal draws no theme.

Only one theme is active per session. Any mod's `$.theme.set` replaces the colors and backdrop an earlier call set, so load one theme mod at a time. Claude Code v2.1.324 or later is needed for colors, and v2.1.323 or later for the backdrop.

### erowid

A theme drawn after [erowid.org](https://erowid.org/psychoactives/psychoactives.shtml). The site has two faces and so does the theme: your Desktop app's mode picks one. Both share the maroon header.

| | Dark mode | Light mode |
|---|---|---|
| Taken from | the index pages | the vault pages |
| Page | black | gray-green `#e5e5e1` |
| Links and accents | periwinkle `#aaaaff` | navy `#110066` |
| Panels | `#111922` band, `#321929` header maroon | pale lavender-gray boxes |
| Text | `#ccccdd` | black |

What it copies from the site:

- Georgia-style serif for headings, in the gold of the site's section titles; bold sans-serif body text.
- Square boxes with a 2px border around your messages, and a flat bordered row for tool calls in the sage green of the site's link lists (`#88a171`). No rounded corners.
- The header as a vector backdrop: the textured strip, the sun, "The Vaults of Erowid", the row of maroon menu tabs, and three small medallions where the site has its header photos. It is anchored to the top left, so a narrow pane still shows the sun, the name and the first tabs. The app's own panels are see-through, with no blur, so the header shows behind its bars.
- Art in the margins: four mandalas at the far left and right, as on the Mind & Spirit pages. They are faint, and they show only when the window is wider than about 1100px, so they never sit under the text in a narrow pane.

Erowid's logo and art are images, which a backdrop can't hold, so the sun, the mandalas and the tabs are redrawn as shapes, and the tabs are not clickable.

Install, at the Claude Code prompt:

```
/plugin install erowid --marketplace z0rd0n88/claude-mod-ity
```

Or load it from a clone, in the `env` block of `~/.claude/settings.json`:

```json
"CLAUDE_CODE_PLUGIN_DIRS": "/path/to/claude-mod-ity/themes/erowid"
```

Start a new session in the Desktop app's Code tab. The mod sets the theme again at every session start. To take it off, disable the plugin, or in **Settings**, search `code appearance` and select **Remove colors**.

Checked with `claude plugin validate` and `claude plugin test` on Claude Code 2.1.326. A Claude Code build that doesn't take a message `style` still gets the colors and backdrop; the type and box styles need a build that does. Not yet looked at in the Desktop app: colors and spacing are taken from the site's own CSS, so judge the result there. Some of the design system's softer contrast lines fall under its own bar (borders on the black page), and Desktop still paints the theme.
