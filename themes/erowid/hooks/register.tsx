import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'

const SCENE = 'erowid-header'

// Erowid has two faces. Its index pages are black with periwinkle links and gold section titles (dark here);
// its vault pages are gray-green with navy links and lavender boxes (light here). Both share the maroon header.
const { theme } = makeColors({
  label: 'Erowid',
  // success is the sage green of the site's link lists (#88a171 on the Mind & Spirit pages)
  roles: { accent: '#8888dd', danger: '#cc3333', success: '#88a171', warning: '#ddaa00', pro: '#a063bc' },
  light: {
    roles: { accent: '#1a0a80' },
    gray: {
      anchors: {
        'surface-0': '#e5e5e1',
        'surface-1': '#ecedf1',
        'surface-2': '#f4f4f4',
        'surface-3': '#f4f4f4',
        'text-primary': '#000000',
        'text-secondary': '#413333',
        'text-muted': '#555555',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#000000',
        'surface-1': '#111922',
        'surface-2': '#321929',
        'surface-3': '#321929',
        'text-primary': '#ccccdd',
        'text-secondary': '#a8a8c8',
        'text-muted': '#7f8fa1',
      },
    },
  },
})

// The site's chrome is square, small and bold: Georgia titles over Arial or Verdana body text, 2px bevelled borders.
// Every color here is a design-system name, so one rule follows the person's light or dark mode.
const PLAIN: ThemeSetArgs = {
  colors: theme,
  // The app's panels are see-through enough for the header and the margin art to show behind them. A solid panel hid the
  // banner, and a blur smeared it, so there is none. The veil keeps text readable in both modes.
  backdrop: { scene: SCENE, glass: { blur: 0, opacity: 0.6 } },
}

// Claude Code before v2.1.330 refuses a theme that holds a style, so it is added apart from PLAIN.
const STYLE = {
  Text: { fontFamily: ['sans'], fontWeight: 'semibold', fontSize: 14, lineHeight: 22, letterSpacing: 0.15 },
  Heading: { fontFamily: ['serif'], fontWeight: 'regular', color: 'text-warning', letterSpacing: 0.2 },
  UserMessage: {
    backgroundColor: 'surface-1',
    borderColor: 'border-accent',
    borderWidth: 2,
    radius: 0,
    padding: 10,
  },
  // Tool calls read like the site's link lists, in the same green
  ToolUse: {
    color: 'text-success',
    fontFamily: ['sans'],
    backgroundColor: 'surface-1',
    borderColor: 'border',
    borderWidth: 1,
    radius: 0,
  },
}

const FULL = { ...PLAIN, style: STYLE }

// The sun at the left of the site header: an orange ring with jagged yellow and red rays, cut off by the window edge.
function sunburst(cx: number, cy: number): string {
  const rays = 16
  let path = ''

  for (let i = 0; i < rays; i++) {
    const mid = (i / rays) * 2 * Math.PI
    const half = Math.PI / rays
    const tip = i % 2 === 0 ? 38 : 31
    const point = (angle: number, radius: number) =>
      `${(cx + Math.cos(angle) * radius).toFixed(1)},${(cy + Math.sin(angle) * radius).toFixed(1)}`

    path += `<polygon fill="${i % 2 === 0 ? '#f2a81d' : '#d9501a'}" points="${point(mid - half, 21)} ${point(mid, tip)} ${point(mid + half, 21)}"/>`
  }

  return `${path}<circle cx="${cx}" cy="${cy}" r="18" fill="#000000" stroke="#e8761e" stroke-width="5"/>`
}

// A stained-glass mandala, drawn as shapes because a backdrop can't hold a picture: rings of dots and petals round a gold eye.
function mandala(cx: number, cy: number, r: number): string {
  const rim = ['#49b5b0', '#f2f2f2', '#8b6fd0', '#e6892b']
  const pt = (angle: number, distance: number): [string, string] => [
    (cx + Math.cos(angle) * distance).toFixed(1),
    (cy + Math.sin(angle) * distance).toFixed(1),
  ]
  const petal = (angle: number, distance: number, rx: number, ry: number, fill: string) => {
    const [x, y] = pt(angle, distance)
    const turn = ((angle * 180) / Math.PI - 90).toFixed(1)

    return `<ellipse rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${fill}" stroke="#f2f2f2" stroke-opacity="0.6" stroke-width="0.6" transform="translate(${x} ${y}) rotate(${turn})"/>`
  }

  let shapes = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#0a0e14" stroke="#7a8aa0" stroke-opacity="0.6"/>`

  for (let i = 0; i < 24; i++) {
    const [x, y] = pt((i / 24) * 2 * Math.PI, r * 0.88)

    shapes += `<circle cx="${x}" cy="${y}" r="${(r * 0.05).toFixed(1)}" fill="${rim[i % rim.length]}"/>`
  }
  for (let i = 0; i < 12; i++) {
    shapes += petal((i / 12) * 2 * Math.PI, r * 0.62, r * 0.13, r * 0.27, i % 2 === 0 ? '#49b5b0' : '#5b6fd6')
  }
  for (let i = 0; i < 8; i++) {
    shapes += petal((i / 8) * 2 * Math.PI, r * 0.34, r * 0.08, r * 0.17, '#d9501a')
  }

  return `${shapes}<circle cx="${cx}" cy="${cy}" r="${(r * 0.1).toFixed(1)}" fill="#f2c14e" stroke="#ffffff" stroke-width="0.8"/>`
}

const TABS = [
  { x: 104, w: 112, label: 'Plants &amp; Drugs' },
  { x: 222, w: 100, label: 'Mind &amp; Spirit' },
  { x: 328, w: 110, label: 'Freedom &amp; Law' },
  { x: 444, w: 98, label: 'Culture &amp; Art' },
  { x: 548, w: 76, label: 'Library' },
]

// The ground reads the app's mode: gray-green by day, black by night. The header strip is the same in both.
// Anchored to the top left and sliced, so a narrow pane crops the right and the sun, name and first tabs stay in view.
// The margin art sits at the far left and right, so it only shows in a window wide enough to have margins.
const BACKDROP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMinYMin slice">
<style>
.ground { fill: #e5e5e1; }
@media (prefers-color-scheme: dark) { .ground { fill: #000000; } }
.tab { fill: #4b3a48; stroke: #9a8a99; stroke-width: 1; }
.tab-label { fill: #d8d0d8; font: 700 11px Arial, Helvetica, sans-serif; }
.art { opacity: 0.4; }
@media (max-width: 1100px) { .art { display: none; } }
</style>
<defs>
<pattern id="weave" width="8" height="6" patternUnits="userSpaceOnUse">
<path d="M0 4 Q2 0 4 3 T8 3" fill="none" stroke="#3a2438" stroke-width="1"/>
</pattern>
</defs>
<rect class="ground" width="1600" height="900"/>
<g class="art">
${mandala(96, 330, 78)}
${mandala(96, 620, 54)}
${mandala(1504, 330, 78)}
${mandala(1504, 620, 54)}
</g>
<rect width="1600" height="12" fill="#1b0f1b"/>
<rect width="1600" height="12" fill="url(#weave)"/>
<rect y="12" width="1600" height="1" fill="#8a7a8f"/>
<rect y="13" width="1600" height="42" fill="#000000"/>
${sunburst(28, 34)}
<text x="125" y="31" fill="#9a8f9a" font-family="Arial, Helvetica, sans-serif" font-size="10" letter-spacing="3">THE VAULTS OF</text>
<text x="124" y="53" fill="#a89fa8" font-family="Arial, Helvetica, sans-serif" font-size="26" letter-spacing="4">EROWID</text>
<rect y="55" width="1600" height="22" fill="#321929"/>
<rect y="55" width="1600" height="1" fill="#8a7a8f"/>
${TABS.map(
  ({ x, w, label }) =>
    `<rect class="tab" x="${x}" y="57" width="${w}" height="19"/><text class="tab-label" x="${x + 8}" y="70">${label}</text>` +
    (label === 'Library' ? '' : `<polygon fill="#d8d0d8" points="${x + w - 16},64 ${x + w - 8},64 ${x + w - 12},69"/>`),
).join('\n')}
${mandala(1380, 34, 20)}
${mandala(1440, 34, 20)}
${mandala(1500, 34, 20)}
</svg>`

export const register: Register = on => {
  // A reload or --resume drops the theme, so it is set at every session start, colors and backdrop in one call.
  on('session.start', async ($, e, next) => {
    let reason: string | undefined

    try {
      const set = await $.theme.set(FULL)

      if (!set.isDrawn) {
        reason = set.reason
      }
    } catch {
      // A build that does not take a style refuses the whole set, so set the look again without it.
      const set = await $.theme.set(PLAIN)

      if (!set.isDrawn) {
        reason = set.reason
      }
    }

    if (reason !== undefined) {
      $.ui.status(reason)
    }

    return next(e)
  })

  // This hook runs for every mod's backdrop, so leave another mod's scene alone.
  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.plugin !== $.plugin.name || e.props.scene !== SCENE) {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return <Svg source={BACKDROP} alt="The Vaults of Erowid header: a sun, the site name and a row of menu tabs" />
  })
}
