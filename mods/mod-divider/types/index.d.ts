export type Align = 'left' | 'center' | 'right'

export type Config = {
  enabled: boolean
  char: string
  /** Columns to draw, or null to fill the panel. */
  length: number | null
  align: Align
}

declare module 'claude-code' {
  interface PluginState {
    'mod-divider': { config: Config }
  }
}
