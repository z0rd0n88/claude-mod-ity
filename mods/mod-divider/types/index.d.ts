export type Config = { enabled: boolean; char: string }

declare module 'claude-code' {
  interface PluginState {
    'mod-divider': { config: Config }
  }
}
