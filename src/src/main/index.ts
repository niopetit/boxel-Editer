import { app, shell, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import icon from '../../resources/icon.png?asset'

// アプリ名を設定（macOSメニューに反映）- app.ready前に呼び出す
if (process.platform === 'darwin') {
  app.setName('Boxel Editor')
}

let mainWindow: BrowserWindow | null = null

function createMenu(): void {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    // macOSのアプリケーションメニュー
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const, label: 'Boxel Editorについて' },
              { type: 'separator' as const },
              { role: 'hide' as const, label: 'Boxel Editorを隠す' },
              { role: 'hideOthers' as const, label: 'ほかを隠す' },
              { role: 'unhide' as const, label: 'すべてを表示' },
              { type: 'separator' as const },
              { role: 'quit' as const, label: 'Boxel Editorを終了' }
            ]
          }
        ]
      : []),
    // ウィンドウメニュー
    {
      label: 'ウィンドウ',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: 'ズーム' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const, label: '手前に移動' }
            ]
          : [{ role: 'close' as const, label: '閉じる' }])
      ]
    },
    // 開発メニュー（開発モードのみ）
    ...(is.dev
      ? [
          {
            label: '開発',
            submenu: [
              { role: 'reload' as const, label: '再読み込み' },
              { role: 'forceReload' as const, label: '強制再読み込み' },
              { role: 'toggleDevTools' as const, label: '開発者ツール' }
            ]
          }
        ]
      : [])
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createWindow(): void {
  // Create the browser window.
  const window = new BrowserWindow({
    title: 'Boxel Editor',
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false  // GLTFのdata: URI読み込みを許可
    }
  })

  mainWindow = window

  window.on('ready-to-show', () => {
    window.show()
  })

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.boxel.editor')

  // カスタムメニューを設定
  createMenu()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // カラーパレットデータを保存
  ipcMain.handle('save-palette', async (_event, colors) => {
    try {
      const configDir = join(app.getPath('userData'), 'config')
      const paletteFilePath = join(configDir, 'pallet.json')

      // configディレクトリが存在しない場合は作成
      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true })
      }

      // JSONファイルに保存
      writeFileSync(paletteFilePath, JSON.stringify(colors, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to save palette data:', error)
      throw error
    }
  })

  // カラーパレットデータを読み込む
  ipcMain.handle('load-palette', async () => {
    try {
      const configDir = join(app.getPath('userData'), 'config')
      const paletteFilePath = join(configDir, 'pallet.json')

      // ファイルが存在しない場合は空の配列を返す
      if (!existsSync(paletteFilePath)) {
        return []
      }

      // JSONファイルから読み込む
      const data = readFileSync(paletteFilePath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Failed to load palette data:', error)
      return []
    }
  })

  // プロジェクトファイルを保存
  ipcMain.handle('save-project', async (_event, { filePath, content }) => {
    try {
      const dir = filePath.substring(0, filePath.lastIndexOf('/'))
      if (dir && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      writeFileSync(filePath, content, 'utf-8')
      console.log('Project file saved:', filePath)
    } catch (error) {
      console.error('Failed to save project file:', error)
      throw error
    }
  })

  // プロジェクトファイルを読み込む
  ipcMain.handle('load-project', async (_event, filePath) => {
    try {
      if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`)
      }

      const content = readFileSync(filePath, 'utf-8')
      console.log('Project file loaded:', filePath)
      return content
    } catch (error) {
      console.error('Failed to load project file:', error)
      throw error
    }
  })

  // ファイル保存ダイアログ
  ipcMain.handle('show-save-dialog', async (_event, { defaultPath }) => {
    if (!mainWindow) {
      return { filePath: '', canceled: true }
    }

    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultPath || 'project.glw',
      filters: [
        { name: 'Boxel Project', extensions: ['glw'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    return result
  })

  // ファイル開くダイアログ
  ipcMain.handle('show-open-dialog', async (_event, { defaultPath }) => {
    if (!mainWindow) {
      return { filePaths: [], canceled: true }
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      defaultPath: defaultPath || '',
      filters: [
        { name: 'Boxel Project', extensions: ['glw'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    return result
  })

  // GLTFエクスポート用ダイアログ
  ipcMain.handle('show-export-dialog', async (_event, defaultPath) => {
    if (!mainWindow) {
      return { filePath: '', canceled: true }
    }

    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultPath || 'model.gltf',
      filters: [
        { name: 'glTF', extensions: ['gltf'] },
        { name: 'glTF Binary', extensions: ['glb'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })


    return result
  })

  // GLTFファイル選択ダイアログ（インポート用）
  ipcMain.handle('show-gltf-open-dialog', async () => {
    if (!mainWindow) {
      return { filePaths: [], canceled: true }
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      filters: [
        { name: 'glTF Files', extensions: ['gltf', 'glb'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    return result
  })

  // GLTFファイルを読み込み（バイナリデータとして返す）
  ipcMain.handle('load-gltf-file', async (_event, filePath: string) => {
    try {
      const buffer = readFileSync(filePath)
      const base64 = buffer.toString('base64')
      const extension = filePath.toLowerCase().endsWith('.glb') ? 'glb' : 'gltf'
      return { data: base64, extension, filePath }
    } catch (error) {
      console.error('Failed to load GLTF file:', error)
      return null
    }
  })

  // GLTFファイルを保存
  ipcMain.handle('save-gltf-file', async (_event, { filePath, content }) => {
    try {
      const dir = filePath.substring(0, filePath.lastIndexOf('/'))
      if (dir && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      writeFileSync(filePath, content, 'utf-8')
      console.log('GLTF file saved:', filePath)
      return true
    } catch (error) {
      console.error('Failed to save GLTF file:', error)
      throw error
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
