import type { Register } from 'claude-code'

import { withDividers } from './split'

// Far wider than any panel: the Text cuts it at the panel's edge, whatever the font's glyph width.
const WIDE = 1000

export const register: Register = (on, options) => {
  const pattern = typeof options.pattern === 'string' && options.pattern !== '' ? options.pattern : '-'
  const line = pattern.repeat(Math.ceil(WIDE / pattern.length))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const tree = await next(e)
    if (e.props.hasSurvey) return tree
    const { Text } = $.ui.resolve(e)
    return withDividers(tree, () => <Text dimColor wrap="truncate">{line}</Text>)
  })
}
