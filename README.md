# claude-mod-ity

Claude Code mods. They are commodities. Tested with Claude Code 2.1.316.

## mod-divider

Draws one dim line across the panel between the bands other mods show above the prompt, repeating a character you choose. With fewer than two mods showing there is nothing to divide, so it draws nothing.

Install, at the Claude Code prompt:

```
/plugin install mod-divider --marketplace z0rd0n88/claude-mod-ity
```

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

Your settings persist across sessions and apply in every project. Another session that is already open picks up a change when it restarts, or the next time it runs `/mod-divider`.

### Length

A length is in terminal columns and must be under the panel's width. Most emojis take 2 columns, so `length 10` draws 5 🔥, and an odd length rounds down. The exception is `length 1` with a 2-column character, which still draws one.

- A value at or past the panel's width is shortened to one column under it, with a note. Before the first draw, the length is checked against the terminal's width instead, so the line may still be shortened at draw time.
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
- Lone combining marks, Hangul vowel and final jamo on their own, private-use characters and unassigned code points

An emoji newer than the Unicode version your Claude Code knows may be rejected too.

### Changes from band-divider

This mod was called `band-divider`. Its `pattern` setting, which allowed several characters, is gone, and `/mod-divider set` replaces it. Everyone starts at the default `-`.
