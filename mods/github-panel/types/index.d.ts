export type Issue = {
  number: number
  title: string
  repo: string
  url: string
  updatedAt: string
}

export type Feed = {
  issues: Issue[]
  error?: string
  fetchedAt?: string
}

declare module 'claude-code' {
  interface PluginState {
    'github-panel': { feed: Shaped<Feed> }
  }
}
