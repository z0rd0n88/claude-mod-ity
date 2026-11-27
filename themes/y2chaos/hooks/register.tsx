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
  // The panels are see-through so the margin art shows behind them. There is no blur, which would smear them.
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

// Always the night palette: the cream day was too hard to read against the margin art. Only builds that take a
// style know this attribute, so it rides with the style and an older build still gets the look in whatever mode it is in.
const FULL = { ...PLAIN, style: STYLE, overrideColorScheme: 'dark' as const }

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

// A green alien head, the one on every 1998 bumper sticker and screensaver: an upside-down teardrop with black
// almond eyes. It tilts a little, like clip art pasted in by hand.
function alien(cx: number, cy: number, s: number, tilt: number): string {
  const p = (x: number, y: number) => `${(cx + x * s).toFixed(1)},${(cy + y * s).toFixed(1)}`
  const eye = (side: 1 | -1) =>
    `<ellipse cx="${(cx + side * 17 * s).toFixed(1)}" cy="${(cy + 2 * s).toFixed(1)}" rx="${(15 * s).toFixed(1)}" ry="${(8 * s).toFixed(1)}" fill="#0d0221" transform="rotate(${side * 32} ${(cx + side * 17 * s).toFixed(1)} ${(cy + 2 * s).toFixed(1)})"/>` +
    `<circle cx="${(cx + side * 13 * s).toFixed(1)}" cy="${(cy - 1 * s).toFixed(1)}" r="${(2.5 * s).toFixed(1)}" fill="#ffffff"/>`

  return (
    `<g transform="rotate(${tilt} ${cx} ${cy})">` +
    `<path d="M${p(0, -52)} C${p(50, -52)} ${p(52, 4)} ${p(22, 36)} Q${p(0, 58)} ${p(-22, 36)} C${p(-52, 4)} ${p(-50, -52)} ${p(0, -52)} Z" fill="#39ff14" stroke="#ff2fb3" stroke-width="${(4 * s).toFixed(1)}"/>` +
    `<ellipse cx="${(cx - 16 * s).toFixed(1)}" cy="${(cy - 32 * s).toFixed(1)}" rx="${(10 * s).toFixed(1)}" ry="${(5 * s).toFixed(1)}" fill="#ffffff" fill-opacity="0.5"/>` +
    eye(-1) +
    eye(1) +
    `<path d="M${p(-5, 32)} Q${p(0, 35)} ${p(5, 32)}" fill="none" stroke="#0a7d1f" stroke-width="${(2 * s).toFixed(1)}"/>` +
    `</g>`
  )
}

// Text in a margin column, centered on it. Lines stack downwards from y.
function words(cx: number, y: number, cls: string, lines: string[], step = 20): string {
  return lines.map((line, i) => `<text class="${cls}" x="${cx}" y="${y + i * step}" text-anchor="middle">${line}</text>`).join('')
}

// The hit counter every homepage had: green digits in black odometer boxes.
function counter(cx: number, y: number, digits: string): string {
  const w = 18
  const left = cx - (digits.length * w) / 2
  let out = words(cx, y, 'tiny', ['YOU ARE VISITOR #'])

  for (let i = 0; i < digits.length; i++) {
    const x = left + i * w
    out += `<rect x="${x}" y="${y + 6}" width="${w - 2}" height="22" fill="#000000" stroke="#8f7fb8"/><text class="digit" x="${x + 8}" y="${y + 23}" text-anchor="middle">${digits[i]}</text>`
  }

  return out
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

// A yin-yang in alien green and night purple, the one on every skate deck and choker in 1998.
function yinYang(cx: number, cy: number, r: number): string {
  const h = r / 2

  return (
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#1a0b3a"/>` +
    `<path d="M${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx} ${cy + r} A${h} ${h} 0 0 1 ${cx} ${cy} A${h} ${h} 0 0 0 ${cx} ${cy - r} Z" fill="#39ff14"/>` +
    `<circle cx="${cx}" cy="${cy - h}" r="${r / 7}" fill="#39ff14"/>` +
    `<circle cx="${cx}" cy="${cy + h}" r="${r / 7}" fill="#1a0b3a"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ff2fb3" stroke-width="3"/>`
  )
}

// The ground is always a deep purple night with faint scanlines, dark enough that the text over it stays readable.
// There is no header: everything lives in the left and right margins, so it only shows in a window wide enough to
// have margins, and the chat in the middle stays clear. Anchored to the top left and sliced, like the panes expect.
const BACKDROP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMinYMin slice">
<style>
.ground { fill: #0b0418; }
.art { opacity: 0.8; }
@media (max-width: 1100px) { .art { display: none; } }
.quote { font: 700 16px "Orbitron", "Eurostile", "OCR A Extended", "Bahnschrift", "Lucida Console", monospace; fill: #39ff14; letter-spacing: 3px; filter: url(#glow); }
.blink { font: 900 13px "Comic Sans MS", "Comic Sans", cursive; fill: #ff2fb3; stroke: #0d0221; stroke-width: 1; paint-order: stroke; animation: blink 1s steps(1) infinite; }
.tiny { font: 700 11px "Courier New", monospace; fill: #39ff14; stroke: #0d0221; stroke-width: 1; paint-order: stroke; }
.digit { font: 700 16px "Courier New", monospace; fill: #39ff14; }
.ring { font: 700 11px "Times New Roman", serif; fill: #00e5ff; stroke: #0d0221; stroke-width: 2; paint-order: stroke; text-decoration: underline; }
@keyframes blink { 50% { opacity: 0; } }
</style>
<defs>
<filter id="glow" x="-20%" y="-50%" width="140%" height="200%">
<feGaussianBlur stdDeviation="2.5" result="blur"/>
<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
<pattern id="scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
<rect width="4" height="1" fill="#000000" fill-opacity="0.35"/>
</pattern>
</defs>
<rect class="ground" width="1600" height="900"/>
<rect width="1600" height="900" fill="url(#scanlines)"/>
<g class="art">
${words(100, 40, 'blink', ['~*~ WeLcOmE 2 My PaGe ~*~'])}
${alien(100, 120, 1, -8)}
${words(100, 210, 'quote', ['THE TRUTH', 'IS OUT THERE'])}
${saucer(100, 280, 0.7)}
${alien(100, 410, 0.8, 10)}
${words(100, 480, 'quote', ['I WANT TO', 'BELIEVE'])}
${counter(100, 540, '000042')}
${alien(100, 650, 0.6, -14)}
${yinYang(100, 740, 36)}
${words(100, 810, 'blink', ['sign my guestbook!!!1!'])}
${words(100, 840, 'tiny', ['(c) 1998 ~*~ no flames plz'])}
${words(1500, 40, 'blink', ['!!! Y2K IS COMING !!!'])}
${alien(1500, 120, 1, 9)}
${words(1500, 210, 'quote', ['TRUST', 'NO ONE'])}
${pixelFace(1464, 260, 12)}
${alien(1500, 410, 0.8, -10)}
${words(1500, 480, 'quote', ['DENY', 'EVERYTHING'])}
${words(1500, 540, 'ring', ['&lt;&lt; prev | X-PHILE WEBRING | next &gt;&gt;'], 18)}
${words(1500, 570, 'tiny', ['you&apos;ve got mail!', 'now playing: spooky_theme.mid'], 16)}
${saucer(1500, 630, 0.6)}
${alien(1500, 740, 0.6, 16)}
${words(1500, 810, 'tiny', ['best viewed in Netscape 4.0', '@ 800x600 w/ 16-bit color'], 16)}
${words(1500, 850, 'blink', ['* SpAcE CaDeT 4 LyFe *'])}
</g>
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

    return <Svg source={BACKDROP} alt="Y2Chaos margins: green alien heads, X-Files taglines, a hit counter and a yin-yang" />
  })
}
