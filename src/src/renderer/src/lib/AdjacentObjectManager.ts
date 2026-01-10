/**
 * AdjacentObjectManager
 * 隣接オブジェクト（複数配置）の管理
 * 複数オブジェクト配置仕様書に準拠
 */

import { AdjacentObject, Voxel, Vector3, GlwAdjacentObject } from '../types/index'
import { FileManager } from './FileManager'

export class AdjacentObjectManager {
  private adjacentObjects: Map<string, AdjacentObject> = new Map()
  private objectIdCounter: number = 0

  /**
   * 隣接オブジェクトを追加
   */
  async addAdjacentObject(
    filePath: string,
    direction: 'up' | 'down' | 'left' | 'right' | 'front' | 'back',
    mainGridSizeX: number,
    mainGridSizeY: number
  ): Promise<AdjacentObject | null> {
    try {
      // ファイルを読み込み
      const glwFile = await FileManager.loadGlw(filePath)
      if (!glwFile) {
        console.error('Failed to load adjacent object file:', filePath)
        return null
      }

      // 位置を計算
      const position = this.calculateAdjacentPosition(
        { x: mainGridSizeX, y: mainGridSizeY, z: 1 },
        { x: glwFile.mainObject.gridSizeX, y: glwFile.mainObject.gridSizeY, z: 1 },
        direction
      )

      // ボクセルマップを作成
      const voxelMap = new Map<string, Voxel>()
      glwFile.mainObject.voxels.forEach(voxel => {
        voxelMap.set(voxel.id, voxel)
      })

      // 色情報をマップ化
      const colorMap = new Map<string, string>()
      Object.entries(glwFile.mainObject.colors).forEach(([key, color]) => {
        colorMap.set(key, color)
      })

      const adjacentObject: AdjacentObject = {
        id: `adjacent_${this.objectIdCounter++}`,
        filePath: FileManager.createRelativePath(filePath, filePath), // 相対パスに変換
        direction,
        position,
        gridSizeX: glwFile.mainObject.gridSizeX,
        gridSizeY: glwFile.mainObject.gridSizeY,
        voxels: voxelMap,
        colors: colorMap,
        visible: true
      }

      this.adjacentObjects.set(adjacentObject.id, adjacentObject)
      console.log('Adjacent object added:', adjacentObject.id)

      return adjacentObject
    } catch (error) {
      console.error('Failed to add adjacent object:', error)
      return null
    }
  }

  /**
   * 隣接オブジェクトを削除
   */
  removeAdjacentObject(objectId: string): boolean {
    if (this.adjacentObjects.has(objectId)) {
      this.adjacentObjects.delete(objectId)
      console.log('Adjacent object removed:', objectId)
      return true
    }
    return false
  }

  /**
   * 隣接オブジェクトを取得
   */
  getAdjacentObject(objectId: string): AdjacentObject | undefined {
    return this.adjacentObjects.get(objectId)
  }

  /**
   * すべての隣接オブジェクトを取得
   */
  getAllAdjacentObjects(): AdjacentObject[] {
    return Array.from(this.adjacentObjects.values())
  }

  /**
   * 方向で隣接オブジェクトを取得
   */
  getAdjacentObjectsByDirection(
    direction: 'up' | 'down' | 'left' | 'right' | 'front' | 'back'
  ): AdjacentObject[] {
    return Array.from(this.adjacentObjects.values()).filter(obj => obj.direction === direction)
  }

  /**
   * 隣接オブジェクトの可視状態を設定
   */
  setAdjacentObjectVisibility(objectId: string, visible: boolean): boolean {
    const obj = this.adjacentObjects.get(objectId)
    if (obj) {
      obj.visible = visible
      return true
    }
    return false
  }

  /**
   * 隣接オブジェクトの位置を計算
   */
  private calculateAdjacentPosition(
    mainGridSize: { x: number; y: number; z: number },
    adjacentGridSize: { x: number; y: number; z: number },
    direction: 'up' | 'down' | 'left' | 'right' | 'front' | 'back'
  ): Vector3 {
    switch (direction) {
      case 'up':
        return { x: 0, y: mainGridSize.y, z: 0 }
      case 'down':
        return { x: 0, y: -adjacentGridSize.y, z: 0 }
      case 'left':
        return { x: -adjacentGridSize.x, y: 0, z: 0 }
      case 'right':
        return { x: mainGridSize.x, y: 0, z: 0 }
      case 'front':
        return { x: 0, y: 0, z: -(adjacentGridSize.z ?? 1) }
      case 'back':
        return { x: 0, y: 0, z: mainGridSize.z ?? 1 }
      default:
        return { x: 0, y: 0, z: 0 }
    }
  }

  /**
   * 隣接オブジェクトの総数を取得
   */
  getCount(): number {
    return this.adjacentObjects.size
  }

  /**
   * 隣接オブジェクトのボクセル総数を取得
   */
  getTotalVoxelCount(): number {
    let count = 0
    this.adjacentObjects.forEach(obj => {
      count += obj.voxels.size
    })
    return count
  }

  /**
   * 隣接オブジェクトをGLW形式に変換
   */
  toGlwFormat(): GlwAdjacentObject[] {
    return Array.from(this.adjacentObjects.values()).map(obj => ({
      id: obj.id,
      filePath: obj.filePath,
      direction: obj.direction,
      position: obj.position,
      gridSizeX: obj.gridSizeX,
      gridSizeY: obj.gridSizeY,
      voxels: Array.from(obj.voxels.values()),
      colors: Object.fromEntries(obj.colors)
    }))
  }

  /**
   * GLW形式から隣接オブジェクトを復元
   */
  fromGlwFormat(glwObjects: GlwAdjacentObject[]): void {
    glwObjects.forEach(glwObj => {
      const voxelMap = new Map<string, Voxel>()
      glwObj.voxels.forEach(voxel => {
        voxelMap.set(voxel.id, voxel)
      })

      const colorMap = new Map<string, string>()
      Object.entries(glwObj.colors).forEach(([key, color]) => {
        colorMap.set(key, color)
      })

      const adjacentObject: AdjacentObject = {
        id: glwObj.id,
        filePath: glwObj.filePath,
        direction: glwObj.direction,
        position: glwObj.position,
        gridSizeX: glwObj.gridSizeX,
        gridSizeY: glwObj.gridSizeY,
        voxels: voxelMap,
        colors: colorMap,
        visible: true
      }

      this.adjacentObjects.set(adjacentObject.id, adjacentObject)
    })
  }

  /**
   * 最大グリッドサイズを計算
   */
  calculateMaxGridSize(mainGridX: number, mainGridY: number): { x: number; y: number; z: number } {
    let maxX = mainGridX
    let maxY = mainGridY
    let maxZ = 1

    this.adjacentObjects.forEach(obj => {
      if (obj.direction === 'left' || obj.direction === 'right') {
        maxX += obj.gridSizeX
      } else if (obj.direction === 'up' || obj.direction === 'down') {
        maxY += obj.gridSizeY
      }

      if (obj.direction === 'front' || obj.direction === 'back') {
        maxZ += obj.gridSizeY
      }
    })

    return { x: maxX, y: maxY, z: maxZ }
  }

  /**
   * すべての隣接オブジェクトをクリア
   */
  clear(): void {
    this.adjacentObjects.clear()
  }

  /**
   * メモリ使用量の統計情報を取得
   */
  getMemoryStats(): {
    adjacentObjectCount: number
    totalVoxelCount: number
    estimatedMemorySizeMB: number
  } {
    const voxelCount = this.getTotalVoxelCount()
    // 1ボクセル ≈ 1KB
    const estimatedMemorySizeMB = (this.adjacentObjects.size * 110 + voxelCount) / 1024

    return {
      adjacentObjectCount: this.adjacentObjects.size,
      totalVoxelCount: voxelCount,
      estimatedMemorySizeMB
    }
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    this.adjacentObjects.forEach(obj => {
      obj.voxels.clear()
      obj.colors.clear()
    })
    this.adjacentObjects.clear()
  }
}
