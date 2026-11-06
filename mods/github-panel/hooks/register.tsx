import { atom, read, update } from 'claude-code'
import type { Register, EngineInterface } from 'claude-code'

import type { Feed, Issue } from '../types'

const PANE = 'github'
// github.com's favicon, grey so it reads on light and dark; drawn in the pane header.
const MARK = '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M16 0C7.16 0 0 7.16 0 16C0 23.08 4.58 29.06 10.94 31.18C11.74 31.32 12.04 30.84 12.04 30.42C12.04 30.04 12.02 28.78 12.02 27.44C8 28.18 6.96 26.46 6.64 25.56C6.46 25.1 5.68 23.68 5 23.3C4.44 23 3.64 22.26 4.98 22.24C6.24 22.22 7.14 23.4 7.44 23.88C8.88 26.3 11.18 25.62 12.1 25.2C12.24 24.16 12.66 23.46 13.12 23.06C9.56 22.66 5.84 21.28 5.84 15.16C5.84 13.42 6.46 11.98 7.48 10.86C7.32 10.46 6.76 8.82 7.64 6.62C7.64 6.62 8.98 6.2 12.04 8.26C13.32 7.9 14.68 7.72 16.04 7.72C17.4 7.72 18.76 7.9 20.04 8.26C23.1 6.18 24.44 6.62 24.44 6.62C25.32 8.82 24.76 10.46 24.6 10.86C25.62 11.98 26.24 13.4 26.24 15.16C26.24 21.3 22.5 22.66 18.94 23.06C19.52 23.56 20.02 24.52 20.02 26.02C20.02 28.16 20 29.88 20 30.42C20 30.84 20.3 31.34 21.1 31.18C27.42 29.06 32 23.06 32 16C32 7.16 24.84 0 16 0V0Z" fill="#8b949e"/></svg>'
const feed = atom({ plugin: 'github-panel', key: 'feed' } as const, { issues: [] } as Feed, {
  shape: 'feed-1',
})

// ponytail: one gh call per open/refresh, assigned-to-me issues only.
// Add PRs tab, project switcher and search when this slice is confirmed.
async function fetchIssues($: EngineInterface): Promise<void> {
  const ran = await $.process.run(
    [
      'gh', 'search', 'issues',
      '--assignee', '@me', '--state', 'open',
      '--sort', 'updated', '--limit', '30',
      '--json', 'number,title,repository,url,updatedAt',
    ],
    { timeoutMs: 20_000 },
  )
  if (ran.exitCode !== 0) {
    await update($, feed, f => ({ ...f, error: ran.stderr.trim() || `gh exited ${ran.exitCode}` }))
    $.ui.status('GitHub · gh error · /github')
    return
  }
  type Row = { number: number; title: string; url: string; updatedAt: string; repository: { nameWithOwner: string } }
  const rows = JSON.parse(ran.stdout) as Row[]
  const issues: Issue[] = rows.map(r => ({
    number: r.number, title: r.title, url: r.url, updatedAt: r.updatedAt, repo: r.repository.nameWithOwner,
  }))
  await update($, feed, () => ({ issues, fetchedAt: new Date().toISOString() }))
  $.ui.status(`GitHub · ${issues.length} open · /github`)
}

async function openPane($: EngineInterface): Promise<void> {
  await $.ui.open({ id: PANE, title: 'GitHub', focus: true })
  void fetchIssues($)
}

async function togglePane($: EngineInterface): Promise<void> {
  const isOpen = (await $.ui.panes()).some(p => p.id === PANE)
  if (isOpen) await $.ui.close({ id: PANE })
  else await openPane($)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'github', description: 'Toggle the GitHub issues pane' })
    const started = await next(e)
    $.ui.status('GitHub · /github')
    void fetchIssues($)
    return started
  })

  on('command.run', { command: 'github' }, async $ => {
    await togglePane($)
    return { text: 'GitHub pane toggled.' }
  })

  // The band above the prompt: the favicon alone. Only a Button takes a
  // click, so a one-character plain button is laid over the mark.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const below = await next(e) // what the other mods (status line) draw
    const toggle = { key: 'open-github', plain: true as const, onPress: () => void togglePane($) }
    if (e.surface === 'terminal') {
      const { Box, Button } = $.ui.resolve(e)
      return (
        <Box flexDirection="column">
          <Box><Button {...toggle}>GitHub</Button></Box>
          {below}
        </Box>
      )
    }
    const { Box, Button, Svg } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        <Box key="github-mark" width={3} height={1}>
          <Svg source={MARK} alt="GitHub" width={18} height={18} />
          <Box position="absolute" top={0} left={0} width={3} height={1} overflow="hidden">
            <Button {...toggle} label="\u2007\u2007" />
          </Box>
        </Box>
        {below}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Link } = $.ui.resolve(e)
    const mark = e.surface === 'terminal' ? null : (() => { const { Svg } = $.ui.resolve(e); return <Svg source={MARK} alt="GitHub" width={16} height={16} /> })()
    const f = await read($, feed)
    const age = (iso: string) => {
      const h = Math.round((Date.now() - Date.parse(iso)) / 3_600_000)
      return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`
    }

    return (
      <Box flexDirection="column">
        <Box alignItems="center" gap={1}>
          {mark}
          <Text bold>Issues assigned to me</Text>
          <Text> </Text>
          <Button key="refresh" onPress={() => void fetchIssues($)}>Refresh</Button>
        </Box>
        {f.error && <Text color="red">{f.error}</Text>}
        {!f.error && !f.fetchedAt && <Text dimColor>Loading...</Text>}
        {f.fetchedAt && f.issues.length === 0 && <Text dimColor>No open issues assigned to you.</Text>}
        {f.issues.map(i => (
          <Box key={`${i.repo}#${i.number}`}>
            <Text dimColor>{age(i.updatedAt).padStart(3)} </Text>
            <Link href={i.url} label={`#${i.number} ${i.title}`} />
            <Text dimColor> {i.repo}</Text>
          </Box>
        ))}
      </Box>
    )
  })
}
