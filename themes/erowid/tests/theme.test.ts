import { describe, expect, test } from 'claude-code/testing'

import { checkColors } from '../hooks/make-colors.js'

const backdrop = (plugin: string, scene: string) =>
  ({
    plugin: 'erowid',
    component: 'Backdrop',
    surface: 'desktop',
    requestId: 'backdrop',
    props: { plugin, scene, glass: false },
  }) as const

// What the engine does with $.theme.set: record the arguments, say a Desktop app drew them.
function stubTheme(on: (name: string, hook: (_: unknown, e: any) => unknown) => unknown) {
  const sets: any[] = []

  on('theme.set', (_, e) => {
    sets.push(e)
    return { value: { isDrawn: true } }
  })

  return sets
}

describe('erowid', () => {
  test('sets the colors and the backdrop in one call, so neither is dropped', async ($, on) => {
    const sets = stubTheme(on as never)
    on('session.start', () => ({ cwd: '/work' }))

    await $.session.start({ surface: 'desktop', isInteractive: true, cwd: '/work' })

    // A build that takes a style gets it in this same call; one that does not gets the call without it
    expect(sets).toHaveLength(1)
    expect(sets[0].backdrop).toEqual({ scene: 'erowid-header', glass: { blur: 0, opacity: 0.6 } })
    expect(sets[0].colors).toBeDefined()
  })

  test('sets the look again without the style when the build refuses a style', async ($, on) => {
    const sets: any[] = []

    on('theme.set', ((_: unknown, e: any) => {
      if (e.style !== undefined) {
        return { deny: 'theme.set does not know the attribute "style"' }
      }
      sets.push(e)
      return { value: { isDrawn: true } }
    }) as never)
    on('session.start', () => ({ cwd: '/work' }))

    await $.session.start({ surface: 'desktop', isInteractive: true, cwd: '/work' })

    expect(sets).toHaveLength(1)
    expect(sets[0].style).toBeUndefined()
    expect(sets[0].backdrop).toEqual({ scene: 'erowid-header', glass: { blur: 0, opacity: 0.6 } })
    expect(sets[0].colors).toBeDefined()
  })

  test('the colors leave no line that stops Desktop painting the theme', async ($, on) => {
    const sets = stubTheme(on as never)
    on('session.start', () => ({ cwd: '/work' }))

    await $.session.start({ surface: 'desktop', isInteractive: true, cwd: '/work' })

    const refused = checkColors(sets[0].colors).filter(line => line.startsWith("Desktop won't paint"))
    expect(refused).toEqual([])
  })

  test('says why nothing draws when the surface draws no themes', async ($, on) => {
    const lines: string[] = []

    on('theme.set', () => ({ value: { isDrawn: false, reason: 'the terminal draws no theme' } }))
    on('ui.status', (_, e) => {
      lines.push((e as { text: string }).text)
      return { value: undefined }
    })
    on('session.start', () => ({ cwd: '/work' }))

    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })

    expect(lines).toEqual(['the terminal draws no theme'])
  })

  test('draws the header strip for its own scene on Desktop', async $ => {
    const mounted = await $.ui.mount(backdrop('erowid', 'erowid-header'))
    const svg = await mounted.find({ type: 'Svg' })

    expect(svg).toBeDefined()
    expect(String((svg?.props as { source: string }).source)).toContain('THE VAULTS OF')
  })

  test('keeps the banner in view in a narrow pane and draws the margin art only when there is room', async $ => {
    const mounted = await $.ui.mount(backdrop('erowid', 'erowid-header'))
    const source = String(((await mounted.find({ type: 'Svg' }))?.props as { source: string }).source)

    // Anchored to the left, so cropping a narrow pane takes the right side and not the sun and the name
    expect(source).toContain('preserveAspectRatio="xMinYMin slice"')
    // The art is one group, hidden by a width query
    expect(source).toContain('<g class="art">')
    expect(source).toContain('@media (max-width: 1100px) { .art { display: none; } }')
  })

  test('leaves another mod’s backdrop alone', async ($, on) => {
    on('ui.render', () => ({ type: 'Text', props: {}, children: ['another mod'] }))

    const mounted = await $.ui.mount(backdrop('other-mod', 'erowid-header'))

    expect(await mounted.find({ type: 'Svg' })).toBeUndefined()
    expect(await mounted.find({ type: 'Text', text: 'another mod' })).toBeDefined()
  })
})
