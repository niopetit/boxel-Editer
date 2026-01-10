/**
 * FileManager
 * ファイルI/O処理（GLW形式、GLTF形式）
 * ファイル仕様書に準拠
 */

import { GlwFile, Voxel, PaletteColor, GltfExportOptions } from '../types/index'

export class FileManager {
  private static readonly CURRENT_VERSION = '1.0.0'
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  /**
   * GLWテンプレートを作成
   */
  static createGlwTemplate(gridSizeX: number, gridSizeY: number): GlwFile {
    const now = new Date().toISOString()

    return {
      version: this.CURRENT_VERSION,
      metadata: {
        version: this.CURRENT_VERSION,
        createdAt: now,
        updatedAt: now,
        gridSizeX,
        gridSizeY,
        maxGridX: 50,
        maxGridY: 50
      },
      mainObject: {
        gridSizeX,
        gridSizeY,
        voxels: [],
        colors: {}
      },
      adjacentObjects: [],
      camera: {
        position: { x: 30, y: 30, z: 40 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        zoom: 1,
        target: { x: 0, y: 0, z: 0 }
      },
      colorPalette: this.getDefaultColorPalette(),
      undoRedoHistory: []
    }
  }

  /**
   * デフォルトカラーパレットを取得
   */
  private static getDefaultColorPalette(): PaletteColor[] {
    return [
      { id: 'color_red', name: 'Red', hex: '#FF0000', rgb: { r: 255, g: 0, b: 0 }, custom: false },
      { id: 'color_green', name: 'Green', hex: '#00FF00', rgb: { r: 0, g: 255, b: 0 }, custom: false },
      { id: 'color_blue', name: 'Blue', hex: '#0000FF', rgb: { r: 0, g: 0, b: 255 }, custom: false },
      { id: 'color_yellow', name: 'Yellow', hex: '#FFFF00', rgb: { r: 255, g: 255, b: 0 }, custom: false },
      { id: 'color_cyan', name: 'Cyan', hex: '#00FFFF', rgb: { r: 0, g: 255, b: 255 }, custom: false },
      { id: 'color_magenta', name: 'Magenta', hex: '#FF00FF', rgb: { r: 255, g: 0, b: 255 }, custom: false },
      { id: 'color_white', name: 'White', hex: '#FFFFFF', rgb: { r: 255, g: 255, b: 255 }, custom: false },
      { id: 'color_black', name: 'Black', hex: '#000000', rgb: { r: 0, g: 0, b: 0 }, custom: false },
      { id: 'color_gray', name: 'Gray', hex: '#808080', rgb: { r: 128, g: 128, b: 128 }, custom: false }
    ]
  }

  /**
   * GLWファイルを保存
   */
  static async saveGlw(filePath: string, glwFile: GlwFile): Promise<boolean> {
    try {
      // メタデータを更新
      glwFile.metadata.updatedAt = new Date().toISOString()

      // JSONにシリアライズ
      const jsonString = JSON.stringify(glwFile, null, 2)

      // ファイルサイズをチェック
      if (jsonString.length > this.MAX_FILE_SIZE) {
        console.error('File size exceeds maximum limit:', jsonString.length)
        return false
      }

      // Electronのメインプロセスを通じてファイルを保存
      if (window.electron) {
        await window.electron.ipcRenderer.invoke('save-glw-file', {
          filePath,
          content: jsonString
        })
        console.log('GLW file saved:', filePath)
        return true
      } else {
        // 開発環境やテスト環境ではローカルストレージに保存
        localStorage.setItem(`glw_${Date.now()}`, jsonString)
        console.log('GLW file saved to localStorage')
        return true
      }
    } catch (error) {
      console.error('Failed to save GLW file:', error)
      return false
    }
  }

  /**
   * GLWファイルを読み込み
   */
  static async loadGlw(filePath: string): Promise<GlwFile | null> {
    try {
      let content: string

      if (window.electron) {
        content = (await window.electron.ipcRenderer.invoke('load-glw-file', filePath)) as string
      } else {
        // 開発環境ではローカルストレージから読み込み
        const saved = localStorage.getItem(`glw_${filePath}`)
        if (!saved) {
          console.error('File not found:', filePath)
          return null
        }
        content = saved
      }

      // JSONをパース
      const glwFile = JSON.parse(content) as GlwFile

      // バージョン互換性をチェック
      if (!this.isVersionCompatible(glwFile.version)) {
        console.warn('File version may not be compatible:', glwFile.version)
        // マイグレーション処理
        this.migrateGlwFile(glwFile)
      }

      // スキーマを検証
      if (!this.validateGlwSchema(glwFile)) {
        console.error('Invalid GLW file schema')
        return null
      }

      console.log('GLW file loaded:', filePath)
      return glwFile
    } catch (error) {
      console.error('Failed to load GLW file:', error)
      return null
    }
  }

  /**
   * バージョンの互換性をチェック
   */
  private static isVersionCompatible(version: string): boolean {
    // セマンティックバージョニングで互換性をチェック
    const current = this.parseVersion(this.CURRENT_VERSION)
    const file = this.parseVersion(version)

    // メジャーバージョンが同じなら互換性あり
    return current.major === file.major
  }

  /**
   * バージョン文字列をパース
   */
  private static parseVersion(version: string): { major: number; minor: number; patch: number } {
    const parts = version.split('.')
    return {
      major: parseInt(parts[0], 10) || 0,
      minor: parseInt(parts[1], 10) || 0,
      patch: parseInt(parts[2], 10) || 0
    }
  }

  /**
   * GLWファイルをマイグレーション（旧バージョン→新バージョン）
   */
  private static migrateGlwFile(glwFile: GlwFile): void {
    // バージョン1.0.0から1.1.0への移行
    if (!glwFile.adjacentObjects) {
      glwFile.adjacentObjects = []
    }

    // メタデータにmaxGridを追加
    if (!glwFile.metadata.maxGridX) {
      glwFile.metadata.maxGridX = 50
    }
    if (!glwFile.metadata.maxGridY) {
      glwFile.metadata.maxGridY = 50
    }

    glwFile.version = this.CURRENT_VERSION
  }

  /**
   * GLWファイルのスキーマを検証
   */
  private static validateGlwSchema(glwFile: any): boolean {
    // 必須フィールドをチェック
    if (!glwFile.version || !glwFile.metadata || !glwFile.mainObject) {
      return false
    }

    if (!Array.isArray(glwFile.mainObject.voxels)) {
      return false
    }

    if (typeof glwFile.mainObject.colors !== 'object') {
      return false
    }

    if (!Array.isArray(glwFile.colorPalette)) {
      return false
    }

    if (!Array.isArray(glwFile.undoRedoHistory)) {
      return false
    }

    return true
  }

  /**
   * GLTFファイルをエクスポート
   */
  static async exportGltf(filePath: string, voxels: Map<string, Voxel>, options: GltfExportOptions = { format: 'gltf' }): Promise<boolean> {
    try {
      // 簡易的なGLTF構造を作成
      const gltfData = this.createGltfStructure(voxels)

      const gltfString = JSON.stringify(gltfData, null, 2)

      if (window.electron) {
        await window.electron.ipcRenderer.invoke('save-gltf-file', {
          filePath,
          content: gltfString,
          format: options.format
        })
        console.log('GLTF file exported:', filePath)
        return true
      } else {
        localStorage.setItem(`gltf_${Date.now()}`, gltfString)
        console.log('GLTF file exported to localStorage')
        return true
      }
    } catch (error) {
      console.error('Failed to export GLTF file:', error)
      return false
    }
  }

  /**
   * GLTF構造を作成
   */
  private static createGltfStructure(voxels: Map<string, Voxel>): any {
    const asset = {
      generator: 'Boxel Editor',
      version: '2.0'
    }

    const scene = {
      nodes: [0]
    }

    const scenes = [scene]
    const nodes = [{ mesh: 0 }]

    // メッシュの作成
    const positions: number[] = []
    const indices: number[] = []

    let vertexIndex = 0
    voxels.forEach(voxel => {
      voxel.faces.forEach(face => {
        face.vertexIds.forEach(vertexId => {
          const vertex = voxel.vertices.find(v => v.id === vertexId)
          if (vertex) {
            positions.push(vertex.x, vertex.y, vertex.z)
            indices.push(vertexIndex++)
          }
        })
      })
    })

    const meshes = [
      {
        primitives: [
          {
            attributes: {
              POSITION: 0
            },
            indices: 1
          }
        ]
      }
    ]

    const bufferViews = [
      {
        buffer: 0,
        byteLength: positions.length * 4,
        target: 34962
      },
      {
        buffer: 0,
        byteLength: indices.length * 4,
        byteOffset: positions.length * 4,
        target: 34963
      }
    ]

    const accessors = [
      {
        bufferView: 0,
        componentType: 5126, // FLOAT
        count: positions.length / 3,
        type: 'VEC3'
      },
      {
        bufferView: 1,
        componentType: 5125, // UNSIGNED_INT
        count: indices.length,
        type: 'SCALAR'
      }
    ]

    const buffer = {
      byteLength: positions.length * 4 + indices.length * 4
    }

    return {
      asset,
      scene: 0,
      scenes,
      nodes,
      meshes,
      buffers: [buffer],
      bufferViews,
      accessors
    }
  }

  /**
   * 相対パスを解決
   */
  static resolveRelativePath(basePath: string, relativePath: string): string {
    // 簡易的な実装
    const baseParts = basePath.split('/')
    baseParts.pop() // ファイル名を削除
    const relParts = relativePath.split('/')

    relParts.forEach(part => {
      if (part === '..') {
        baseParts.pop()
      } else if (part !== '.') {
        baseParts.push(part)
      }
    })

    return baseParts.join('/')
  }

  /**
   * 相対パスを作成
   */
  static createRelativePath(fromPath: string, toPath: string): string {
    const fromParts = fromPath.split('/').slice(0, -1)
    const toParts = toPath.split('/')

    // 共通部分を見つける
    let commonLength = 0
    for (let i = 0; i < Math.min(fromParts.length, toParts.length); i++) {
      if (fromParts[i] === toParts[i]) {
        commonLength = i + 1
      } else {
        break
      }
    }

    // 相対パスを作成
    const upCount = fromParts.length - commonLength
    const downParts = toParts.slice(commonLength)

    const relParts: string[] = []
    for (let i = 0; i < upCount; i++) {
      relParts.push('..')
    }
    relParts.push(...downParts)

    return relParts.join('/')
  }
}
