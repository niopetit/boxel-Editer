/**
 * AdjacentObjectManager
 * 隣接オブジェクト（複数配置）の管理
 * 複数オブジェクト配置仕様書に準拠
 * GLTFファイルを読み込み、グレースケール半透明で表示
 */

import * as THREE from 'three'
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { AdjacentObject, Voxel, Vector3, GlwAdjacentObject } from '../types/index'

// 隣接オブジェクト用の拡張型（Three.jsオブジェクトを含む）
export interface AdjacentObjectWithMesh extends AdjacentObject {
  mesh: THREE.Group | null  // GLTFから読み込んだメッシュ
}

export class AdjacentObjectManager {
  private adjacentObjects: Map<string, AdjacentObjectWithMesh> = new Map()
  private objectIdCounter: number = 0
  private gltfLoader: GLTFLoader

  constructor() {
    this.gltfLoader = new GLTFLoader()
  }

  /**
   * 隣接オブジェクトを追加（GLTFファイル対応）
   */
  async addAdjacentObject(
    filePath: string,
    direction: 'up' | 'down' | 'left' | 'right' | 'front' | 'back',
    mainGridSizeX: number,
    mainGridSizeY: number
  ): Promise<AdjacentObjectWithMesh | null> {
    try {
      // メインプロセス経由でGLTFファイルを読み込み
      const fileData = await window.api.loadGltfFile(filePath)
      if (!fileData) {
        console.error('Failed to load GLTF file via IPC:', filePath)
        return null
      }

      // Base64からGLTFを読み込み
      const gltf = await this.loadGltfFromBase64(fileData.data, fileData.extension)
      if (!gltf) {
        console.error('Failed to parse GLTF data:', filePath)
        return null
      }

      // バウンディングボックスからサイズを計算
      const boundingBox = new THREE.Box3().setFromObject(gltf.scene)
      const size = new THREE.Vector3()
      boundingBox.getSize(size)

      // 位置を計算
      const position = this.calculateAdjacentPosition(
        { x: mainGridSizeX, y: mainGridSizeY, z: 1 },
        { x: Math.ceil(size.x), y: Math.ceil(size.y), z: Math.ceil(size.z) || 1 },
        direction
      )

      // メッシュグループを作成（元のマテリアルを保持）
      const meshGroup = this.createOriginalMesh(gltf.scene)
      meshGroup.position.set(position.x, position.y, position.z)

      const adjacentObject: AdjacentObjectWithMesh = {
        id: `adjacent_${this.objectIdCounter++}`,
        filePath: filePath,
        direction,
        position,
        gridSizeX: Math.ceil(size.x),
        gridSizeY: Math.ceil(size.y),
        voxels: new Map(),
        colors: new Map(),
        visible: true,
        mesh: meshGroup
      }

      this.adjacentObjects.set(adjacentObject.id, adjacentObject)

      return adjacentObject
    } catch (error) {
      console.error('Failed to add adjacent object:', error)
      return null
    }
  }

  /**
   * Base64からGLTFを読み込み
   */
  private loadGltfFromBase64(base64Data: string, extension: string): Promise<GLTF | null> {
    return new Promise((resolve) => {
      try {
        
        // Base64をArrayBufferに変換
        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const arrayBuffer = bytes.buffer


        if (extension === 'glb') {
          // GLBファイル（バイナリ）
          this.gltfLoader.parse(
            arrayBuffer,
            '',
            (gltf) => {
              resolve(gltf)
            },
            (error) => {
              console.error('[GLTF] GLB parse error:', error)
              resolve(null)
            }
          )
        } else {
          // GLTFファイル（JSON）- ArrayBufferをそのまま渡す
          this.gltfLoader.parse(
            arrayBuffer,
            '',
            (gltf) => {
              resolve(gltf)
            },
            (error) => {
              console.error('[GLTF] GLTF parse error:', error)
              resolve(null)
            }
          )
        }
      } catch (error) {
        console.error('[GLTF] Failed to parse from base64:', error)
        resolve(null)
      }
    })
  }

  /**
   * オリジナルのメッシュをそのまま使用（元の色・マテリアルを保持）
   */
  private createOriginalMesh(scene: THREE.Object3D): THREE.Group {
    const group = new THREE.Group()
    
    // シーン内のすべてのメッシュを走査
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // ジオメトリをクローン
        const clonedGeometry = child.geometry.clone()
        
        // ワールド変換を適用
        child.updateWorldMatrix(true, false)
        clonedGeometry.applyMatrix4(child.matrixWorld)
        
        // マテリアルをクローン（元のファイルを変更しないため）
        let clonedMaterial: THREE.Material | THREE.Material[]
        if (Array.isArray(child.material)) {
          clonedMaterial = child.material.map(m => m.clone())
        } else {
          clonedMaterial = child.material.clone()
        }
        
        // 新しいメッシュを作成（元のマテリアルを使用）
        const newMesh = new THREE.Mesh(clonedGeometry, clonedMaterial)
        newMesh.userData.isAdjacentObject = true
        
        group.add(newMesh)
      }
    })

    return group
  }

  /**
   * 隣接オブジェクトを削除
   */
  removeAdjacentObject(objectId: string): boolean {
    const obj = this.adjacentObjects.get(objectId)
    if (obj) {
      // メッシュのジオメトリを解放
      if (obj.mesh) {
        obj.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
          }
        })
      }
      this.adjacentObjects.delete(objectId)
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
  getAllAdjacentObjects(): AdjacentObjectWithMesh[] {
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
   * 隣接オブジェクトをY軸周りに時計回りに90度回転
   */
  rotateAdjacentObjectClockwise(objectId: string): boolean {
    const obj = this.adjacentObjects.get(objectId)
    if (!obj || !obj.mesh) return false

    // Y軸周りに時計回りに90度回転（-π/2）
    obj.mesh.rotation.y -= Math.PI / 2

    return true
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

      const adjacentObject: AdjacentObjectWithMesh = {
        id: glwObj.id,
        filePath: glwObj.filePath,
        direction: glwObj.direction,
        position: glwObj.position,
        gridSizeX: glwObj.gridSizeX,
        gridSizeY: glwObj.gridSizeY,
        voxels: voxelMap,
        colors: colorMap,
        visible: true,
        mesh: null  // GLWから復元時はメッシュはない（後でGLTFを再読み込みが必要）
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
      // メッシュのジオメトリを解放
      if (obj.mesh) {
        obj.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
          }
        })
      }
    })
    this.adjacentObjects.clear()
  }
}
