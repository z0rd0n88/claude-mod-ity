import { describe, expect, test } from 'claude-code/testing'

import { checkChar, cellWidth, DEFAULT_CONFIG, dividerText, loadConfig, runCommand as runAt } from '../hooks/config'
import type { Align, Config } from '../types'

// Most cases here do not depend on the panel's width.
const runCommand = (current: Config, args: string, panel = 80) => runAt(current, args, panel)

const ACCEPTED: [string, string][] = [
  ['dash', '-'],
  ['the only blank allowed', ' '],
  ['letter', 'x'],
  ['accented letter, composed', 'é'],
  ['non-Latin letter', '語'],
  ['letter with a vowel mark', '\u{0915}\u{093f}'],
  ['letter with the most marks allowed', 'x\u{0301}\u{0302}\u{0303}'],
  ['box drawing', '─'],
  ['emoji', '🔥'],
  ['emoji with a variation selector', '❤️'],
  ['skin tone', '👍🏽'],
  ['flag', '🇺🇸'],
  ['flag from tag characters', '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}'],
  ['keycap', '1️⃣'],
  ['ZWJ family', '👨‍👩‍👧'],
  ['kiss with two skin tones, 15 UTF-16 units', '\u{1f469}\u{1f3fd}\u{200d}\u{2764}\u{fe0f}\u{200d}\u{1f48b}\u{200d}\u{1f468}\u{1f3fd}'],
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
  ['half fill space, a symbol that draws blank', '\u{303f}'],
  ['object replacement, a placeholder with no symbol of its own', '\u{fffc}'],
  ['null notehead, a symbol that draws blank', '\u{1d159}'],
  ['letter plus a hidden variation selector', 'x\u{e0100}'],
  ['conjoining vowel on its own', '\u{1161}'],
  ['conjoining final on its own', '\u{11a8}'],
  ['extended conjoining vowel on its own', '\u{d7b0}'],
  ['letter plus an invisible filler mark', 'x\u{16fe4}'],
  ['lone tag character', '\u{e0067}'],
  ['private use', '\ue000'],
  ['unassigned', '\u{10ffff}'],
  ['lone surrogate', '\ud83d'],
  ['stacked marks', 'x\u0301\u0302\u0303\u0304'],
  ['letter plus a mark that does not join it', 'a\u{102b}'],
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

  test('the length cap refuses over 32 units before the character rules look', () => {
    expect(runCommand(DEFAULT_CONFIG, `set x${'\u{0301}'.repeat(32)}`, 80).text).toContain('exactly one')
  })

  test('stores one spelling of a character typed in decomposed form', () => {
    expect(checkChar('e\u0301')).toEqual({ ok: true, char: 'é' })
  })

  test('jamo that make a syllable compose into it and are kept', () => {
    expect(checkChar('\u{1112}\u{1161}\u{11ab}')).toEqual({ ok: true, char: '한' })
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
    expect(loadConfig(undefined)).toEqual({ enabled: true, char: '-', length: null, align: 'center' })
    expect(DEFAULT_CONFIG).toEqual({ enabled: true, char: '-', length: null, align: 'center' })
  })

  test('keeps a valid config', () => {
    expect(loadConfig({ enabled: false, char: '🔥', length: 40, align: 'center' })).toEqual({ enabled: false, char: '🔥', length: 40, align: 'center' })
    expect(loadConfig({ enabled: true, char: ' ' })).toEqual({ enabled: true, char: ' ', length: null, align: 'center' })
  })

  test('a config saved before length existed keeps its values', () => {
    expect(loadConfig({ enabled: false, char: '=' })).toEqual({ enabled: false, char: '=', length: null, align: 'center' })
  })

  test('replaces bad values with their defaults', () => {
    for (const saved of [null, 7, 'x', [], ['a'], {}, { char: 7 }, { enabled: 'no' }, { char: '\x1b[31m' }, { char: '--' }, { char: '' }]) {
      expect(loadConfig(saved)).toEqual(DEFAULT_CONFIG)
    }
    expect(loadConfig({ enabled: false, char: '\n' })).toEqual({ enabled: false, char: '-', length: null, align: 'center' })
    for (const length of [0, -1, 1.5, 1001, '40', null, true, {}, Number.MAX_SAFE_INTEGER]) {
      expect(loadConfig({ length }).length).toBeNull()
    }
    for (const align of ['middle', 'LEFT', '', 1, null, true, {}, ['left'], 'toString', '__proto__']) {
      expect(loadConfig({ align }).align).toBe('center')
    }
  })

  test('keeps a length at either end of the range, and one spelling of a character', () => {
    expect(loadConfig({ length: 1 }).length).toBe(1)
    expect(loadConfig({ length: 1000 }).length).toBe(1000)
    expect(loadConfig({ char: 'e\u{0301}' }).char).toBe('\u{e9}')
  })

  test('a config saved before alignment existed starts centered', () => {
    expect(loadConfig({ enabled: true, char: '=', length: 20 })).toEqual({ enabled: true, char: '=', length: 20, align: 'center' })
  })

  test('keeps a saved alignment', () => {
    for (const align of ['left', 'center', 'right']) {
      expect(loadConfig({ align }).align).toBe(align)
    }
  })
})

describe('cellWidth', () => {
  const cases: [string, number][] = [
    ['-', 1],
    [' ', 1],
    ['\u{3248}', 1],
    ['\u{1f1fa}', 1],
    ['é', 1],
    ['─', 1],
    ['©', 1],
    ['語', 2],
    ['\u{fe10}', 2],
    ['\u{16fe0}', 2],
    ['\u{1b000}', 2],
    ['\u{1f200}', 2],
    ['한', 2],
    ['Ａ', 2],
    ['🔥', 2],
    ['❤️', 2],
    ['👍🏽', 2],
    ['🇺🇸', 2],
    ['👨‍👩‍👧', 2],
    ['\u{20000}', 2],
    ['\u{1100}', 2],
  ]
  for (const [char, cells] of cases) {
    test(`${char} takes ${cells}`, () => {
      expect(cellWidth(char)).toBe(cells)
    })
  }
})

describe('dividerText', () => {
  const config = (length: number | null, char = '-', align: Align = 'left') => ({ enabled: true, char, length, align })

  test('left starts at the edge, right ends at the other, center splits what is spare', () => {
    expect(dividerText(config(40, '-', 'left'), 80)).toBe('-'.repeat(40))
    expect(dividerText(config(40, '-', 'center'), 80)).toBe(' '.repeat(20) + '-'.repeat(40))
    expect(dividerText(config(40, '-', 'right'), 80)).toBe(' '.repeat(40) + '-'.repeat(40))
  })

  test('center puts an odd spare column on the right', () => {
    expect(dividerText(config(39, '-', 'center'), 80)).toBe(' '.repeat(20) + '-'.repeat(39))
  })

  test('alignment counts the columns a wide character takes', () => {
    expect(dividerText(config(10, '🔥', 'right'), 80)).toBe(' '.repeat(70) + '🔥'.repeat(5))
    expect(dividerText(config(10, '🔥', 'center'), 80)).toBe(' '.repeat(35) + '🔥'.repeat(5))
  })

  test('one spare column still aligns', () => {
    expect(dividerText(config(79, '-', 'right'), 80)).toBe(' ' + '-'.repeat(79))
    expect(dividerText(config(79, '-', 'center'), 80)).toBe('-'.repeat(79))
    expect(dividerText(config(84, '🔥', 'right'), 85)).toBe(' ' + '🔥'.repeat(42))
  })

  test('a line with no spare columns gets no alignment', () => {
    for (const align of ['left', 'center', 'right'] as const) {
      expect(dividerText(config(null, '-', align), 80)).toBe('-'.repeat(1000))
      expect(dividerText(config(null, '🔥', align), 85)).toBe('🔥'.repeat(1000))
      expect(dividerText(config(null, ' ', align), 80)).toBe(' '.repeat(80))
      expect(dividerText(config(80, '-', align), 80)).toBe('-'.repeat(1000))
      expect(dividerText(config(200, '-', align), 80)).toBe('-'.repeat(1000))
    }
  })

  test('no length under any panel overflows it, whatever the character and alignment', () => {
    for (const char of ['-', '🔥', '語']) {
      for (const align of ['left', 'center', 'right'] as const) {
        for (let panel = 2; panel <= 120; panel++) {
          for (let length = 1; length < panel; length++) {
            const text = dividerText(config(length, char, align), panel)
            const indent = text.length - text.trimStart().length
            const drawn = [...text.trimStart()].length * cellWidth(char)
            if (indent + drawn > panel) throw new Error(`${char} ${align} length ${length} overflows panel ${panel}`)
          }
        }
      }
    }
  })

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

  test('a panel at or under the saved length gets the long line for the Text to cut, or a blank line its width', () => {
    expect(dividerText(config(60), 40)).toBe('-'.repeat(1000))
    expect(dividerText(config(60), 60)).toBe('-'.repeat(1000))
    expect(dividerText(config(60, ' '), 40)).toBe(' '.repeat(40))
  })
})

describe('runCommand', () => {
  const on: Config = { enabled: true, char: '-', length: null, align: 'center' }
  const off: Config = { enabled: false, char: '🔥', length: null, align: 'center' }

  test('on and off change only the switch', () => {
    expect(runCommand(off, 'on').config).toEqual({ enabled: true, char: '🔥', length: null, align: 'center' })
    expect(runCommand(on, 'off').config).toEqual({ enabled: false, char: '-', length: null, align: 'center' })
  })

  test('on, off and length full say exactly what they did', () => {
    expect(runCommand(on, 'on', 80).text).toBe('mod-divider is on.')
    expect(runCommand(on, 'off', 80).text).toBe('mod-divider is off.')
    expect(runCommand(on, 'length full', 80).text).toBe('mod-divider length: full.')
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

  test('a panel wider than the ceiling still holds length to what a reload keeps', () => {
    const result = runCommand(on, 'length 1500', 2000)
    expect(result.config?.length).toBe(1000)
    expect(result.text).toContain('shortened')
    expect(loadConfig(result.config).length).toBe(1000)
  })

  test('a panel too narrow to fit a shorter line still gets a usable length', () => {
    expect(runCommand(on, 'length 5', 1).config?.length).toBe(1)
  })

  test('length full goes back to the default', () => {
    expect(runCommand({ ...on, length: 40, align: 'center' }, 'length full', 80).config).toEqual(on)
  })

  test('length keeps the other settings', () => {
    expect(runCommand(off, 'length 40', 80).config).toEqual({ enabled: false, char: '🔥', length: 40, align: 'center' })
    expect(runCommand({ ...on, length: 40, align: 'center' }, 'set =', 80).config).toEqual({ enabled: true, char: '=', length: 40, align: 'center' })
  })

  test('a length that is not a positive whole number changes nothing and says why', () => {
    for (const args of ['length', 'length ', 'length 0', 'length 00', 'length 010', 'length -5', 'length +5', 'length 1.5', 'length 1e3', 'length abc', 'length 5 5', 'length Infinity', 'length ٥', 'length FULL', 'length \x1b[31m']) {
      const result = runCommand({ ...on, length: 40, align: 'center' }, args, 80)
      expect(result.config).toBeUndefined()
      expect(result.text).toContain('Nothing changed.')
      expect(result.text).not.toContain('\x1b')
    }
  })

  test('no arguments reports the length and the alignment', () => {
    expect(runCommand(on, '').text).toContain('length: full')
    expect(runCommand({ ...on, length: 40, align: 'center' }, '').text).toContain('length: 40')
    expect(runCommand(on, '').text).toContain('align: center')
    expect(runCommand({ ...on, align: 'right' }, '').text).toContain('align: right')
  })

  test('align changes only the alignment', () => {
    for (const align of ['left', 'center', 'right'] as const) {
      expect(runCommand({ ...off, length: 40 }, `align ${align}`).config).toEqual({ enabled: false, char: '🔥', length: 40, align })
    }
  })

  test('other commands keep the alignment', () => {
    const right: Config = { ...on, align: 'right' }
    expect(runCommand(right, 'off').config?.align).toBe('right')
    expect(runCommand(right, 'set =').config?.align).toBe('right')
    expect(runCommand(right, 'length 40', 80).config?.align).toBe('right')
    expect(runCommand(right, 'length full', 80).config?.align).toBe('right')
  })

  test('extra spaces around a command are ignored', () => {
    expect(runCommand(on, 'length  5', 80).config?.length).toBe(5)
    expect(runCommand(on, 'align  left', 80).config?.align).toBe('left')
    expect(runCommand(on, '  set =', 80).config?.char).toBe('=')
  })

  test('an alignment that is not left, center or right changes nothing and does not repeat the input', () => {
    for (const args of ['align', 'align ', 'align middle', 'align LEFT', 'align Center', 'align left right', 'align 1', 'align \x1b[31m', 'align \u202e']) {
      const result = runCommand(on, args)
      expect(result.config).toBeUndefined()
      expect(result.text).toContain('Use left, center or right. Nothing changed.')
      expect(result.text).not.toContain('\x1b')
      expect(result.text).not.toContain('\u202e')
    }
  })

  test('the usage names every subcommand and value', () => {
    const { text } = runCommand(on, 'toggle', 80)
    for (const word of ['on', 'off', 'set', 'length', 'full', 'align', 'left', 'center', 'right']) {
      expect(text).toContain(word)
    }
  })

  test('no arguments reports the state and changes nothing', () => {
    expect(runCommand(on, '').config).toBeUndefined()
    expect(runCommand(on, '  ').text).toContain('on, character: -')
    expect(runCommand(off, '').text).toContain('off, character: 🔥')
    expect(runCommand({ enabled: true, char: ' ', length: null, align: 'center' }, '').text).toContain('character: space')
  })

  test('set changes only the character, on or off', () => {
    expect(runCommand(on, 'set 🔥').config).toEqual({ enabled: true, char: '🔥', length: null, align: 'center' })
    const result = runCommand(off, 'set =')
    expect(result.config).toEqual({ enabled: false, char: '=', length: null, align: 'center' })
    expect(result.text).toContain('/mod-divider on')
  })

  test('set saves one spelling of a character and names a blank as space', () => {
    expect(runCommand(on, 'set e\u{0301}', 80).config?.char).toBe('\u{e9}')
    expect(runCommand(on, 'set space', 80).text).toContain('character: space')
  })

  test('a blank line is set by the word space, or by a literal space if the prompt keeps it', () => {
    expect(runCommand(on, 'set space').config?.char).toBe(' ')
    expect(runCommand(on, 'set  ').config?.char).toBe(' ')
  })

  test('each rejection gives its own reason', () => {
    expect(runCommand(on, 'set --', 80).text).toContain('exactly one')
    expect(runCommand(on, 'set \x1b', 80).text).toContain('not allowed')
    expect(runCommand(on, 'length abc', 80).text).toContain('whole number')
  })

  test('input that is not one allowed character changes nothing and says why', () => {
    for (const args of ['set', 'set ', 'set --', 'set hello world', 'set \x1b[31m', 'set \n', 'set \u202e', 'set   ']) {
      const result = runCommand(on, args)
      expect(result.config).toBeUndefined()
      expect(result.text).toContain('Nothing changed.')
    }
  })

  test('a word only starting like length or align gets the usage and changes nothing', () => {
    for (const args of ['lengthx10', 'alignxleft', 'length\t5', 'align\tleft']) {
      const result = runCommand(on, args, 80)
      expect(result.config).toBeUndefined()
      expect(result.text).toContain('Usage:')
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
