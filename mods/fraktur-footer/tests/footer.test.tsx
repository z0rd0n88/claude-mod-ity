import { describe, expect, test } from 'claude-code/testing'

const footer = (modes: string[]) => ({ component: 'SessionMode', props: { modes } }) as const

describe('fraktur-footer', () => {
  test('the engine draws the mode labels in Fraktur, in place of the plain ones', async ($, on) => {
    // Beneath the mod: the engine's own labels, drawn from whatever props reach it
    on('ui.render', (_, e) => {
      const { Text } = _.ui.resolve(e)
      return <Text key="engine">{(e.props as { modes: string[] }).modes.join(' & ')}</Text>
    })

    const mounted = await $.ui.mount({ plugin: 'fraktur-footer', surface: 'desktop', ...footer(['focus', 'memory paused']) })
    expect(await mounted.find({ type: 'Text', text: '\u{1D523}\u{1D52C}\u{1D520}\u{1D532}\u{1D530} & \u{1D52A}\u{1D522}\u{1D52A}\u{1D52C}\u{1D52F}\u{1D536} \u{1D52D}\u{1D51E}\u{1D532}\u{1D530}\u{1D522}\u{1D521}' })).toBeDefined()
  })

  test('capitals with a letterlike code point, digits and punctuation come out right', async ($, on) => {
    on('ui.render', (_, e) => {
      const { Text } = _.ui.resolve(e)
      return <Text key="engine">{(e.props as { modes: string[] }).modes.join(' & ')}</Text>
    })

    // C H I R Z live in the letterlike block, not at U+1D504..; A stays in the math block; 5.2 has no Fraktur form
    const mounted = await $.ui.mount({ plugin: 'fraktur-footer', surface: 'desktop', ...footer(['CHIRZA 5.2']) })
    expect(await mounted.find({ type: 'Text', text: 'ℭℌℑℜℨ\u{1D504} 5.2' })).toBeDefined()
  })

  test('no labels draws nothing extra', async ($, on) => {
    on('ui.render', (_, e) => {
      const { Text } = _.ui.resolve(e)
      return <Text key="engine">{`[${(e.props as { modes: string[] }).modes.length}]`}</Text>
    })

    const mounted = await $.ui.mount({ plugin: 'fraktur-footer', surface: 'desktop', ...footer([]) })
    expect(await mounted.find({ type: 'Text', text: '[0]' })).toBeDefined()
  })
})
