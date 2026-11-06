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

const FOOTER = {
  component: 'SessionMode',
  props: { modes: ['focus'] },
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
  test('/github and the footer mark toggle the pane; the pane lists gh issues', async ($, on) => {
    const opened: string[] = []
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('ui.status', () => ({ value: undefined }))
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
    let fetched = false
    on('process.run', () => {
      fetched = true
      return { value: { exitCode: 0, stdout: GH_JSON, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
    })
    await $.session.start({ surface: 'desktop', isInteractive: true, cwd: '/work' })

    // session.start kicked off one fetch in the background; let it settle
    for (let i = 0; i < 200 && !fetched; i++) await Promise.resolve()
    expect(fetched).toBe(true)

    const run = { origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 120 } } as const
    await $.command.run({ command: 'github', args: '', ...run })
    expect(opened).toEqual(['github'])
    await $.command.run({ command: 'github', args: '', ...run })
    expect(opened).toEqual([])
    await $.command.run({ command: 'github', args: '', ...run })
    expect(opened).toEqual(['github'])

    const footer = await $.ui.mount({ plugin: 'github-panel', surface: 'desktop', ...FOOTER })
    expect(await footer.find({ type: 'Markdown', text: /favicon\.svg/ })).toBeDefined()
    expect(await footer.find({ type: 'Text', text: /focus/ })).toBeDefined()
    await footer.press({ key: 'open-github', link: { href: 'https://github.com/#toggle-github-panel' } })
    expect(opened).toEqual([])

    const pane = await $.ui.mount({ plugin: 'github-panel', surface: 'desktop', ...PANE })
    expect(await pane.find({ type: 'Link', text: /#60 Verify iOS build/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /Flutter-mobile-app/ })).toBeDefined()
  })
})
