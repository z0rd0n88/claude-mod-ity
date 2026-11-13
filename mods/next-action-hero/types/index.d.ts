export type Choices = readonly string[]

declare module 'claude-code' {
  interface PluginState {
    'next-action-hero': { choices: Choices }
  }
}
