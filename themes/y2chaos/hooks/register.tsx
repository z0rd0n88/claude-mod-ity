import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'

const SCENE = 'y2chaos-header'

// Y2Chaos is the late-90s web at full volume: a black-purple night with alien-green and hot pink, and a cream
// day that looks like a page someone cut out of a 1998 magazine. Every role is a loud color on purpose.
const { theme } = makeColors({
  label: 'Y2Chaos',
  roles: { accent: '#39ff14', danger: '#ff2a6d', success: '#7cfc00', warning: '#ffd300', pro: '#ff2fb3' },
  light: {
    roles: { accent: '#0a7d1f', success: '#2e8b00', warning: '#b58900', pro: '#c2187a' },
    gray: {
      anchors: {
        'surface-0': '#fbe9a8',
        'surface-1': '#fff6d5',
        'surface-2': '#fff9e6',
        'surface-3': '#fff9e6',
        'text-primary': '#1a0b3a',
        'text-secondary': '#3d2a66',
        'text-muted': '#6b5a8a',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0d0221',
        'surface-1': '#1a0b3a',
        'surface-2': '#2a0f4a',
        'surface-3': '#2a0f4a',
        'text-primary': '#f5f0ff',
        'text-secondary': '#c9b8ff',
        'text-muted': '#8f7fb8',
      },
    },
  },
})

// Square, loud and a little crooked: a heavy sans for everything, bold titles, 2px borders.
// Every color here is a design-system name, so one rule follows the person's light or dark mode.
const PLAIN: ThemeSetArgs = {
  colors: theme,
  // The panels are see-through so the header and the margin art show behind them. There is no blur, which would smear them.
  backdrop: { scene: SCENE, glass: { blur: 0, opacity: 0.6 } },
}

// Claude Code before v2.1.330 refuses a theme that holds a style, so it is added apart from PLAIN.
const STYLE = {
  Text: { fontFamily: ['sans'], fontWeight: 'semibold', fontSize: 14, lineHeight: 22, letterSpacing: 0.1 },
  Heading: { fontFamily: ['sans'], fontWeight: 'bold', color: 'text-warning', letterSpacing: 0.5 },
  UserMessage: {
    backgroundColor: 'surface-1',
    borderColor: 'border-accent',
    borderWidth: 2,
    radius: 0,
    padding: 10,
  },
  // Tool calls look like a chat window's status line: green on a dark box with a hard edge
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

// A flying saucer with a dome and blinking lights: the truth is out there, and it has a tractor beam.
function saucer(cx: number, cy: number, s: number): string {
  const lights = ['#ff2a6d', '#ffd300', '#39ff14', '#00e5ff']
  let dots = ''

  for (let i = 0; i < lights.length; i++) {
    dots += `<circle cx="${(cx - 30 * s + i * 20 * s).toFixed(1)}" cy="${(cy + 6 * s).toFixed(1)}" r="${(3 * s).toFixed(1)}" fill="${lights[i]}"/>`
  }

  return (
    `<polygon fill="#00e5ff" fill-opacity="0.25" points="${cx - 10 * s},${cy + 12 * s} ${cx + 10 * s},${cy + 12 * s} ${cx + 40 * s},${cy + 90 * s} ${cx - 40 * s},${cy + 90 * s}"/>` +
    `<ellipse cx="${cx}" cy="${cy}" rx="${48 * s}" ry="${12 * s}" fill="#7c4dff" stroke="#39ff14" stroke-width="${2 * s}"/>` +
    `<path d="M${cx - 22 * s} ${cy - 2 * s} Q${cx} ${cy - 30 * s} ${cx + 22 * s} ${cy - 2 * s}" fill="#00e5ff" stroke="#39ff14" stroke-width="${1.5 * s}"/>` +
    dots
  )
}

// A five-point star, the kind a lawman wears on his chest. It is drawn small and crooked on purpose.
function star(cx: number, cy: number, r: number, fill: string): string {
  const pts: string[] = []

  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5
    const d = i % 2 === 0 ? r : r * 0.42

    pts.push(`${(cx + Math.cos(angle) * d).toFixed(1)},${(cy + Math.sin(angle) * d).toFixed(1)}`)
  }

  return `<polygon fill="${fill}" stroke="#ffd300" stroke-width="2" points="${pts.join(' ')}" transform="rotate(-8 ${cx} ${cy})"/>`
}

// A pixel smiley, the kind a web page put up when a GIF wouldn't load.
function pixelFace(x: number, y: number, p: number): string {
  const px = (col: number, row: number, fill: string) =>
    `<rect x="${x + col * p}" y="${y + row * p}" width="${p}" height="${p}" fill="${fill}"/>`
  let out = ''

  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      if ((row === 0 || row === 5) && (col === 0 || col === 5)) continue
      out += px(col, row, '#ffd300')
    }
  }
  out += px(1, 2, '#0d0221') + px(4, 2, '#0d0221') + px(1, 4, '#0d0221') + px(2, 4, '#0d0221') + px(3, 4, '#0d0221') + px(4, 4, '#0d0221')

  return out
}

const TABS = [
  { x: 104, w: 100, label: 'Truth Files', fill: '#39ff14' },
  { x: 212, w: 112, label: 'Lone Star Law', fill: '#ffd300' },
  { x: 332, w: 100, label: 'Doug Diary', fill: '#ff2fb3' },
  { x: 440, w: 106, label: 'Modern Life', fill: '#ff8c1a' },
  { x: 554, w: 110, label: 'Shared Folder', fill: '#00e5ff' },
]

// The ground reads the app's mode: a purple night with scanlines, or a cream page by day. The strip is the same in both.
// Anchored to the top left and sliced, so a narrow pane crops the right and the logo and first tabs stay in view.
// The margin art sits at the far left and right, so it only shows in a window wide enough to have margins.
const BACKDROP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMinYMin slice">
<style>
.ground { fill: #fff6d5; }
@media (prefers-color-scheme: dark) { .ground { fill: #0d0221; } }
.scan { stroke: #000000; stroke-opacity: 0; }
@media (prefers-color-scheme: dark) { .scan { stroke-opacity: 0.35; } }
.tab-label { fill: #0d0221; font: 700 11px Arial, Helvetica, sans-serif; }
.marquee { fill: #ffd300; font: 700 11px "Courier New", monospace; }
.title { font: 900 28px Arial, Helvetica, sans-serif; }
.art { opacity: 0.55; }
@media (max-width: 1100px) { .art { display: none; } }
</style>
<defs>
<linearGradient id="rainbow" x1="0" x2="1" y1="0" y2="0">
<stop offset="0" stop-color="#39ff14"/><stop offset="0.33" stop-color="#00e5ff"/><stop offset="0.66" stop-color="#ff2fb3"/><stop offset="1" stop-color="#ffd300"/>
</linearGradient>
<pattern id="scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
<rect class="scan" width="4" height="2" fill="#000000"/>
</pattern>
</defs>
<rect class="ground" width="1600" height="900"/>
<rect width="1600" height="900" fill="url(#scanlines)"/>
<g class="art">
${saucer(96, 300, 1)}
${star(96, 620, 52, '#ffd300')}
${pixelFace(1440, 260, 12)}
${star(1504, 640, 44, '#ff2fb3')}
${saucer(1504, 420, 0.6)}
</g>
<rect width="1600" height="8" fill="#ff2a6d"/>
<rect x="0" y="8" width="1600" height="4" fill="#ffd300"/>
<rect y="12" width="1600" height="54" fill="#1a0b3a"/>
<rect y="12" width="1600" height="2" fill="#39ff14"/>
${saucer(44, 40, 0.35)}
<text class="title" x="100" y="48" fill="url(#rainbow)">Y2CHAOS</text>
<text x="102" y="62" fill="#39ff14" font-family="Courier New, monospace" font-size="10">LOADING... 14.4k  //  YOU ARE VISITOR 000042</text>
<text class="marquee" x="500" y="40">*** I WANT TO BELIEVE *** SHARE ME *** YOUR CONNECTION IS BEING SHARED *** WELCOME TO THE NET ***</text>
${TABS.map(
  ({ x, w, label, fill }) =>
    `<rect x="${x}" y="70" width="${w}" height="20" fill="${fill}" stroke="#0d0221" stroke-width="2"/><text class="tab-label" x="${x + 8}" y="84">${label}</text>`,
).join('\n')}
<rect y="90" width="1600" height="2" fill="#ff2fb3"/>
${star(1380, 40, 14, '#39ff14')}
${star(1430, 40, 14, '#ffd300')}
${star(1480, 40, 14, '#ff2fb3')}
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

    return <Svg source={BACKDROP} alt="Y2Chaos header: a logo, a scrolling marquee and five tabs" />
  })
}
