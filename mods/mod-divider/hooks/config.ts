import type { Align, Config } from '../types'

export const DEFAULT_CONFIG: Config = { enabled: true, char: '-', length: null, align: 'center' }

const ALIGNS: readonly unknown[] = ['left', 'center', 'right'] satisfies Align[]

// Checked before anything else looks at the input. The longest emoji sequences fit well inside it.
const MAX_LENGTH = 32

// Far wider than any panel: the Text cuts it at the panel's edge, whatever the font's glyph width. Also the longest
// length kept.
const WIDE = 1000

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

// An allowlist, so control, format, separator, private-use and unassigned code points and lone marks are out by not
// being listed. U+2800, U+303F, U+FFFC and U+1D159 are symbols that may draw blank, and the only blank this mod allows
// is the space.
// Hangul conjoining vowels and finals and the filler mark U+16FE4 can take no column in a terminal, but the layout counts one.
// NFC has already composed the jamo that make a syllable.
// Built from strings because the types' TypeScript target rejects a literal with the v flag, which the engine runs.
const TEXT = new RegExp(String.raw`^[[\p{L}\p{N}\p{P}\p{S}]--[\p{Default_Ignorable_Code_Point}\u{303f}\u{fffc}\u{1d159}\u2800\u{1161}-\u{11ff}\u{d7b0}-\u{d7ff}]][\p{M}--[\p{Default_Ignorable_Code_Point}\u{16fe4}]]{0,3}$`, 'v')
const EMOJI = new RegExp(String.raw`^\p{RGI_Emoji}$`, 'v')

const ONE_CHARACTER = 'Use exactly one character, for example - or 🔥, or the word space for a blank line.'

export type CharCheck = { ok: true; char: string } | { ok: false; reason: string }

// The reasons never repeat the input: it could hold terminal escapes, and the transcript shows them.
export function checkChar(input: string): CharCheck {
  if (input.length > MAX_LENGTH) return { ok: false, reason: ONE_CHARACTER }
  const char = input.normalize('NFC')
  if ([...graphemes.segment(char)].length !== 1) return { ok: false, reason: ONE_CHARACTER }
  if (char === ' ' || TEXT.test(char) || EMOJI.test(char)) return { ok: true, char }
  return { ok: false, reason: 'That character is not allowed: it is invisible, a control character, or has no symbol of its own.' }
}

/** Reads what the store holds, which someone may have edited by hand. Anything unusable falls back to its default. */
export function loadConfig(saved: unknown): Config {
  // Only a plain object: a string or an array has a `length` of its own.
  const isRecord = typeof saved === 'object' && saved !== null && !Array.isArray(saved)
  const { enabled, char, length, align } = (isRecord ? saved : {}) as Partial<Record<keyof Config, unknown>>
  const check = typeof char === 'string' ? checkChar(char) : undefined
  return {
    enabled: typeof enabled === 'boolean' ? enabled : DEFAULT_CONFIG.enabled,
    char: check?.ok ? check.char : DEFAULT_CONFIG.char,
    length: Number.isInteger(length) && (length as number) >= 1 && (length as number) <= WIDE ? (length as number) : DEFAULT_CONFIG.length,
    align: ALIGNS.includes(align) ? (align as Align) : DEFAULT_CONFIG.align,
  }
}

// ponytail: the engine has no width helper, so this estimates: emoji and East Asian wide ranges take 2. A wrong guess
// only makes a line a little short or long, or lets the Text cut it at the edge with an ellipsis. A real table if that
// shows.
const WIDE_TEXT = /^(?![\u{3248}-\u{324f}\u{1f1e6}-\u{1f1ff}])[\p{Emoji_Presentation}\u1100-\u115f\u2e80-\u303e\u3041-\ua4cf\ua960-\ua97c\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe6f\uff01-\uff60\uffe0-\uffe6\u{fe10}-\u{fe19}\u{16fe0}-\u{18d08}\u{1aff0}-\u{1b2fb}\u{1f200}-\u{1f265}\u{20000}-\u{3fffd}]/u

/** Terminal columns one allowed character takes. */
export const cellWidth = (char: string) => (EMOJI.test(char) || WIDE_TEXT.test(char) ? 2 : 1)

/** The text of the divider in a panel `panel` columns wide. */
export function dividerText({ char, length, align }: Config, panel: number): string {
  if (length !== null && length < panel) {
    // A wide character always draws at least once: a length under the panel leaves it room, as the panel is 2 or more.
    const count = Math.max(1, Math.floor(length / cellWidth(char)))
    const spare = panel - count * cellWidth(char)
    const indent = align === 'right' ? spare : align === 'center' ? Math.floor(spare / 2) : 0
    return ' '.repeat(indent) + char.repeat(count)
  }
  // The line fills the panel, so there is nothing to align. A blank line has nothing to lose to a font's width, and cut
  // by the Text it would show an ellipsis.
  return char === ' ' ? ' '.repeat(panel) : char.repeat(WIDE)
}

const USAGE = 'Usage: /mod-divider on | off | set <character> | length <columns> | length full | align left | center | right'
const shown = (char: string) => (char === ' ' ? 'space' : char)

function runLength(current: Config, value: string, panel: number): { config?: Config; text: string } {
  if (value === 'full') return { config: { ...current, length: null }, text: 'mod-divider length: full.' }
  if (!/^[1-9]\d*$/.test(value)) return { text: 'Use a whole number of columns from 1 up, or full. Nothing changed.' }
  const limit = Math.max(1, Math.min(panel - 1, WIDE))
  const length = Math.min(Number(value), limit)
  const note = Number(value) > limit ? ', shortened to stay inside the panel' : ''
  return { config: { ...current, length }, text: `mod-divider length: ${length}${note}.` }
}

/**
 * Answers one /mod-divider call. `config` is there only when the call changes the configuration. `panel` is the panel's
 * width in columns.
 */
export function runCommand(current: Config, args: string, panel: number): { config?: Config; text: string } {
  const command = args.trim()
  if (command === '') {
    const state = `${current.enabled ? 'on' : 'off'}, character: ${shown(current.char)}, length: ${current.length ?? 'full'}, align: ${current.align}`
    return { text: `mod-divider is ${state}. ${USAGE}` }
  }
  if (command === 'on' || command === 'off') {
    return { config: { ...current, enabled: command === 'on' }, text: `mod-divider is ${command}.` }
  }
  if (command === 'length' || command.startsWith('length ')) return runLength(current, command.slice('length '.length).trim(), panel)
  if (command === 'align' || command.startsWith('align ')) {
    const align = command.slice('align '.length).trim()
    if (!ALIGNS.includes(align)) return { text: 'Use left, center or right. Nothing changed.' }
    return { config: { ...current, align: align as Align }, text: `mod-divider align: ${align}.` }
  }
  if (command !== 'set' && !command.startsWith('set ')) return { text: USAGE }

  // Only the one space after `set` is a separator: a further space is the character itself.
  const value = args.trimStart().slice('set '.length)
  const check = checkChar(value === 'space' ? ' ' : value)
  if (!check.ok) return { text: `${check.reason} Nothing changed.` }
  const note = current.enabled ? '' : ' mod-divider is off, so it shows after /mod-divider on.'
  return { config: { ...current, char: check.char }, text: `mod-divider character: ${shown(check.char)}.${note}` }
}
