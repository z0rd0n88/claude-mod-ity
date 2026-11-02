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
  on('store.get', (_: any, e: any) => ({ value: store.get(e.key) }))
  on('store.set', (_: any, e: any) => {
    if (store.has('fail-saves')) throw new Error('disk full')
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('command.register', (_: any, e: any) => ({ value: { command: e.name } }))
  on('ui.render', { component: 'AbovePrompt' }, () => col(row('first'), col(row('second'))))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  const run = async (args: string) => (await $.command.run({ command: 'mod-divider', args, ...COMMAND })).text as string
  return { store, run }
}

const mount = ($: any, bodyColumns = 80) =>
  $.ui.mount({ plugin: 'mod-divider', surface: 'terminal', ...BAND, props: { ...BAND.props, bodyColumns } })

describe('mod-divider', () => {
  test('set changes the character the line repeats and saves it', async ($, on) => {
    const { store, run } = await start($, on)
    const ui = await mount($)
    expect(await ui.find({ type: 'Text', text: /^-{1000}$/ })).toBeDefined()

    expect(await run('set 🔥')).toContain('🔥')

    expect(store.get('config')).toEqual({ enabled: true, char: '🔥', length: null })
    expect(await ui.find({ type: 'Text', text: /^(🔥){1000}$/u })).toBeDefined()
  })

  test('off draws no line, on draws it again, and both are saved', async ($, on) => {
    const { store, run } = await start($, on)
    const ui = await mount($)

    expect(await run('off')).toContain('off')
    expect(store.get('config')).toEqual({ enabled: false, char: '-', length: null })
    expect(await ui.find({ type: 'Text', text: /^-+$/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: 'first' })).toBeDefined()

    expect(await run('on')).toContain('on')
    expect(store.get('config')).toEqual({ enabled: true, char: '-', length: null })
    expect(await ui.find({ type: 'Text', text: /^-+$/ })).toBeDefined()
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

  test('a blank line draws spaces across the panel, with no ellipsis to show', async ($, on) => {
    const { store, run } = await start($, on)
    const ui = await mount($)

    await run('set space')

    expect(store.get('config')).toEqual({ enabled: true, char: ' ', length: null })
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

  test('a store that cannot save changes nothing and says so', async ($, on) => {
    const { store, run } = await start($, on, { enabled: true, char: '=' })
    const ui = await mount($)
    store.set('fail-saves', true)

    expect(await run('set 🔥')).toContain('nothing changed')
    expect(await ui.find({ type: 'Text', text: /^=+$/ })).toBeDefined()
  })

  test('a survey hides the line', async ($, on) => {
    await start($, on)
    const survey = await $.ui.mount({ plugin: 'mod-divider', surface: 'terminal', ...BAND, props: { ...BAND.props, hasSurvey: true } })
    expect(await survey.find({ type: 'Text', text: /^-+$/ })).toBeUndefined()
  })
})

describe('mod-divider length', () => {
  test('a length under the panel draws that many columns and saves it', async ($, on) => {
    const { store, run } = await start($, on)
    const ui = await mount($)

    expect(await run('length 40')).toContain('40')

    expect(store.get('config')).toEqual({ enabled: true, char: '-', length: 40 })
    expect(await ui.find({ type: 'Text', text: /^-{40}$/ })).toBeDefined()
  })

  test('the longest length allowed is one under the panel', async ($, on) => {
    const { store, run } = await start($, on)
    const ui = await mount($)

    await run('length 79')

    expect(store.get('config')).toEqual({ enabled: true, char: '-', length: 79 })
    expect(await ui.find({ type: 'Text', text: /^-{79}$/ })).toBeDefined()
  })

  test('a length at or past the panel is clamped against the width last drawn, not the terminal', async ($, on) => {
    const { store, run } = await start($, on)
    const ui = await mount($)

    for (const args of ['length 80', 'length 5000']) {
      expect(await run(args)).toContain('shortened')
      expect(store.get('config')).toEqual({ enabled: true, char: '-', length: 79 })
    }
    expect(await ui.find({ type: 'Text', text: /^-{79}$/ })).toBeDefined()
  })

  test('before the first draw, the terminal less the mark stands in for the panel', async ($, on) => {
    const { store, run } = await start($, on)

    await run('length 5000')

    expect(store.get('config')).toEqual({ enabled: true, char: '-', length: 94 })
  })

  test('narrowing the panel shrinks the line to its edge and keeps the setting', async ($, on) => {
    const { store, run } = await start($, on)
    const wide = await mount($)
    await run('length 60')
    await wide.unmount()

    const narrow = await mount($, 40)
    expect(await narrow.find({ type: 'Text', text: /^-{1000}$/ })).toBeDefined()
    expect(store.get('config')).toEqual({ enabled: true, char: '-', length: 60 })
    await narrow.unmount()

    const back = await mount($)
    expect(await back.find({ type: 'Text', text: /^-{60}$/ })).toBeDefined()
  })

  test('a rejected length leaves the store and the line alone', async ($, on) => {
    const { store, run } = await start($, on, { enabled: true, char: '-', length: 30 })
    const ui = await mount($)

    for (const args of ['length 0', 'length -5', 'length abc', 'length 1.5', 'length']) {
      expect(await run(args)).toContain('Nothing changed.')
      expect(store.get('config')).toEqual({ enabled: true, char: '-', length: 30 })
    }
    expect(await ui.find({ type: 'Text', text: /^-{30}$/ })).toBeDefined()
  })

  test('length full fills the panel again', async ($, on) => {
    const { store, run } = await start($, on, { enabled: true, char: '-', length: 30 })
    const ui = await mount($)

    await run('length full')

    expect(store.get('config')).toEqual({ enabled: true, char: '-', length: null })
    expect(await ui.find({ type: 'Text', text: /^-{1000}$/ })).toBeDefined()
  })
})
