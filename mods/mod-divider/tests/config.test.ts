import { describe, expect, test } from 'claude-code/testing'

import { checkChar, cellWidth, DEFAULT_CONFIG, dividerText, loadConfig, runCommand } from '../hooks/config'

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
  test('nothing stored gives on, a dash and the full width', () => {
    expect(loadConfig(undefined)).toEqual({ enabled: true, char: '-', length: null })
    expect(DEFAULT_CONFIG).toEqual({ enabled: true, char: '-', length: null })
  })

  test('keeps a valid config', () => {
    expect(loadConfig({ enabled: false, char: '🔥', length: 40 })).toEqual({ enabled: false, char: '🔥', length: 40 })
    expect(loadConfig({ enabled: true, char: ' ' })).toEqual({ enabled: true, char: ' ', length: null })
  })

  test('a config saved before length existed keeps its values', () => {
    expect(loadConfig({ enabled: false, char: '=' })).toEqual({ enabled: false, char: '=', length: null })
  })

  test('a hand-edited store cannot get a bad value drawn', () => {
    for (const saved of [null, 7, 'x', [], ['a'], {}, { char: 7 }, { enabled: 'no' }, { char: '\x1b[31m' }, { char: '--' }, { char: '' }]) {
      expect(loadConfig(saved)).toEqual(DEFAULT_CONFIG)
    }
    expect(loadConfig({ enabled: false, char: '\n' })).toEqual({ enabled: false, char: '-', length: null })
    for (const length of [0, -1, 1.5, 1001, '40', null, true, {}, Number.MAX_SAFE_INTEGER]) {
      expect(loadConfig({ length }).length).toBeNull()
    }
  })
})

describe('cellWidth', () => {
  const cases: [string, number][] = [
    ['-', 1],
    [' ', 1],
    ['é', 1],
    ['─', 1],
    ['©', 1],
    ['語', 2],
    ['한', 2],
    ['Ａ', 2],
    ['🔥', 2],
    ['❤️', 2],
    ['👍🏽', 2],
    ['🇺🇸', 2],
    ['👨‍👩‍👧', 2],
  ]
  for (const [char, cells] of cases) {
    test(`${char} takes ${cells}`, () => {
      expect(cellWidth(char)).toBe(cells)
    })
  }
})

describe('dividerText', () => {
  const config = (length: number | null, char = '-') => ({ enabled: true, char, length })

  test('no length keeps the line far wider than any panel, for the Text to cut', () => {
    expect(dividerText(config(null), 80)).toBe('-'.repeat(1000))
    expect(dividerText(config(null, '🔥'), 80)).toBe('🔥'.repeat(1000))
  })

  test('a blank line at full width is exactly the panel wide, so no ellipsis shows', () => {
    expect(dividerText(config(null, ' '), 80)).toBe(' '.repeat(80))
  })

  test('a length under the panel draws that many columns', () => {
    expect(dividerText(config(1), 80)).toBe('-')
    expect(dividerText(config(40), 80)).toBe('-'.repeat(40))
    expect(dividerText(config(79), 80)).toBe('-'.repeat(79))
  })

  test('a wide character rounds down, so an odd length never overshoots', () => {
    expect(dividerText(config(10, '🔥'), 80)).toBe('🔥'.repeat(5))
    expect(dividerText(config(9, '🔥'), 80)).toBe('🔥'.repeat(4))
  })

  test('a length too short for a wide character still draws one', () => {
    expect(dividerText(config(1, '🔥'), 80)).toBe('🔥')
  })

  test('a panel narrower than the saved length gets a line that stops at its edge', () => {
    expect(dividerText(config(60), 40)).toBe('-'.repeat(1000))
    expect(dividerText(config(60), 60)).toBe('-'.repeat(1000))
    expect(dividerText(config(60, ' '), 40)).toBe(' '.repeat(40))
  })
})

describe('runCommand', () => {
  const on = { enabled: true, char: '-', length: null }
  const off = { enabled: false, char: '🔥', length: null }

  test('on and off change only the switch', () => {
    expect(runCommand(off, 'on').config).toEqual({ enabled: true, char: '🔥', length: null })
    expect(runCommand(on, 'off').config).toEqual({ enabled: false, char: '-', length: null })
  })

  test('length sets columns under the panel, at the boundary included', () => {
    expect(runCommand(on, 'length 1', 80).config?.length).toBe(1)
    expect(runCommand(on, 'length 40', 80).config?.length).toBe(40)
    const top = runCommand(on, 'length 79', 80)
    expect(top.config?.length).toBe(79)
    expect(top.text).not.toContain('shortened')
  })

  test('length at or over the panel is clamped to one under it, with a note', () => {
    for (const args of ['length 80', 'length 81', 'length 99999', `length ${'9'.repeat(400)}`]) {
      const result = runCommand(on, args, 80)
      expect(result.config?.length).toBe(79)
      expect(result.text).toContain('shortened')
    }
  })

  test('with no panel width known, length is only held to the ceiling', () => {
    expect(runCommand(on, 'length 500').config?.length).toBe(500)
    expect(runCommand(on, 'length 99999').config?.length).toBe(1000)
  })

  test('a panel too narrow to fit a shorter line still gets a usable length', () => {
    expect(runCommand(on, 'length 5', 1).config?.length).toBe(1)
  })

  test('length full goes back to the default', () => {
    expect(runCommand({ ...on, length: 40 }, 'length full', 80).config).toEqual(on)
  })

  test('length keeps the other settings', () => {
    expect(runCommand(off, 'length 40', 80).config).toEqual({ enabled: false, char: '🔥', length: 40 })
    expect(runCommand({ ...on, length: 40 }, 'set =', 80).config).toEqual({ enabled: true, char: '=', length: 40 })
  })

  test('a length that is not a positive whole number changes nothing and says why', () => {
    for (const args of ['length', 'length ', 'length 0', 'length 00', 'length 010', 'length -5', 'length +5', 'length 1.5', 'length 1e3', 'length abc', 'length 5 5', 'length Infinity', 'length ٥', 'length FULL', 'length \x1b[31m']) {
      const result = runCommand({ ...on, length: 40 }, args, 80)
      expect(result.config).toBeUndefined()
      expect(result.text).toContain('Nothing changed.')
      expect(result.text).not.toContain('\x1b')
    }
  })

  test('no arguments reports the length', () => {
    expect(runCommand(on, '').text).toContain('length: full')
    expect(runCommand({ ...on, length: 40 }, '').text).toContain('length: 40')
  })

  test('no arguments reports the state and changes nothing', () => {
    expect(runCommand(on, '').config).toBeUndefined()
    expect(runCommand(on, '  ').text).toContain('on, character: -')
    expect(runCommand(off, '').text).toContain('off, character: 🔥')
    expect(runCommand({ enabled: true, char: ' ', length: null }, '').text).toContain('character: space')
  })

  test('set changes only the character, on or off', () => {
    expect(runCommand(on, 'set 🔥').config).toEqual({ enabled: true, char: '🔥', length: null })
    const result = runCommand(off, 'set =')
    expect(result.config).toEqual({ enabled: false, char: '=', length: null })
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
