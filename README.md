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
| `/mod-divider` | Shows whether it is on and which character it uses |
| `/mod-divider on` | Draws the line. This is the default |
| `/mod-divider off` | Stops drawing the line |
| `/mod-divider set <character>` | Repeats that character. The default is `-` |
| `/mod-divider set space` | Draws a blank line |

Your settings persist across sessions and apply in every project. Another session that is already open picks up a change when it restarts, or the next time it runs `/mod-divider on`, `off` or `set`.

### Which characters work

Exactly one visible character, including emojis that are built from several code points: `-`, `=`, `─`, `é`, `語`, `🔥`, `👍🏽`, `🇺🇸`, `👨‍👩‍👧`.

Rejected, with a message and no change to your settings:

- More or less than one character, or over 32 UTF-16 units
- Control characters, newlines, tabs and every blank except the plain space
- Invisible characters and text-direction controls
- Lone combining marks, private-use characters and unassigned code points

An emoji newer than the Unicode version your Claude Code knows may be rejected too.

### Changes from band-divider

This mod was called `band-divider`. Its `pattern` setting, which allowed several characters, is gone, and `/mod-divider set` replaces it. Everyone starts at the default `-`.
