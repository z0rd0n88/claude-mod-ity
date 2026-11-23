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
    expect(findChoices(answer)).toEqual(['Start with VistaMobileBE#1163', 'Start with #1042', 'Start with #1107'])
  })

  test('a list of short options keeps each option', () => {
    expect(findChoices('Which one?\n- merge\n- rebase')).toEqual(['merge', 'rebase'])
  })

  test('a decision with no #ref is picked by its subject, else by its place in the list', () => {
    expect(findChoices('Still open:\n- the logging option needs your pick.\n- #12 needs your call.')).toEqual(['Start with the logging option', 'Start with #12'])
    expect(findChoices('Still open:\n- #12 needs your call.\n- how the logs should rotate.')).toEqual(['Start with #12', 'Start with item 2'])
  })

  test('a "Next:" line gets a reply, never a copy of the line', () => {
    expect(findChoices('Done.\n\nNext: run the migration on staging.')).toEqual(['Done'])
  })

  test('a Next: line naming what Claude will do gets Go ahead', () => {
    const answer = 'Next: when the work unit finishes, I’ll commit its changes and start the review unit. I’ll report phase 4’s result before starting phase 5.'
    expect(findChoices(answer)).toEqual(['Go ahead'])
  })

  test('a Next: line asking you to do something gets Done', () => {
    expect(findChoices('If it stops, tell me which key.\n\nNext: run the command above and tell me when it’s done.')).toEqual(['Done'])
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

  test('screenshot 5: a Next: line Claude offers to do gets Go ahead', () => {
    const answer = [
      'One thing to watch: those scores are close together. Jev scored every chunk between 0.52 and 0.74, all above the 0.2 drop floor.',
      '',
      'Next: tick the last test-plan box on [z0rd0n88/JevDev#73](https://x) — it’s the one that says “After merge”. Or say so and I’ll tick it.',
    ].join('\n')
    expect(findChoices(answer)).toEqual(['Go ahead'])
  })

  test('a choice too long to show whole is dropped, and hidden characters are cleared', () => {
    expect(findChoices(`Which one?\n- ${`${'x'.repeat(30)} `.repeat(6)}`)).toEqual([])
    expect(findChoices(`Still open:\n- ${'the very long '.repeat(5)}option needs your pick.`)).toEqual(['Start with item 1'])
    expect(findChoices('Next: say “go\u202e” and I’ll start.')).toEqual(['go'])
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
    expect(await band.find({ type: 'Button', key: 'choice-0', text: '𝔜𝔢𝔰' })).toBeDefined()
    expect(await band.find({ type: 'Button', key: 'choice-1', text: '𝔑𝔬' })).toBeDefined()

    await band.press({ key: 'choice-0' })
    for (let i = 0; i < 50 && !sent.length; i++) await Promise.resolve()
    expect(sent).toEqual(['Yes'])
    expect(await band.find({ type: 'Button', key: 'choice-0' })).toBeUndefined()
    await band.unmount()
  })

  test('labels are in Fraktur, gap capitals included, while a click sends the plain text', async ($, on) => {
    const sent: string[] = []
    on('turn.complete', () => ({ text: '' }))
    on('prompt.submit', (_, e) => {
      sent.push(e.text)
      return { text: e.text }
    })

    await $.turn.complete({ answer: 'Pick one: Rebase or Close 18.', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })

    const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
    expect(await band.find({ type: 'Button', key: 'choice-0', text: 'ℜ𝔢𝔟𝔞𝔰𝔢' })).toBeDefined()
    expect(await band.find({ type: 'Button', key: 'choice-1', text: 'ℭ𝔩𝔬𝔰𝔢 18' })).toBeDefined()

    await band.press({ key: 'choice-1' })
    for (let i = 0; i < 50 && !sent.length; i++) await Promise.resolve()
    expect(sent).toEqual(['Close 18'])
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
