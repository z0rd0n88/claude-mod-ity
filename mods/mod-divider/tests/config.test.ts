import { describe, expect, test } from 'claude-code/testing'

import { checkChar, DEFAULT_CONFIG, loadConfig, runCommand } from '../hooks/config'

const ACCEPTED: [string, string][] = [
  ['dash', '-'],
  ['the only blank allowed', ' '],
  ['letter', 'x'],
  ['accented letter, composed', 'é'],
  ['non-Latin letter', '語'],
  ['box drawing', '─'],
  ['emoji', '🔥'],
  ['emoji with a variation selector', '❤️'],
  ['skin tone', '👍🏽'],
  ['flag', '🇺🇸'],
  ['flag from tag characters', '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}'],
  ['keycap', '1️⃣'],
  ['ZWJ family', '👨‍👩‍👧'],
]

const REJECTED: [string, string][] = [
  ['empty', ''],
  ['two characters', '--'],
  ['two emojis', '🔥🔥'],
  ['two spaces', '  '],
  ['character and space', '- '],
  ['escape', '\x1b'],
  ['escape sequence', '\x1b[31m'],
  ['newline', '\n'],
  ['carriage return and newline, one grapheme', '\r\n'],
  ['tab', '\t'],
  ['delete', '\x7f'],
  ['C1 control', '\x9b'],
  ['no-break space', '\u00a0'],
  ['em space', '\u2003'],
  ['ideographic space', '\u3000'],
  ['line separator', '\u2028'],
  ['zero-width space', '\u200b'],
  ['lone zero-width joiner', '\u200d'],
  ['soft hyphen', '\u00ad'],
  ['byte order mark', '\ufeff'],
  ['direction override', '\u202e'],
  ['direction isolate', '\u2066'],
  ['letter plus direction override', 'x\u202e'],
  ['letter plus zero-width joiner', 'x\u200d'],
  ['hangul filler, a letter that draws blank', '\u3164'],
  ['braille blank', '\u2800'],
  ['lone combining mark', '\u0301'],
  ['lone variation selector', '\ufe0f'],
  ['letter plus a hidden variation selector', 'x\u{e0100}'],
  ['lone tag character', '\u{e0067}'],
  ['private use', '\ue000'],
  ['unassigned', '\u{10ffff}'],
  ['lone surrogate', '\ud83d'],
  ['stacked marks', 'x\u0301\u0302\u0303\u0304'],
  ['over the length cap', 'x'.repeat(33)],
  ['very long', '-'.repeat(1_000_000)],
  ['ZWJ sequence that is no real emoji', 'x\u200d🔥'],
]

describe('checkChar', () => {
  for (const [name, input] of ACCEPTED) {
    test(`accepts ${name}`, () => {
      expect(checkChar(input)).toEqual({ ok: true, char: input })
    })
  }
  for (const [name, input] of REJECTED) {
    test(`rejects ${name}`, () => {
      expect(checkChar(input).ok).toBe(false)
    })
  }

  test('stores one spelling of a character typed in decomposed form', () => {
    expect(checkChar('e\u0301')).toEqual({ ok: true, char: 'é' })
  })

  test('a rejection never repeats the input', () => {
    for (const input of ['\x1b', '\x1b[31m', '\n', '\u202e', 'hello']) {
      const result = runCommand(DEFAULT_CONFIG, `set ${input}`)
      expect(result.text).not.toContain(input)
    }
  })
})

describe('loadConfig', () => {
  test('nothing stored gives on and a dash', () => {
    expect(loadConfig(undefined)).toEqual({ enabled: true, char: '-' })
    expect(DEFAULT_CONFIG).toEqual({ enabled: true, char: '-' })
  })

  test('keeps a valid config', () => {
    expect(loadConfig({ enabled: false, char: '🔥' })).toEqual({ enabled: false, char: '🔥' })
    expect(loadConfig({ enabled: true, char: ' ' })).toEqual({ enabled: true, char: ' ' })
  })

  test('a hand-edited store cannot get a bad value drawn', () => {
    for (const saved of [null, 7, 'x', [], {}, { char: 7 }, { enabled: 'no' }, { char: '\x1b[31m' }, { char: '--' }, { char: '' }]) {
      expect(loadConfig(saved)).toEqual({ enabled: true, char: '-' })
    }
    expect(loadConfig({ enabled: false, char: '\n' })).toEqual({ enabled: false, char: '-' })
  })
})

describe('runCommand', () => {
  const on = { enabled: true, char: '-' }
  const off = { enabled: false, char: '🔥' }

  test('on and off change only the switch', () => {
    expect(runCommand(off, 'on').config).toEqual({ enabled: true, char: '🔥' })
    expect(runCommand(on, 'off').config).toEqual({ enabled: false, char: '-' })
  })

  test('no arguments reports the state and changes nothing', () => {
    expect(runCommand(on, '').config).toBeUndefined()
    expect(runCommand(on, '  ').text).toContain('on, character: -')
    expect(runCommand(off, '').text).toContain('off, character: 🔥')
    expect(runCommand({ enabled: true, char: ' ' }, '').text).toContain('character: space')
  })

  test('set changes only the character, on or off', () => {
    expect(runCommand(on, 'set 🔥').config).toEqual({ enabled: true, char: '🔥' })
    const result = runCommand(off, 'set =')
    expect(result.config).toEqual({ enabled: false, char: '=' })
    expect(result.text).toContain('/mod-divider on')
  })

  test('a blank line is set by the word space, or by a literal space if the prompt keeps it', () => {
    expect(runCommand(on, 'set space').config?.char).toBe(' ')
    expect(runCommand(on, 'set  ').config?.char).toBe(' ')
  })

  test('input that is not one allowed character changes nothing and says why', () => {
    for (const args of ['set', 'set ', 'set --', 'set hello world', 'set \x1b[31m', 'set \n', 'set \u202e', 'set   ']) {
      const result = runCommand(on, args)
      expect(result.config).toBeUndefined()
      expect(result.text).toContain('Nothing changed.')
    }
  })

  test('anything else gets the usage and changes nothing', () => {
    for (const args of ['ON', 'toggle', 'setx', 'on off', 'set\t-']) {
      const result = runCommand(on, args)
      expect(result.config).toBeUndefined()
      expect(result.text).toContain('Usage:')
    }
  })
})
