import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

interface SavedColor {
  id: string
  hex: string
  name: string
}

// Custom APIs for renderer
const api = {
  // カラーパレットのデータをファイルに保存
  savePaletteData: (colors: SavedColor[]): Promise<void> => {
    return ipcRenderer.invoke('save-palette', colors)
  },
  // ファイルからカラーパレットのデータを読み込む
  loadPaletteData: (): Promise<SavedColor[]> => {
    return ipcRenderer.invoke('load-palette')
  },
  // プロジェクトファイルを保存
  saveProjectFile: (filePath: string, content: string): Promise<void> => {
    return ipcRenderer.invoke('save-project', { filePath, content })
  },
  // プロジェクトファイルを読み込む
  loadProjectFile: (filePath: string): Promise<string> => {
    return ipcRenderer.invoke('load-project', filePath)
  },
  // ファイル選択ダイアログを開く（保存）
  showSaveDialog: (defaultPath?: string): Promise<{ filePath: string; canceled: boolean }> => {
    return ipcRenderer.invoke('show-save-dialog', { defaultPath })
  },
  // ファイル選択ダイアログを開く（読み込み）
  showOpenDialog: (defaultPath?: string): Promise<{ filePaths: string[]; canceled: boolean }> => {
    return ipcRenderer.invoke('show-open-dialog', { defaultPath })
  },
  // GLTFエクスポートダイアログを開く
  showExportDialog: (defaultPath?: string): Promise<{ filePath: string; canceled: boolean }> => {
    return ipcRenderer.invoke('show-export-dialog', defaultPath || 'model.gltf')
  },
  // GLTFファイルを保存
  saveGltfFile: (filePath: string, content: string): Promise<boolean> => {
    return ipcRenderer.invoke('save-gltf-file', { filePath, content })
  },
  // GLTFファイル選択ダイアログを開く（インポート用）
  showGltfOpenDialog: (): Promise<{ filePaths: string[]; canceled: boolean }> => {
    return ipcRenderer.invoke('show-gltf-open-dialog')
  },
  // GLTFファイルを読み込み
  loadGltfFile: (filePath: string): Promise<{ data: string; extension: string; filePath: string } | null> => {
    return ipcRenderer.invoke('load-gltf-file', filePath)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
