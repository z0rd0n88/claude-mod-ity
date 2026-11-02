import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { DEFAULT_CONFIG, dividerText, loadConfig, runCommand } from './config'
import { withDividers } from './split'

// The columns the engine keeps at the band's right end for its [-], as bodyColumns says.
const BAND_MARK = 5

// $.state holds what the band draws this session. $.store keeps it across sessions.
const config = atom({ plugin: 'mod-divider', key: 'config' } as const, DEFAULT_CONFIG)

export const register: Register = (on) => {
  // The width last drawn in, which a command cannot see for itself. Not in $.state, as a drawing may not write there.
  // A hot reload loses it, which only means the terminal's width stands in until the next draw.
  let panel: number | undefined

  on('session.start', async ($, e, next) => {
    // A store file that cannot be read or a denied write must not cost the session its command. An unreadable file draws
    // the default line, and the command reports the failure when run.
    const saved = loadConfig(await $.store.get('config').catch(() => undefined))
    await update($, config, () => saved).catch(() => {})
    await $.command.register({
      name: 'mod-divider',
      description: 'Turn the divider line on or off, or set its character, length and alignment',
      argumentHint: 'on | off | set <character> | length <columns> | align <left|center|right>',
    })
    return next(e)
  })

  on('command.run', { command: 'mod-divider' }, async ($, e) => {
    // From the store, not $.state: another open session may have changed it since this one started.
    // Before the first draw, the terminal's width is the closest thing to the panel's.
    const width = panel ?? e.presentation.columns - BAND_MARK
    const loaded = loadConfig(await $.store.get('config'))
    const result = runCommand(loaded, e.args, width)
    if (result.config) await $.store.set('config', result.config)
    // A rejected call leaves everything alone, as its reply says.
    if (!result.config && e.args.trim() !== '') return { text: result.text }
    const latest = result.config ?? loaded
    // A bare call refreshes too, so what it reports is what this session draws unless a hook denies the write. A failure
    // here is no failed save: the store has it.
    const note = await update($, config, () => latest).then(() => '', () => (result.config ? ' It applies from the next session.' : ''))
    return { text: result.text + note }
  }).catch(() => ({ text: 'mod-divider could not read or save its configuration, so nothing changed.' }))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await read($, config)
    panel = e.props.bodyColumns
    const tree = await next(e)
    if (!current.enabled || e.props.hasSurvey) return tree
    const { Text } = $.ui.resolve(e)
    const line = dividerText(current, e.props.bodyColumns)
    return withDividers(tree, () => <Text dimColor wrap="truncate">{line}</Text>)
  })
}
