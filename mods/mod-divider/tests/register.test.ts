import { describe, expect, test } from 'claude-code/testing'

const col = (...children: unknown[]) => ({ type: 'Box', props: { flexDirection: 'column' }, children })
const row = (text: string) => ({ type: 'Box', props: { flexDirection: 'row' }, children: [{ type: 'Text', props: {}, children: [text] }] })

// A band site's props, as the engine would hand them
const BAND = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

const COMMAND = { origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as const

/** Starts a session whose store holds `saved` and whose band holds two mods, for the divider to go between. */
async function start($: any, on: any, saved?: unknown) {
  const store = new Map<string, unknown>(saved === undefined ? [] : [['config', saved]])
  const seen = { registered: [] as any[], beneath: 0 }
  on('store.get', (_: any, e: any) => ({ value: store.get(e.key) }))
  on('store.set', (_: any, e: any) => {
    if (store.has('fail-saves')) throw new Error('disk full')
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('session.start', (_: any, e: any) => {
    seen.beneath++
    return { cwd: e.cwd }
  })
  on('command.register', (_: any, e: any) => {
    seen.registered.push(e)
    return { value: { command: e.name } }
  })
  on('ui.render', { component: 'AbovePrompt' }, () => col(row('first'), col(row('second'))))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  const run = async (args: string) => (await $.command.run({ command: 'mod-divider', args, ...COMMAND })).text as string
  return { store, run, seen }
}

const mount = ($: any, bodyColumns = 80) =>
  $.ui.mount({ plugin: 'mod-divider', surface: 'terminal', ...BAND, props: { ...BAND.props, bodyColumns } })

describe('mod-divider', () => {
  test('a session start registers the command once and lets hooks beneath run', async ($, on) => {
    const { seen } = await start($, on)
    expect(seen.registered.map((command) => command.name)).toEqual(['mod-divider'])
    expect(seen.registered[0].argumentHint).toContain('align')
    expect(seen.beneath).toBe(1)
  })

  test('set changes the character the line repeats and saves it', async ($, on) => {
    const { store, run } = await start($, on)
    const ui = await mount($)
    expect(await ui.find({ type: 'Text', text: /^-{1000}$/ })).toBeDefined()

    expect(await run('set 🔥')).toContain('🔥')

    expect(store.get('config')).toEqual({ enabled: true, char: '🔥', length: null, align: 'center' })
    expect(await ui.find({ type: 'Text', text: /^(🔥){1000}$/u })).toBeDefined()
  })

  test('off draws no line, on draws it again, and both are saved', async ($, on) => {
    const { store, run } = await start($, on)
    const ui = await mount($)

    expect(await run('off')).toContain('off')
    expect(store.get('config')).toEqual({ enabled: false, char: '-', length: null, align: 'center' })
    expect(await ui.find({ type: 'Text', text: /^-+$/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: 'first' })).toBeDefined()

    expect(await run('on')).toContain('on')
    expect(store.get('config')).toEqual({ enabled: true, char: '-', length: null, align: 'center' })
    expect(await ui.find({ type: 'Text', text: /^-+$/ })).toBeDefined()
  })

  test('a state failure after a save reports the save and when it applies', async ($, on) => {
    let denied = false
    on('state.set', (_: any, e: any, next: any) => (denied ? { deny: 'no' } : next(e)))
    const { store, run } = await start($, on)
    denied = true

    const text = await run('set =')

    expect(text).toContain('mod-divider character: =.')
    expect(text).toContain('next session')
    expect(text).not.toContain('nothing changed')
    expect(store.get('config')).toEqual({ enabled: true, char: '=', length: null, align: 'center' })
    expect(await run('')).not.toContain('next session')
  })

  test('a rejected character leaves the store and the line alone', async ($, on) => {
    const { store, run } = await start($, on, { enabled: true, char: '=' })
    const ui = await mount($)

    for (const args of ['set --', 'set \x1b[31m', 'set \n', 'set']) {
      expect(await run(args)).toContain('Nothing changed.')
      expect(store.get('config')).toEqual({ enabled: true, char: '=' })
    }
    expect(await ui.find({ type: 'Text', text: /^=+$/ })).toBeDefined()
  })

  test('a bare /mod-divider draws what it reports, after another session changed the store', async ($, on) => {
    const { store, run } = await start($, on)
    const ui = await mount($)
    store.set('config', { enabled: false, char: '-', length: null, align: 'center' })

    expect(await run('')).toContain('mod-divider is off')
    expect(await ui.find({ type: 'Text', text: /^-+$/ })).toBeUndefined()
  })

  test('a blank line draws spaces across the panel, with no ellipsis to show', async ($, on) => {
    const { store, run } = await start($, on)
    const ui = await mount($)

    await run('set space')

    expect(store.get('config')).toEqual({ enabled: true, char: ' ', length: null, align: 'center' })
    expect(await ui.find({ type: 'Text', text: /^ {80}$/ })).toBeDefined()
  })

  test('a saved config applies in a new session, and a bad one falls back to a dash', async ($, on) => {
    const saved = await start($, on, { enabled: true, char: '🔥' })
    const ui = await mount($)
    expect(await ui.find({ type: 'Text', text: /^(🔥)+$/u })).toBeDefined()
    await ui.unmount()

    saved.store.set('config', { enabled: true, char: '\x1b[31m' })
    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
    const again = await mount($)
    expect(await again.find({ type: 'Text', text: /^-+$/ })).toBeDefined()
  })

  test('a command checks what the store holds, so a hand edit after start is not saved back', async ($, on) => {
    const { store, run } = await start($, on)
    await mount($)
    store.set('config', { char: '\x1b[31m', length: -1, align: 'middle' })

    await run('length full')

    expect(store.get('config')).toEqual({ enabled: true, char: '-', length: null, align: 'center' })
  })

  test('a command starts from the store, so a change from another session survives', async ($, on) => {
    const { store, run } = await start($, on)
    store.set('config', { enabled: true, char: '=', length: 40, align: 'right' })

    await run('off')

    expect(store.get('config')).toEqual({ enabled: false, char: '=', length: 40, align: 'right' })
  })

  test('a store that cannot save changes nothing and says so', async ($, on) => {
    const { store, run } = await start($, on, { enabled: true, char: '=' })
    const ui = await mount($)
    store.set('fail-saves', true)

    expect(await run('set 🔥')).toContain('nothing changed')
    expect(await ui.find({ type: 'Text', text: /^=+$/ })).toBeDefined()
  })

  test('a store file that cannot be read still registers the command, and the command says so', async ($, on) => {
    const registered: string[] = []
    on('store.get', () => {
      throw new Error('malformed')
    })
    on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
    on('command.register', (_: any, e: any) => {
      registered.push(e.name)
      return { value: { command: e.name } }
    })
    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })

    expect(registered).toEqual(['mod-divider'])
    const { text } = await $.command.run({ command: 'mod-divider', args: 'off', ...COMMAND })
    expect(text).toContain('could not read or save')
  })

  test('a survey hides the line', async ($, on) => {
    await start($, on)
    const survey = await $.ui.mount({ plugin: 'mod-divider', surface: 'terminal', ...BAND, props: { ...BAND.props, hasSurvey: true } })
    expect(await survey.find({ type: 'Text', text: /^-+$/ })).toBeUndefined()
  })

  test('the line is dim and cut at the panel edge, not wrapped', async ($, on) => {
    await start($, on)
    const ui = await mount($)
    const line = await ui.find({ type: 'Text', text: /^-+$/ })
    expect(line?.props.wrap).toBe('truncate')
    expect(line?.props.dimColor).toBe(true)
  })
})

describe('mod-divider length', () => {
  test('a length under the panel draws that many columns and saves it', async ($, on) => {
    const { store, run } = await start($, on)
    const ui = await mount($)

    expect(await run('length 40')).toContain('40')

    expect(store.get('config')).toEqual({ enabled: true, char: '-', length: 40, align: 'center' })
    expect(await ui.find({ type: 'Text', text: /^ {20}-{40}$/ })).toBeDefined()
  })

  test('the longest length allowed is one under the panel', async ($, on) => {
    const { store, run } = await start($, on)
    const ui = await mount($)

    await run('length 79')

    expect(store.get('config')).toEqual({ enabled: true, char: '-', length: 79, align: 'center' })
    expect(await ui.find({ type: 'Text', text: /^-{79}$/ })).toBeDefined()
  })

  test('a length at or past the panel is clamped against the width last drawn, not the terminal', async ($, on) => {
    const { store, run } = await start($, on)
    const ui = await mount($)

    for (const args of ['length 80', 'length 5000']) {
      expect(await run(args)).toContain('shortened')
      expect(store.get('config')).toEqual({ enabled: true, char: '-', length: 79, align: 'center' })
    }
    expect(await ui.find({ type: 'Text', text: /^-{79}$/ })).toBeDefined()
  })

  test('before the first draw, the terminal less the mark stands in for the panel', async ($, on) => {
    const { store, run } = await start($, on)

    await run('length 5000')

    expect(store.get('config')).toEqual({ enabled: true, char: '-', length: 94, align: 'center' })
  })

  test('narrowing the panel falls back to the long line for the Text to cut, and keeps the setting', async ($, on) => {
    const { store, run } = await start($, on)
    const wide = await mount($)
    await run('length 60')
    await wide.unmount()

    const narrow = await mount($, 40)
    expect(await narrow.find({ type: 'Text', text: /^-{1000}$/ })).toBeDefined()
    expect(store.get('config')).toEqual({ enabled: true, char: '-', length: 60, align: 'center' })
    await narrow.unmount()

    const back = await mount($)
    expect(await back.find({ type: 'Text', text: /^ {10}-{60}$/ })).toBeDefined()
  })

  test('a length is clamped against the latest draw, not the first', async ($, on) => {
    const { store, run } = await start($, on)
    const wide = await mount($)
    await wide.unmount()
    await mount($, 40)

    await run('length 60')

    expect(store.get('config')).toEqual({ enabled: true, char: '-', length: 39, align: 'center' })
  })

  test('a draw while off still records the panel', async ($, on) => {
    const { store, run } = await start($, on, { enabled: false, char: '-' })
    await mount($, 40)

    await run('length 60')

    expect(store.get('config')).toEqual({ enabled: false, char: '-', length: 39, align: 'center' })
  })

  test('a rejected length leaves the store and the line alone', async ($, on) => {
    const { store, run } = await start($, on, { enabled: true, char: '-', length: 30, align: 'center' })
    const ui = await mount($)

    for (const args of ['length 0', 'length -5', 'length abc', 'length 1.5', 'length']) {
      expect(await run(args)).toContain('Nothing changed.')
      expect(store.get('config')).toEqual({ enabled: true, char: '-', length: 30, align: 'center' })
    }
    expect(await ui.find({ type: 'Text', text: /^ {25}-{30}$/ })).toBeDefined()
  })

  test('length full fills the panel again', async ($, on) => {
    const { store, run } = await start($, on, { enabled: true, char: '-', length: 30, align: 'center' })
    const ui = await mount($)

    await run('length full')

    expect(store.get('config')).toEqual({ enabled: true, char: '-', length: null, align: 'center' })
    expect(await ui.find({ type: 'Text', text: /^-{1000}$/ })).toBeDefined()
  })
})

describe('mod-divider align', () => {
  test('a short line starts centered', async ($, on) => {
    const { run } = await start($, on)
    const ui = await mount($)

    await run('length 40')

    expect(await ui.find({ type: 'Text', text: /^ {20}-{40}$/ })).toBeDefined()
  })

  test('left, right and center move the line and are saved', async ($, on) => {
    const { store, run } = await start($, on, { enabled: true, char: '-', length: 40 })
    const ui = await mount($)

    expect(await run('align left')).toContain('left')
    expect(store.get('config')).toEqual({ enabled: true, char: '-', length: 40, align: 'left' })
    expect(await ui.find({ type: 'Text', text: /^-{40}$/ })).toBeDefined()

    expect(await run('align right')).toContain('right')
    expect(store.get('config')).toEqual({ enabled: true, char: '-', length: 40, align: 'right' })
    expect(await ui.find({ type: 'Text', text: /^ {40}-{40}$/ })).toBeDefined()

    expect(await run('align center')).toContain('center')
    expect(store.get('config')).toEqual({ enabled: true, char: '-', length: 40, align: 'center' })
    expect(await ui.find({ type: 'Text', text: /^ {20}-{40}$/ })).toBeDefined()
  })

  test('a line that fills the panel draws the same whatever the alignment', async ($, on) => {
    const { run } = await start($, on)
    const ui = await mount($)

    for (const align of ['left', 'right', 'center']) {
      await run(`align ${align}`)
      expect(await ui.find({ type: 'Text', text: /^-{1000}$/ })).toBeDefined()
    }
  })

  test('a line shrunk to a narrower panel gets no alignment either', async ($, on) => {
    await start($, on, { enabled: true, char: '-', length: 60, align: 'right' })
    const wide = await mount($)
    expect(await wide.find({ type: 'Text', text: /^ {20}-{60}$/ })).toBeDefined()
    await wide.unmount()

    const narrow = await mount($, 40)
    expect(await narrow.find({ type: 'Text', text: /^-{1000}$/ })).toBeDefined()
  })

  test('a rejected alignment leaves the store and the line alone', async ($, on) => {
    const { store, run } = await start($, on, { enabled: true, char: '-', length: 40, align: 'right' })
    const ui = await mount($)

    for (const args of ['align', 'align middle', 'align LEFT', 'align left right', 'align \x1b[31m']) {
      const text = await run(args)
      expect(text).toContain('Nothing changed.')
      expect(text).not.toContain('\x1b')
      expect(store.get('config')).toEqual({ enabled: true, char: '-', length: 40, align: 'right' })
    }
    expect(await ui.find({ type: 'Text', text: /^ {40}-{40}$/ })).toBeDefined()
  })

  test('a config saved before alignment existed starts centered and keeps its length', async ($, on) => {
    await start($, on, { enabled: true, char: '=', length: 20 })
    const ui = await mount($)
    expect(await ui.find({ type: 'Text', text: /^ {30}={20}$/ })).toBeDefined()
  })
})
