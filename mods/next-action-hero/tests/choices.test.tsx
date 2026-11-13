import { describe, expect, test } from 'claude-code/testing'

import { findChoices } from '../hooks/register'

const BAND = {
  plugin: 'next-action-hero',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 20, bodyColumns: 80, scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

describe('findChoices', () => {
  test('a yes/no question gets Yes and No', () => {
    expect(findChoices('The fix is ready on the branch. Should I push it?')).toEqual(['Yes', 'No'])
    expect(findChoices('Want me to open the PR now?')).toEqual(['Yes', 'No'])
  })

  test('an inline "pick A, B, or C" gets one button per option', () => {
    expect(findChoices('Next, select between option A, B, and C.')).toEqual(['A', 'B', 'C'])
    expect(findChoices('Pick one: merge, rebase or squash.')).toEqual(['merge', 'rebase', 'squash'])
  })

  test('a list of open decisions at the end of the answer gets one button per item', () => {
    const answer = [
      'CI on `main` passed. These are still open:',
      '',
      '- [VistaMobileBE#1163](https://x) needs your call: should I fix the cursor 503 bug?',
      '- #1042 needs your pick of logging option.',
      '- #1107 bullet 2 is still waiting on your decision.',
    ].join('\n')
    expect(findChoices(answer)).toEqual([
      'VistaMobileBE#1163 needs your call: should I fix the cursor 503 bug?',
      '#1042 needs your pick of logging option.',
      '#1107 bullet 2 is still waiting on your decision.',
    ])
  })

  test('a "Next:" line gets one button that runs its action', () => {
    expect(findChoices('Done.\n\nNext: run the migration on staging.')).toEqual(['run the migration on staging.'])
  })

  test('a quoted reply to say becomes the button, not the whole Next line', () => {
    expect(findChoices('Next: say “push” and I’ll push the branch and open one PR.')).toEqual(['push'])
    expect(findChoices('Next: say "push and merge" and I’ll open the PR.')).toEqual(['push and merge'])
    expect(findChoices('Every guard fix needs your review. Say “go” and I’ll start on X1.')).toEqual(['go'])
  })

  // The screenshots: each expects exactly what was highlighted yellow.
  test('screenshot 1: a list of what changed is not a choice; only “push” is', () => {
    const answer = [
      'The pruner can now trim normal Bash output: anything over 3,000 estimated tokens, which is about 10,500 characters. This is committed but not live until the branch merges into `main`.',
      '',
      '- **What changed:** `MIN_OUTPUT_TOKENS` went from 10,000 to 3,000 in [pruner/src/output.ts:5](pruner/src/output.ts:5).',
      '- **Tests:** A new test checks that a 14,000-character build log gets trimmed. All 345 pruner tests pass, and `check.sh` passes.',
      '- **Docs:** Updated the limit in the main `README.md`.',
      '',
      'I didn’t remove the `Math.max` floor, which goes against what I proposed. Say so if you want the floor gone anyway.',
      '',
      'Next: say “push” and I’ll push the branch and open one PR covering both fixes.',
    ].join('\n')
    expect(findChoices(answer)).toEqual(['push'])
  })

  test('screenshot 2: a Next: line that lists the work hands the choice to “go”', () => {
    const answer = [
      '**Next:** the guard gaps in [Flutter-mobile-app#94](https://x), starting with its two HIGH items:',
      '',
      '- **X1:** `CONSTRAINTS.md` can be weakened without the guard noticing.',
      '- **X2:** a `//` inside a string hides the rest of the line from the checks.',
      '',
      'Every guard fix turns the floor-guard check red by design and needs your review. Say “go” and I’ll start on X1 and X2 in a new worktree.',
      '',
      'Links:',
      'Flutter-mobile-app#107 — https://x/107',
    ].join('\n')
    expect(findChoices(answer)).toEqual(['go'])
  })

  test('screenshot 5: a Next: line runs its first sentence only', () => {
    const answer = [
      'One thing to watch: those scores are close together. Jev scored every chunk between 0.52 and 0.74, all above the 0.2 drop floor.',
      '',
      'Next: tick the last test-plan box on [z0rd0n88/JevDev#73](https://x) — it’s the one that says “After merge”. Or say so and I’ll tick it.',
    ].join('\n')
    expect(findChoices(answer)).toEqual(['tick the last test-plan box on z0rd0n88/JevDev#73 — it’s the one that says “After merge”.'])
  })

  test('a reply with no question or choices gets nothing', () => {
    const answer = [
      'Scores landed between 0.52 and 0.74.',
      '',
      'Changes:',
      '- the limit went from 10,000 to 3,000.',
      '- all 345 tests pass.',
      '```',
      'Should I? Next: nothing',
      '```',
    ].join('\n')
    expect(findChoices(answer)).toEqual([])
  })
})

describe('the band', () => {
  test('shows the last answer’s choices on Desktop and a click sends one as the prompt', async ($, on) => {
    const sent: string[] = []
    on('turn.complete', () => ({ text: '' }))
    on('prompt.submit', (_, e) => {
      sent.push(e.text)
      return { text: e.text }
    })
    on('ui.render', (_, e) => {
      const { Text } = _.ui.resolve(e)
      return <Text>engine</Text>
    })

    await $.turn.complete({ answer: 'Should I push it?', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })

    const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
    expect(await band.find({ type: 'Button', key: 'choice-0', text: 'Yes' })).toBeDefined()
    expect(await band.find({ type: 'Button', key: 'choice-1', text: 'No' })).toBeDefined()

    await band.press({ key: 'choice-0' })
    for (let i = 0; i < 50 && !sent.length; i++) await Promise.resolve()
    expect(sent).toEqual(['Yes'])
    expect(await band.find({ type: 'Button', key: 'choice-0' })).toBeUndefined()
    await band.unmount()
  })

  test('draws nothing after an answer with no choices, or while Claude is working', async ($, on) => {
    on('turn.complete', () => ({ text: '' }))
    on('ui.render', (_, e) => {
      const { Text } = _.ui.resolve(e)
      return <Text>engine</Text>
    })

    await $.turn.complete({ answer: 'Should I push it?', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
    const working = await $.ui.mount({ ...BAND, props: { ...BAND.props, isWorking: true }, surface: 'desktop' })
    expect(await working.find({ type: 'Button' })).toBeUndefined()
    await working.unmount()

    await $.turn.complete({ answer: 'All tests pass.', durationMs: 1, isAborted: false, turnId: 't2', reason: 'answer' })
    const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
    expect(await band.find({ type: 'Button' })).toBeUndefined()
    await band.unmount()
  })
})
