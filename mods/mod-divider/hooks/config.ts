import type { Config } from '../types'

export const DEFAULT_CONFIG: Config = { enabled: true, char: '-' }

// Checked before anything else looks at the input. The longest emoji sequences fit well inside it.
const MAX_LENGTH = 32

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

// An allowlist, so control, format, separator, private-use and unassigned code points and lone marks are out by not
// being listed. U+2800 is a symbol that draws blank, and the only blank this mod allows is the space.
// Built from strings because the types' TypeScript target rejects a literal with the v flag, which the engine runs.
const TEXT = new RegExp(String.raw`^[[\p{L}\p{N}\p{P}\p{S}]--[\p{Default_Ignorable_Code_Point}\u2800]][\p{M}--\p{Default_Ignorable_Code_Point}]{0,3}$`, 'v')
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
  const { enabled, char } = (saved ?? {}) as Partial<Record<keyof Config, unknown>>
  const check = typeof char === 'string' ? checkChar(char) : undefined
  return {
    enabled: typeof enabled === 'boolean' ? enabled : DEFAULT_CONFIG.enabled,
    char: check?.ok ? check.char : DEFAULT_CONFIG.char,
  }
}

const USAGE = 'Usage: /mod-divider on | off | set <character>'
const shown = (char: string) => (char === ' ' ? 'space' : char)

/** Answers one /mod-divider call. `config` is there only when the call changes the configuration. */
export function runCommand(current: Config, args: string): { config?: Config; text: string } {
  const command = args.trim()
  if (command === '') return { text: `mod-divider is ${current.enabled ? 'on' : 'off'}, character: ${shown(current.char)}. ${USAGE}` }
  if (command === 'on' || command === 'off') {
    return { config: { ...current, enabled: command === 'on' }, text: `mod-divider is ${command}.` }
  }
  if (command !== 'set' && !command.startsWith('set ')) return { text: USAGE }

  // Only the one space after `set` is a separator: a further space is the character itself.
  const value = args.trimStart().slice('set '.length)
  const check = checkChar(value === 'space' ? ' ' : value)
  if (!check.ok) return { text: `${check.reason} Nothing changed.` }
  const note = current.enabled ? '' : ' mod-divider is off, so it shows after /mod-divider on.'
  return { config: { ...current, char: check.char }, text: `mod-divider character: ${shown(check.char)}.${note}` }
}
