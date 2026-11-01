import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { DEFAULT_CONFIG, loadConfig, runCommand } from './config'
import { withDividers } from './split'

// Far wider than any panel: the Text cuts it at the panel's edge, whatever the font's glyph width.
const WIDE = 1000

// $.state holds what the band draws this session. $.store keeps it across sessions.
const config = atom({ plugin: 'mod-divider', key: 'config' } as const, DEFAULT_CONFIG)

export const register: Register = (on) => {
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
    const result = runCommand(loadConfig(await $.store.get('config')), e.args)
    if (result.config) {
      const changed = result.config
      await $.store.set('config', changed)
      await update($, config, () => changed)
    }
    return { text: result.text }
  }).catch(() => ({ text: 'mod-divider could not read or save its configuration, so nothing changed.' }))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const { enabled, char } = await read($, config)
    const tree = await next(e)
    if (!enabled || e.props.hasSurvey) return tree
    const { Text } = $.ui.resolve(e)
    const line = char.repeat(WIDE)
    return withDividers(tree, () => <Text dimColor wrap="truncate">{line}</Text>)
  })
}
