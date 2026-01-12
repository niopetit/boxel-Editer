import { ElectronAPI } from '@electron-toolkit/preload'

interface SavedColor {
  id: string
  hex: string
  name: string
}

interface API {
  savePaletteData: (colors: SavedColor[]) => Promise<void>
  loadPaletteData: () => Promise<SavedColor[]>
  saveProjectFile: (filePath: string, content: string) => Promise<void>
  loadProjectFile: (filePath: string) => Promise<string>
  showSaveDialog: (defaultPath?: string) => Promise<{ filePath: string; canceled: boolean }>
  showOpenDialog: (defaultPath?: string) => Promise<{ filePaths: string[]; canceled: boolean }>
  showExportDialog: (defaultPath?: string) => Promise<{ filePath: string; canceled: boolean }>
  saveGltfFile: (filePath: string, content: string) => Promise<boolean>
  showGltfOpenDialog: () => Promise<{ filePaths: string[]; canceled: boolean }>
  loadGltfFile: (filePath: string) => Promise<{ data: string; extension: string; filePath: string } | null>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
