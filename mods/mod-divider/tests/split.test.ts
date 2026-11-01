import { expect, test } from 'claude-code/testing'

import { withDividers } from '../hooks/split'

const col = (...children: unknown[]) => ({ type: 'Box', props: { flexDirection: 'column' }, children })
const row = (text: string) => ({ type: 'Box', props: { flexDirection: 'row' }, children: [text] })
const rule = () => 'RULE'

test('a divider goes between mods nested last and first, as the band stacks them', () => {
  const sessions = col(col(row('prompt')), row('sessions'))
  const tree = col(row('status'), sessions)
  expect(withDividers(tree, rule)).toEqual(col(row('status'), 'RULE', col(col(row('prompt')), 'RULE', row('sessions'))))
})

test('one mod, a keyed row and core\'s own drawing get no divider', () => {
  const keyed = { type: 'Box', props: { flexDirection: 'column', key: 'peer:1' }, children: [] }
  expect(withDividers(col(row('a'), keyed), rule)).toEqual(col(row('a'), keyed))
  expect(withDividers(col(row('a')), rule)).toEqual(col(row('a')))
  const engine = { type: 'engine', ref: 0 }
  expect(withDividers(engine, rule)).toEqual(engine)
})
