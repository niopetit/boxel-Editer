/**
 * Global type definitions for Electron integration
 */

declare global {
  interface Window {
    electron?: {
      ipcRenderer: {
        invoke: (channel: string, args: unknown) => Promise<unknown>
      }
    }
  }
}

export {}
