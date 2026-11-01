import { describe, expect, test } from 'claude-code/testing'

const col = (...children: unknown[]) => ({ type: 'Box', props: { flexDirection: 'column' }, children })
const row = (text: string) => ({ type: 'Box', props: { flexDirection: 'row' }, children: [{ type: 'Text', props: {}, children: [text] }] })

// A band site's props, as the engine would hand them
const BAND = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

const COMMAND = { origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as const

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
  const ui = await $.ui.mount({ plugin: 'mod-divider', surface: 'terminal', ...BAND })
  return { store, run, ui }
}

describe('mod-divider', () => {
  test('set changes the character the line repeats and saves it', async ($, on) => {
    const { store, run, ui } = await start($, on)
    expect(await ui.find({ type: 'Text', text: /^-{1000}$/ })).toBeDefined()

    expect(await run('set 🔥')).toContain('🔥')

    expect(store.get('config')).toEqual({ enabled: true, char: '🔥' })
    expect(await ui.find({ type: 'Text', text: /^(🔥){1000}$/u })).toBeDefined()
  })

  test('off draws no line, on draws it again, and both are saved', async ($, on) => {
    const { store, run, ui } = await start($, on)

    expect(await run('off')).toContain('off')
    expect(store.get('config')).toEqual({ enabled: false, char: '-' })
    expect(await ui.find({ type: 'Text', text: /^-+$/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: 'first' })).toBeDefined()

    expect(await run('on')).toContain('on')
    expect(store.get('config')).toEqual({ enabled: true, char: '-' })
    expect(await ui.find({ type: 'Text', text: /^-+$/ })).toBeDefined()
  })

  test('a rejected character leaves the store and the line alone', async ($, on) => {
    const { store, run, ui } = await start($, on, { enabled: true, char: '=' })

    for (const args of ['set --', 'set \x1b[31m', 'set \n', 'set']) {
      expect(await run(args)).toContain('Nothing changed.')
      expect(store.get('config')).toEqual({ enabled: true, char: '=' })
    }
    expect(await ui.find({ type: 'Text', text: /^=+$/ })).toBeDefined()
  })

  test('a blank line draws spaces', async ($, on) => {
    const { store, run, ui } = await start($, on)

    await run('set space')

    expect(store.get('config')).toEqual({ enabled: true, char: ' ' })
    expect(await ui.find({ type: 'Text', text: /^ {1000}$/ })).toBeDefined()
  })

  test('a saved config applies in a new session, and a bad one falls back to a dash', async ($, on) => {
    const saved = await start($, on, { enabled: true, char: '🔥' })
    expect(await saved.ui.find({ type: 'Text', text: /^(🔥)+$/u })).toBeDefined()
    await saved.ui.unmount()

    saved.store.set('config', { enabled: true, char: '\x1b[31m' })
    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
    const ui = await $.ui.mount({ plugin: 'mod-divider', surface: 'terminal', ...BAND })
    expect(await ui.find({ type: 'Text', text: /^-+$/ })).toBeDefined()
  })

  test('a store that cannot save changes nothing and says so', async ($, on) => {
    const { store, run, ui } = await start($, on, { enabled: true, char: '=' })
    store.set('fail-saves', true)

    expect(await run('set 🔥')).toContain('nothing changed')
    expect(await ui.find({ type: 'Text', text: /^=+$/ })).toBeDefined()
  })

  test('a survey hides the line', async ($, on) => {
    const { ui } = await start($, on)
    await ui.unmount()
    const survey = await $.ui.mount({ plugin: 'mod-divider', surface: 'terminal', ...BAND, props: { ...BAND.props, hasSurvey: true } })
    expect(await survey.find({ type: 'Text', text: /^-+$/ })).toBeUndefined()
  })
})
