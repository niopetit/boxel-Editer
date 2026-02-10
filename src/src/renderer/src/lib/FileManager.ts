/**
 * FileManager
 * ファイルI/O処理（GLW形式、GLTF形式）
 * ファイル仕様書に準拠
 */

import { GlwFile, Voxel, PaletteColor, GltfExportOptions, Vector3, Face } from '../types/index'
import { VoxelMesh } from './VoxelMesh'
import { ActionHistory } from './ActionHistory'

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
        gridSizeZ: gridSizeY,
        maxGridX: 50,
        maxGridY: 50,
        maxGrid: 50
      },
      mainObject: {
        gridSizeX,
        gridSizeY,
        gridSizeZ: gridSizeY,
        voxels: [],
        colors: {}
      },
      adjacentObjects: [],
      colorPalette: this.getDefaultColorPalette(),
      undoRedoHistory: []
    }
  }

  /**
   * プロジェクトデータからGLWファイルを作成
   */
  static createGlwFromProject(
    gridSizeX: number,
    gridSizeY: number,
    gridSizeZ: number,
    voxelMesh: VoxelMesh,
    colorMap: Map<string, string>,
    actionHistory: ActionHistory,
    customPalette: PaletteColor[] = []
  ): GlwFile {
    const now = new Date().toISOString()
    const voxels = voxelMesh.getVoxels()
    const colors: { [key: string]: string } = {}

    // 色情報を辞書形式に変換
    colorMap.forEach((color, key) => {
      colors[key] = color
    })

    // アンドゥ履歴を取得
    const undoRedoHistory = actionHistory.getHistory()

    return {
      version: this.CURRENT_VERSION,
      metadata: {
        version: this.CURRENT_VERSION,
        createdAt: now,
        updatedAt: now,
        gridSizeX,
        gridSizeY,
        gridSizeZ,
        maxGridX: 50,
        maxGridY: 50,
        maxGrid: 50
      },
      mainObject: {
        gridSizeX,
        gridSizeY,
        gridSizeZ,
        voxels: Array.from(voxels.values()),
        colors
      },
      adjacentObjects: [],
      colorPalette: customPalette.length > 0 ? customPalette : this.getDefaultColorPalette(),
      undoRedoHistory
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
   * GLWファイルをロードして状態を復元
   */
  static restoreProjectFromGlw(glwFile: GlwFile, voxelMesh: VoxelMesh, actionHistory: ActionHistory): {
    gridSize: { x: number; y: number; z: number }
    palette: PaletteColor[]
  } | null {
    try {
      // グリッドサイズを復元
      const gridSize = {
        x: glwFile.metadata.gridSizeX,
        y: glwFile.metadata.gridSizeY,
        z: glwFile.metadata.gridSizeZ || glwFile.metadata.gridSizeY
      }

      // ボクセルデータを復元
      const voxels = glwFile.mainObject.voxels
      for (const voxel of voxels) {
        // VoxelSnapshot形式に変換
        const snapshot = {
          position: voxel.position,
          vertices: voxel.vertices,
          faces: voxel.faces,
          colors: {}
        }
        voxelMesh.restoreVoxel(voxel.id, snapshot)
      }

      // 色情報を復元
      const colorMap = glwFile.mainObject.colors
      for (const key of Object.keys(colorMap)) {
        const [voxelId, faceId] = key.split('_')
        if (voxelId && faceId) {
          voxelMesh.colorSpecificFace(voxelId, faceId, colorMap[key])
        }
      }

      // アンドゥ履歴を復元
      const history = glwFile.undoRedoHistory || []
      for (const action of history) {
        actionHistory.restoreAction(action)
      }

      // カラーパレットを復元
      const palette = glwFile.colorPalette || this.getDefaultColorPalette()

      return {
        gridSize,
        palette
      }
    } catch (error) {
      console.error('Failed to restore project from GLW:', error)
      return null
    }
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

      // IPC通信を使用してファイルを保存
      if (window.api) {
        await window.api.saveProjectFile(filePath, jsonString)
        return true
      } else {
        // フォールバック: localStorage に保存
        localStorage.setItem(`glw_${Date.now()}`, jsonString)
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

      if (window.api) {
        content = await window.api.loadProjectFile(filePath)
      } else {
        // フォールバック: localStorage から読み込み
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

    // gridSizeZが存在しない場合は、gridSizeYで初期化
    if (!glwFile.metadata.gridSizeZ) {
      glwFile.metadata.gridSizeZ = glwFile.metadata.gridSizeY
    }
    if (!glwFile.mainObject.gridSizeZ) {
      glwFile.mainObject.gridSizeZ = glwFile.mainObject.gridSizeY
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
  static async exportGltf(filePath: string, voxels: Map<string, Voxel>, colorMap: Map<string, string>, options: GltfExportOptions = { format: 'gltf' }): Promise<boolean> {
    try {
      // 仕様準拠のGLTF構造を作成
      const gltfData = this.createGltfStructure(voxels, colorMap)

      const gltfString = JSON.stringify(gltfData, null, 2)

      if (window.electron) {
        await window.electron.ipcRenderer.invoke('save-gltf-file', {
          filePath,
          content: gltfString,
          format: options.format
        })
        return true
      } else {
        localStorage.setItem(`gltf_${Date.now()}`, gltfString)
        return true
      }
    } catch (error) {
      console.error('Failed to export GLTF file:', error)
      return false
    }
  }

  /**
   * GLTFデータを作成（公開メソッド）
   */
  static createGltfData(voxels: Map<string, Voxel>, colorMap: Map<string, string> = new Map()): any {
    return this.createGltfStructure(voxels, colorMap)
  }

  /**
   * 隣接ボクセルが存在するかチェック
   */
  private static hasAdjacentVoxel(voxels: Map<string, Voxel>, pos: Vector3, normal: string): boolean {
    let checkPos: Vector3
    switch (normal) {
      case 'x+': checkPos = { x: pos.x + 1, y: pos.y, z: pos.z }; break
      case 'x-': checkPos = { x: pos.x - 1, y: pos.y, z: pos.z }; break
      case 'y+': checkPos = { x: pos.x, y: pos.y + 1, z: pos.z }; break
      case 'y-': checkPos = { x: pos.x, y: pos.y - 1, z: pos.z }; break
      case 'z+': checkPos = { x: pos.x, y: pos.y, z: pos.z + 1 }; break
      case 'z-': checkPos = { x: pos.x, y: pos.y, z: pos.z - 1 }; break
      default: return false
    }
    
    // すべてのボクセルをチェック
    for (const voxel of voxels.values()) {
      if (voxel.position.x === checkPos.x && 
          voxel.position.y === checkPos.y && 
          voxel.position.z === checkPos.z) {
        return true
      }
    }
    return false
  }

  /**
   * 法線文字列からVec3に変換
   */
  private static normalToVec3(normal: string): [number, number, number] {
    switch (normal) {
      case 'x+': return [1, 0, 0]
      case 'x-': return [-1, 0, 0]
      case 'y+': return [0, 1, 0]
      case 'y-': return [0, -1, 0]
      case 'z+': return [0, 0, 1]
      case 'z-': return [0, 0, -1]
      default: return [0, 1, 0]
    }
  }

  /**
   * HEXカラーをRGBに変換（0-1の範囲）
   */
  private static hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (result) {
      return [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
      ]
    }
    return [0.8, 0.8, 0.8] // デフォルトグレー
  }

  /**
   * GLTF構造を作成（仕様準拠版）
   * - 頂点統合: 同一座標上の重複頂点は自動的に排除
   * - 面情報: ポリゴンインデックスと法線情報
   * - 外部頂点のみ: 内部に露出しない頂点は削除される
   * - マテリアル: フェイスカラー対応
   */
  private static createGltfStructure(voxels: Map<string, Voxel>, colorMap: Map<string, string>): any {
    
    const asset = {
      generator: 'Boxel Editor',
      version: '2.0'
    }

    if (voxels.size === 0) {
      // 空のGLTF
      return {
        asset,
        scene: 0,
        scenes: [{ nodes: [] }],
        nodes: [],
        meshes: [],
        buffers: [],
        bufferViews: [],
        accessors: []
      }
    }

    // 色ごとにグループ化（マテリアル分け）
    const colorGroups: Map<string, Array<{ voxel: Voxel; face: Face }>> = new Map()
    const defaultColor = '#CCCCCC'
    let totalFaces = 0
    let skippedFaces = 0

    voxels.forEach(voxel => {
      voxel.faces.forEach(face => {
        totalFaces++
        // 内部面をスキップ（隣接ボクセルがある面）
        if (this.hasAdjacentVoxel(voxels, voxel.position, face.normal)) {
          skippedFaces++
          return
        }

        // 面の色を取得
        const colorKey = `${voxel.id}_${face.id}`
        const faceColor = colorMap.get(colorKey) || face.color || defaultColor

        if (!colorGroups.has(faceColor)) {
          colorGroups.set(faceColor, [])
        }
        colorGroups.get(faceColor)!.push({ voxel, face })
      })
    })


    // 頂点カラーを使用するため、頂点ごとにデータを生成（重複を許容）
    const allPositions: number[] = []
    const allNormals: number[] = []
    const allColors: number[] = []  // 頂点カラー（RGB、各0-1）
    const allIndices: number[] = []
    
    let vertexIndex = 0

    colorGroups.forEach((faces, color) => {
      const rgb = this.hexToRgb(color)
      
      faces.forEach(({ voxel, face }) => {
        const normal = this.normalToVec3(face.normal)
        
        // 面の4頂点を取得
        const faceVertices: Array<{ x: number; y: number; z: number }> = []
        face.vertexIds.forEach(vertexId => {
          const vertex = voxel.vertices.find(v => v.id === vertexId)
          if (vertex) {
            faceVertices.push({ x: vertex.x, y: vertex.y, z: vertex.z })
          }
        })

        if (faceVertices.length < 3) return

        // 各頂点を追加（頂点カラー付き）
        const startIndex = vertexIndex
        faceVertices.forEach(v => {
          allPositions.push(v.x, v.y, v.z)
          allNormals.push(normal[0], normal[1], normal[2])
          allColors.push(rgb[0], rgb[1], rgb[2])  // 面の色を頂点カラーとして設定
          vertexIndex++
        })

        // 三角形化（quad -> 2 triangles）
        // 法線の方向によって頂点順序を変える
        // プラス方向（x+, y+, z+）は反時計回り、マイナス方向（x-, y-, z-）は時計回り
        const isNegativeNormal = face.normal.endsWith('-')
        
        if (faceVertices.length >= 3) {
          if (isNegativeNormal) {
            allIndices.push(startIndex, startIndex + 1, startIndex + 2)
          } else {
            allIndices.push(startIndex, startIndex + 2, startIndex + 1)
          }
        }
        if (faceVertices.length >= 4) {
          if (isNegativeNormal) {
            allIndices.push(startIndex, startIndex + 2, startIndex + 3)
          } else {
            allIndices.push(startIndex, startIndex + 3, startIndex + 2)
          }
        }
      })
    })


    if (allPositions.length === 0) {
      return {
        asset,
        scene: 0,
        scenes: [{ nodes: [] }],
        nodes: [],
        meshes: [],
        materials: [],
        buffers: [],
        bufferViews: [],
        accessors: []
      }
    }

    // バイナリデータをFloat32Array/Uint32Arrayに変換
    const positionData = new Float32Array(allPositions)
    const normalData = new Float32Array(allNormals)
    const colorData = new Float32Array(allColors)
    const indexData = new Uint32Array(allIndices)

    const positionBytes = new Uint8Array(positionData.buffer)
    const normalBytes = new Uint8Array(normalData.buffer)
    const colorBytes = new Uint8Array(colorData.buffer)
    const indexBytes = new Uint8Array(indexData.buffer)

    // すべてのデータを結合
    const totalLength = positionBytes.length + normalBytes.length + colorBytes.length + indexBytes.length
    const combinedBuffer = new Uint8Array(totalLength)
    let offset = 0
    combinedBuffer.set(positionBytes, offset); offset += positionBytes.length
    combinedBuffer.set(normalBytes, offset); offset += normalBytes.length
    combinedBuffer.set(colorBytes, offset); offset += colorBytes.length
    combinedBuffer.set(indexBytes, offset)

    // Base64エンコード
    const base64Data = this.uint8ArrayToBase64(combinedBuffer)

    // バウンディングボックスを計算
    let minX = Infinity, minY = Infinity, minZ = Infinity
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
    for (let i = 0; i < allPositions.length; i += 3) {
      minX = Math.min(minX, allPositions[i])
      maxX = Math.max(maxX, allPositions[i])
      minY = Math.min(minY, allPositions[i + 1])
      maxY = Math.max(maxY, allPositions[i + 1])
      minZ = Math.min(minZ, allPositions[i + 2])
      maxZ = Math.max(maxZ, allPositions[i + 2])
    }

    // BufferViews
    const bufferViews = [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: positionBytes.length,
        target: 34962 // ARRAY_BUFFER
      },
      {
        buffer: 0,
        byteOffset: positionBytes.length,
        byteLength: normalBytes.length,
        target: 34962 // ARRAY_BUFFER
      },
      {
        buffer: 0,
        byteOffset: positionBytes.length + normalBytes.length,
        byteLength: colorBytes.length,
        target: 34962 // ARRAY_BUFFER
      },
      {
        buffer: 0,
        byteOffset: positionBytes.length + normalBytes.length + colorBytes.length,
        byteLength: indexBytes.length,
        target: 34963 // ELEMENT_ARRAY_BUFFER
      }
    ]

    const vertexCount = allPositions.length / 3

    // Accessors
    const accessors = [
      {
        bufferView: 0,
        componentType: 5126, // FLOAT
        count: vertexCount,
        type: 'VEC3',
        min: [minX, minY, minZ],
        max: [maxX, maxY, maxZ]
      },
      {
        bufferView: 1,
        componentType: 5126, // FLOAT
        count: vertexCount,
        type: 'VEC3'
      },
      {
        bufferView: 2,
        componentType: 5126, // FLOAT
        count: vertexCount,
        type: 'VEC3'
      },
      {
        bufferView: 3,
        componentType: 5125, // UNSIGNED_INT
        count: allIndices.length,
        type: 'SCALAR'
      }
    ]

    // 単一メッシュ（頂点カラー付き）
    const meshes = [{
      primitives: [{
        attributes: {
          POSITION: 0,
          NORMAL: 1,
          COLOR_0: 2
        },
        indices: 3,
        material: 0,
        mode: 4 // TRIANGLES
      }]
    }]

    // マテリアル（頂点カラーを使用するため、baseColorFactorは白）
    const materials = [{
      pbrMetallicRoughness: {
        baseColorFactor: [1.0, 1.0, 1.0, 1.0],
        metallicFactor: 0.0,
        roughnessFactor: 0.8
      },
      name: 'VertexColorMaterial'
    }]


    return {
      asset,
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0, name: 'VoxelMesh' }],
      meshes,
      materials,
      buffers: [{
        uri: `data:application/octet-stream;base64,${base64Data}`,
        byteLength: totalLength
      }],
      bufferViews,
      accessors
    }
  }

  /**
   * Uint8ArrayをBase64文字列に変換
   */
  private static uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = ''
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
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
