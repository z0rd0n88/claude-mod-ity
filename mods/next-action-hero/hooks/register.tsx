import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Choices } from '../types'

// The choices Claude's last answer offered, each one the exact text a click sends.
const choices = atom({ plugin: 'next-action-hero', key: 'choices' } as const, [] as Choices)

const MAX = 8
// A button shows its whole text, the exact prompt a click sends; a longer choice is dropped, never cut.
const MAX_CHARS = 160

// A yes/no question opens with one of these.
const YES_NO = /^(?:should|shall|can|may) (?:i|we)\b|^(?:want|ok|okay) (?:me )?to\b|^(?:do|would) you (?:want|like)\b|^ready (?:for me )?to\b/i
// The words that lead an inline "pick A, B, or C". Not a bare "between": prose uses it for ranges.
const PICK = /\b(?:pick|choose|select|decide)\b(?:\s+(?:one|one of|from|between))?\s*:?\s+(?:options?\s+)?(.+)$/i
// Say "push" -> push. Not "says": that quotes something else.
const SAY = /\bsay\s+["“]([^"”\n]{1,60})["”]/gi
const LIST_ITEM = /^\s*(?:[-*+•]|\d+[.)])\s+(.+)$/
// A line that introduces the list under it as choices: it ends in ? or :, and a : line names a decision.
const LIST_CUE = /\?\s*$|\b(?:options?|choose|pick|decide|decisions?|still open|waiting on you|your call)\b.*:\s*$/i

/** Markdown down to the words a person reads. */
function plain(s: string): string {
  return s
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*|__/g, '')
    .replace(/^[*_]+|[*_]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function sentences(line: string): string[] {
  return line.split(/(?<=[.?!])\s+(?=[A-Z"“])/).map(s => s.trim()).filter(Boolean)
}

/** "A, B, and C" / "A or B" -> its parts, or [] when it is not a short list. */
function splitOptions(s: string): string[] {
  const parts = s
    .replace(/[.?!:]+$/, '')
    .split(/\s*,\s*(?:and\s+|or\s+)?|\s+(?:or|and)\s+/i)
    .map(p => p.trim())
    .filter(Boolean)
  return parts.length >= 2 && parts.every(p => p.split(' ').length <= 6) ? parts : []
}

/** Every choice the answer offers, in reading order, de-duplicated. */
export function findChoices(answer: string): string[] {
  const lines = answer.replace(/```[\s\S]*?```/g, '').split('\n')
  const out: string[] = []
  const add = (s: string): void => {
    const t = plain(s.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, ' '))
    if (t && t.length <= MAX_CHARS && !out.some(o => o.toLowerCase() === t.toLowerCase())) out.push(t)
  }

  let intro = ''
  let listIsChoice = false
  lines.forEach((raw, i) => {
    const line = raw.trim()
    if (!line) return
    const item = LIST_ITEM.exec(raw)
    if (item) {
      if (!intro) {
        // A list that opens a run decides once, from the line above it, or from being the answer's end.
        const before = lines.slice(0, i).reverse().find(l => l.trim()) ?? ''
        listIsChoice = LIST_CUE.test(before)
        intro = before || '(start)'
      }
      if (listIsChoice) add(item[1]!)
      return
    }
    intro = ''

    const said = [...line.matchAll(SAY)].map(m => m[1]!)
    said.forEach(add)

    const next = /^\W*next\W*:\W*\s*(.+)$/i.exec(line)
    if (next && !said.length && !/:\s*$/.test(line)) add(sentences(next[1]!.replace(/^\W+/, ''))[0]!)

    for (const s of sentences(plain(line))) {
      const pick = PICK.exec(s)
      const opts = pick ? splitOptions(pick[1]!) : []
      if (opts.length) opts.forEach(add)
      else if (s.endsWith('?') && YES_NO.test(s)) {
        add('Yes')
        add('No')
      }
    }
  })
  return out.slice(0, MAX)
}

async function choose($: EngineInterface, text: string): Promise<void> {
  await update($, choices, () => [])
  await $.prompt.submit({ text, asUser: true })
}

export const register: Register = on => {
  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      await update($, choices, () => (e.reason === 'answer' ? findChoices(e.answer) : []))
    }
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await update($, choices, () => [])
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const list = await read($, choices)
    if (!list.length || e.props.hasSurvey || e.props.isWorking) return below
    const { Box, Button } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        <Box flexWrap="wrap" gap={1}>
          {list.map((c, i) => (
            <Button key={`choice-${i}`} label={c} onPress={() => void choose($, c)} />
          ))}
        </Box>
        {below}
      </Box>
    )
  })
}
