import { atom, read, update } from 'claude-code'
import type { Register, EngineInterface } from 'claude-code'

import type { Feed, Issue } from '../types'

const PANE = 'github'
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
    return
  }
  type Row = { number: number; title: string; url: string; updatedAt: string; repository: { nameWithOwner: string } }
  const rows = JSON.parse(ran.stdout) as Row[]
  const issues: Issue[] = rows.map(r => ({
    number: r.number, title: r.title, url: r.url, updatedAt: r.updatedAt, repo: r.repository.nameWithOwner,
  }))
  await update($, feed, () => ({ issues, fetchedAt: new Date().toISOString() }))
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
    $.ui.status(undefined) // an earlier version pinned text here
    void fetchIssues($)
    return started
  })

  on('command.run', { command: 'github' }, async $ => {
    await togglePane($)
    return { text: 'GitHub pane toggled.' }
  })

  // The prompt footer's mode labels (right of the model name on Desktop):
  // a Fraktur 𝔊ℌ plain button toggles the pane, then the engine's own labels.
  // (This slot draws no images on Desktop, so no favicon.)
  on('ui.render', { component: 'SessionMode' }, ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const modes = e.props.modes.join(' & ')
    return (
      <Box gap={1}>
        <Button key="open-github" plain dimColor onPress={() => void togglePane($)}>{'\u{1D50A}\u210c'}</Button>
        {modes !== '' && <Text dimColor>{modes}</Text>}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Link } = $.ui.resolve(e)
    const f = await read($, feed)
    const age = (iso: string) => {
      const h = Math.round((Date.now() - Date.parse(iso)) / 3_600_000)
      return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`
    }

    return (
      <Box flexDirection="column">
        <Box alignItems="center" gap={1}>
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
