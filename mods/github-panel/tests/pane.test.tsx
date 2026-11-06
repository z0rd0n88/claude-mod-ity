import { describe, expect, test } from 'claude-code/testing'

const PANE = {
  component: 'Pane',
  requestId: 'github',
  props: {
    title: 'GitHub',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

const BAND = {
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const GH_JSON = JSON.stringify([
  {
    number: 60,
    title: 'Verify iOS build on a Mac',
    url: 'https://github.com/VistaMarkets/Flutter-mobile-app/issues/60',
    updatedAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    repository: { nameWithOwner: 'VistaMarkets/Flutter-mobile-app' },
  },
])

describe('github-panel', () => {
  test('the hint button opens the pane and the pane lists gh issues', async ($, on) => {
    const opened: string[] = []
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    on('ui.open', ($, e) => {
      opened.push(e.id)
      return { value: { isPlaced: true } }
    })
    on('ui.panes', () => ({ value: opened.map(id => ({ id, title: 'GitHub', isShown: true, isFocused: false, isPlaced: true })) }))
    on('ui.close', ($, e) => {
      opened.splice(opened.indexOf(e.id), 1)
      return { value: undefined }
    })
    // What the engine draws where the mod draws nothing
    on('ui.render', ($, e) => {
      const { Box } = $.ui.resolve(e)
      return <Box key="engine" />
    })
    on('process.run', () => ({
      value: { exitCode: 0, stdout: GH_JSON, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
    }))
    await $.session.start({ surface: 'desktop', isInteractive: true, cwd: '/work' })

    const band = await $.ui.mount({ plugin: 'github-panel', surface: 'desktop', ...BAND })
    expect(await band.find({ type: 'Button', key: 'open-github' })).toBeDefined()
    await band.press({ key: 'open-github' })
    expect(opened).toEqual(['github'])
    await band.press({ key: 'open-github' })
    expect(opened).toEqual([])
    await band.press({ key: 'open-github' })
    expect(opened).toEqual(['github'])

    const pane = await $.ui.mount({ plugin: 'github-panel', surface: 'desktop', ...PANE })
    expect(await pane.find({ type: 'Link', text: /#60 Verify iOS build/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /Flutter-mobile-app/ })).toBeDefined()
  })
})
