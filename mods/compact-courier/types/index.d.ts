export type Busy = boolean

declare module 'claude-code' {
  interface PluginState {
    'compact-courier': { busy: Shaped<Busy> }
  }
}
