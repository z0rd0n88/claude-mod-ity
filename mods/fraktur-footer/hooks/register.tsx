import type { Register } from 'claude-code'

// Fraktur capitals C H I R Z sit in the letterlike block, not in the gaps of U+1D504..
const CAPITAL_GAPS: Record<string, string> = { C: 'ℭ', H: 'ℌ', I: 'ℑ', R: 'ℜ', Z: 'ℨ' }

// Digits and punctuation have no Fraktur form and pass through.
function fraktur(text: string): string {
  return text.replace(/[A-Za-z]/g, ch =>
    ch >= 'a' ? String.fromCodePoint(0x1d51e + ch.charCodeAt(0) - 97) : (CAPITAL_GAPS[ch] ?? String.fromCodePoint(0x1d504 + ch.charCodeAt(0) - 65)),
  )
}

export const register: Register = on => {
  // The footer's mode labels (`focus`, `memory paused`): rewritten before the engine draws them, so they
  // appear once, in Fraktur, in place. next(e) still runs, so the GH and Compact buttons draw as before.
  // The model name and effort are the app's own text, with no render slot: nothing here can reach them.
  on('ui.render', { component: 'SessionMode' }, async (_$, e, next) =>
    next({ ...e, props: { ...e.props, modes: e.props.modes.map(fraktur) } }),
  )
}
