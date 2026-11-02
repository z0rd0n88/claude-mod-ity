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
    const saved = loadConfig(await $.store.get('config'))
    await update($, config, () => saved)
    await $.command.register({
      name: 'mod-divider',
      description: 'Turn the divider line on or off, or set its character',
      argumentHint: 'on | off | set <character>',
    })
    return next(e)
  })

  on('command.run', { command: 'mod-divider' }, async ($, e) => {
    // From the store, not $.state: another open session may have changed it since this one started.
    // Before the first draw, the terminal's width is the closest thing to the panel's.
    const width = panel ?? e.presentation.columns - BAND_MARK
    const result = runCommand(loadConfig(await $.store.get('config')), e.args, width)
    if (result.config) {
      const changed = result.config
      await $.store.set('config', changed)
      await update($, config, () => changed)
    }
    return { text: result.text }
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
