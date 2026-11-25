# Render slots on Claude Desktop

Verified by hand on Claude Code 2.1.309 to 2.1.317, Claude Desktop on Windows with WSL. The terminal draws more than this; Desktop is the floor a mod must clear.

| Slot | Desktop draws it | Pressable | Gotcha |
|---|---|---|---|
| `SessionMode` (prompt footer, left of the model and permission-mode buttons) | yes | `Button` with text children | Draws no images: an `Svg` comes out as an empty frame. Use a glyph. The engine's own labels (`focus`, `memory paused`) come from `e.props.modes`; render them after yours. |
| Model picker ("Opus 5.5 High"), permission-mode picker ("Auto") | no slot | – | The app's own buttons, right of `SessionMode`. No mod can restyle or replace them: a probe mod's `SessionMode` output drew left of them, and the window's accessibility tree lists them as separate app buttons (checked 2026-11-23). |
| `AbovePrompt` (band above the prompt) | yes | `Button` | The hook must `const below = await next(e)` and render `{below}`, or every other mod's band disappears. |
| `PromptHint` | no | – | Validates and tests, never drawn. |
| `Pane` (`$.ui.open`) | yes, right-hand panel | `Button`, `Link` | `$.ui.panes()` lists open panes; toggle with `$.ui.close`. |
| `$.ui.status(text)` | yes, footer beside the model name | no | Display only. The text persists across reloads until `$.ui.status(undefined)`. |
| Left sidebar | no slot | – | Nothing can be placed below Customize. |

## Elements

- `Svg` is a leaf with no `onPress`. `Button` refuses `Svg` children. A `Button` laid over an `Svg` takes the click but draws its chrome over the icon.
- `Markdown` image links draw the alt text, not the image, and `onLinkPress` never fires on Desktop.
- A `Button` label with escapes is a JS expression, `label={' '}`; a quoted JSX attribute keeps the backslashes literal.

## Validator

- `$` may only be passed to functions declared at the top level of the module.
- One plain hook per event per module; a second `on('process.run')` is refused.
