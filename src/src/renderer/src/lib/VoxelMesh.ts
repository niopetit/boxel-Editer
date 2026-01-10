/**
 * VoxelMesh V2
 * シンプル実装版：ボクセルメッシュの管理と3Dメッシュ生成
 * 仕様書準拠
 */

import * as THREE from 'three'
import { Voxel, Vertex, Face, Vector3, VoxelSnapshot } from '../types/index'

export class VoxelMesh {
  private voxels: Map<string, Voxel> = new Map()
  private colorMap: Map<string, string> = new Map()
  private vertexIdCounter: number = 0
  private voxelIdCounter: number = 0

  constructor(_gridSizeX: number, _gridSizeY: number) {
    // 初期状態では空のグリッド（仕様書準拠）
  }

  /**
   * 単一のボクセルを作成
   */
  private createVoxel(position: Vector3): Voxel {
    const voxelId = `voxel_${this.voxelIdCounter++}`
    const vertices: Vertex[] = this.createVertices(position)
    const faces: Face[] = this.createFaces(vertices)

    const voxel: Voxel = {
      id: voxelId,
      position,
      vertices,
      faces
    }

    this.voxels.set(voxelId, voxel)
    return voxel
  }

  /**
   * ボクセルの8つの頂点を作成（仕様書準拠）
   */
  private createVertices(position: Vector3): Vertex[] {
    const vertices: Vertex[] = []

    // 仕様書に従った8つの頂点定義
    const vertexPositions = [
      { x: position.x, y: position.y + 1, z: position.z }, // v0
      { x: position.x + 1, y: position.y + 1, z: position.z }, // v1
      { x: position.x, y: position.y, z: position.z }, // v2
      { x: position.x + 1, y: position.y, z: position.z }, // v3
      { x: position.x, y: position.y + 1, z: position.z + 1 }, // v4
      { x: position.x + 1, y: position.y + 1, z: position.z + 1 }, // v5
      { x: position.x, y: position.y, z: position.z + 1 }, // v6
      { x: position.x + 1, y: position.y, z: position.z + 1 } // v7
    ]

    vertexPositions.forEach((pos) => {
      const vertex: Vertex = {
        id: `v_${this.vertexIdCounter++}`,
        x: pos.x,
        y: pos.y,
        z: pos.z
      }
      vertices.push(vertex)
    })

    return vertices
  }

  /**
   * ボクセルの6つの面を作成（仕様書準拠）
   */
  private createFaces(vertices: Vertex[]): Face[] {
    const faces: Face[] = []

    // 仕様書の面定義：上、下、正面、背面、左、右
    const faceDefinitions = [
      { id: 'top', indices: [0, 1, 5, 4], normal: 'y+' }, // 上面
      { id: 'bottom', indices: [2, 3, 7, 6], normal: 'y-' }, // 下面
      { id: 'front', indices: [0, 1, 3, 2], normal: 'z-' }, // 正面
      { id: 'back', indices: [4, 5, 7, 6], normal: 'z+' }, // 背面
      { id: 'left', indices: [0, 2, 6, 4], normal: 'x-' }, // 左面
      { id: 'right', indices: [1, 3, 7, 5], normal: 'x+' } // 右面
    ]

    faceDefinitions.forEach((def, index) => {
      const face: Face = {
        id: `face_${index}`,
        vertexIds: def.indices.map((i) => vertices[i].id),
        normal: def.normal,
        color: '#808080'
      }
      faces.push(face)
    })

    return faces
  }

  /**
   * ボクセルを追加
   */
  addVoxel(position: Vector3): Voxel | null {
    // 既存のボクセルと重複しないかチェック
    for (const voxel of this.voxels.values()) {
      if (
        voxel.position.x === position.x &&
        voxel.position.y === position.y &&
        voxel.position.z === position.z
      ) {
        console.warn('Voxel already exists at position:', position)
        return null
      }
    }

    return this.createVoxel(position)
  }

  /**
   * 指定したボクセルの指定した面の隣にボクセルを追加
   */
  addVoxelAtFaceId(voxelId: string, faceId: string): Voxel | null {
    const sourceVoxel = this.voxels.get(voxelId)
    if (!sourceVoxel) {
      console.warn('[addVoxelAtFaceId] Voxel not found:', voxelId)
      return null
    }

    const face = sourceVoxel.faces.find((f) => f.id === faceId)
    if (!face) {
      console.warn('[addVoxelAtFaceId] Face not found:', faceId, 'in voxel', voxelId)
      return null
    }

    // 面の法線方向に基づいて新しい位置を計算
    const normal = face.normal
    const newPosition = { ...sourceVoxel.position }

    switch (normal) {
      case 'x+':
        newPosition.x += 1
        break
      case 'x-':
        newPosition.x -= 1
        break
      case 'y+':
        newPosition.y += 1
        break
      case 'y-':
        newPosition.y -= 1
        break
      case 'z+':
        newPosition.z += 1
        break
      case 'z-':
        newPosition.z -= 1
        break
    }

    console.log(`[addVoxelAtFaceId] Adding voxel at position`, newPosition, 'from voxel', voxelId, 'face', faceId)
    const result = this.addVoxel(newPosition)
    if (result) {
      console.log(`[addVoxelAtFaceId] Successfully added new voxel: ${result.id}`)
    }
    return result
  }

  /**
   * 指定した面の隣にボクセルを追加（互換性のため残す）
   */
  addVoxelAtFace(face: Face): Voxel | null {
    // 面が属するボクセルを見つける
    let sourceVoxel: Voxel | null = null
    let sourceVoxelId: string | null = null
    
    for (const [voxelId, voxel] of this.voxels.entries()) {
      if (voxel.faces.some((f) => f.id === face.id)) {
        sourceVoxel = voxel
        sourceVoxelId = voxelId
        break
      }
    }

    if (!sourceVoxel || !sourceVoxelId) {
      console.warn('[addVoxelAtFace] Source voxel not found for face:', face.id)
      return null
    }

    // 面の法線方向に基づいて新しい位置を計算
    const normal = face.normal
    const newPosition = { ...sourceVoxel.position }

    switch (normal) {
      case 'x+':
        newPosition.x += 1
        break
      case 'x-':
        newPosition.x -= 1
        break
      case 'y+':
        newPosition.y += 1
        break
      case 'y-':
        newPosition.y -= 1
        break
      case 'z+':
        newPosition.z += 1
        break
      case 'z-':
        newPosition.z -= 1
        break
    }

    console.log(`[addVoxelAtFace] Adding voxel at position`, newPosition, 'from voxel', sourceVoxelId, 'face', face.id)
    const result = this.addVoxel(newPosition)
    if (result) {
      console.log(`[addVoxelAtFace] Successfully added new voxel: ${result.id}`)
    }
    return result
  }

  /**
   * ボクセルを削除
   */
  deleteVoxel(voxelId: string): VoxelSnapshot | null {
    const voxel = this.voxels.get(voxelId)
    if (!voxel) return null

    const snapshot: VoxelSnapshot = {
      position: { ...voxel.position },
      vertices: [...voxel.vertices],
      faces: [...voxel.faces],
      colors: {}
    }

    voxel.faces.forEach((face) => {
      const colorKey = `${voxelId}_${face.id}`
      if (this.colorMap.has(colorKey)) {
        snapshot.colors![face.id] = this.colorMap.get(colorKey)!
      }
    })

    this.voxels.delete(voxelId)
    voxel.faces.forEach((face) => {
      this.colorMap.delete(`${voxelId}_${face.id}`)
    })

    return snapshot
  }

  /**
   * 削除したボクセルを復元
   */
  restoreVoxel(voxelId: string, snapshot: VoxelSnapshot): boolean {
    if (this.voxels.has(voxelId)) {
      console.warn('Voxel already exists:', voxelId)
      return false
    }

    const voxel: Voxel = {
      id: voxelId,
      position: snapshot.position,
      vertices: snapshot.vertices,
      faces: snapshot.faces
    }

    this.voxels.set(voxelId, voxel)

    voxel.faces.forEach((face) => {
      const colorKey = `${voxelId}_${face.id}`
      if (snapshot.colors && snapshot.colors[face.id]) {
        this.colorMap.set(colorKey, snapshot.colors[face.id])
        face.color = snapshot.colors[face.id]
      }
    })

    return true
  }

  /**
   * 指定した面ごとに色を設定
   */
  colorSpecificFace(voxelId: string, faceId: string, color: string): boolean {
    const voxel = this.voxels.get(voxelId)
    if (!voxel) return false

    const face = voxel.faces.find((f) => f.id === faceId)
    if (!face) return false

    const colorKey = `${voxelId}_${faceId}`
    this.colorMap.set(colorKey, color)
    face.color = color

    return true
  }

  /**
   * ボクセルを取得
   */
  getVoxel(voxelId: string): Voxel | undefined {
    return this.voxels.get(voxelId)
  }

  /**
   * すべてのボクセルを取得
   */
  getVoxels(): Map<string, Voxel> {
    return this.voxels
  }

  /**
   * ボクセル総数
   */
  getVoxelCount(): number {
    return this.voxels.size
  }

  /**
   * 頂点総数
   */
  getVertexCount(): number {
    let count = 0
    this.voxels.forEach((voxel) => {
      count += voxel.vertices.length
    })
    return count
  }

  /**
   * 生成済みのメッシュの色を更新（再生成なし）
   */
  updateMeshColor(meshGroup: THREE.Group, voxelId: string, faceId: string, color: string): void {
    const rgbColor = this.hexToRgb(color)
    const colorObj = new THREE.Color(rgbColor.r / 255, rgbColor.g / 255, rgbColor.b / 255)

    // 再帰的にすべてのメッシュを探索
    const searchAndUpdateMesh = (group: THREE.Group | THREE.Object3D): void => {
      if (group instanceof THREE.Mesh) {
        const mesh = group as any
        if (mesh.userData?.voxelId === voxelId && mesh.userData?.faceId === faceId) {
          if (mesh.material instanceof THREE.MeshBasicMaterial || mesh.material instanceof THREE.MeshPhongMaterial) {
            mesh.material.color.copy(colorObj)
            console.log(`[updateMeshColor] Updated color for ${voxelId}/${faceId}`)
          }
        }
        return
      }

      // Groupの場合は子要素を再帰的に探索
      if (group instanceof THREE.Group) {
        group.children.forEach((child) => {
          searchAndUpdateMesh(child)
        })
      }
    }

    searchAndUpdateMesh(meshGroup)
  }

  /**
   * Three.jsメッシュに変換（シンプル版）
   */
  toThreeMesh(): THREE.Group {
    const group = new THREE.Group()
    console.log(`[toThreeMesh] Starting with ${this.voxels.size} voxels`)

    let meshCount = 0
    let firstVoxel = true

    // 各ボクセルを個別にメッシュとして生成
    this.voxels.forEach((voxel) => {
      // デバッグ：最初のボクセルのジオメトリをログ出力
      if (firstVoxel) {
        console.log(`[toThreeMesh] Voxel ${voxel.id} at position:`, voxel.position)
        console.log(`[toThreeMesh] Voxel ${voxel.id} vertices:`, voxel.vertices.map(v => ({ id: v.id, x: v.x, y: v.y, z: v.z })))
        firstVoxel = false
      }

      // 各面をメッシュ化
      voxel.faces.forEach((face) => {
        // 面の頂点IDから実際の頂点オブジェクトを取得
        const faceVertices = face.vertexIds.map((vertexId) => {
          const vertex = voxel.vertices.find((v) => v.id === vertexId)
          if (!vertex) {
            console.warn(`[toThreeMesh] Vertex not found: ${vertexId}`)
            return new THREE.Vector3()
          }
          return new THREE.Vector3(vertex.x, vertex.y, vertex.z)
        })

        if (faceVertices.length < 3) {
          console.warn(`[toThreeMesh] Face has less than 3 vertices: ${face.id}`)
          return
        }

        // 4つの頂点を2つの三角形に分割
        // 四角形: v0, v1, v2, v3 => 三角形: (v0,v1,v2) + (v0,v2,v3)
        const positions: number[] = []
        const indices: number[] = []

        // 4つの頂点をBufferGeometryに追加
        faceVertices.forEach((v) => {
          positions.push(v.x, v.y, v.z)
        })

        // 法線を計算（最初の3つの頂点から）
        const v1 = faceVertices[1].clone().sub(faceVertices[0])
        const v2 = faceVertices[2].clone().sub(faceVertices[0])
        const normal = v1.cross(v2).normalize()

        // インデックスで三角形を定義
        indices.push(0, 1, 2) // 三角形1
        indices.push(0, 2, 3) // 三角形2

        // ジオメトリを作成
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
        geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1))

        // 法線を設定
        const normals: number[] = []
        for (let i = 0; i < positions.length / 3; i++) {
          normals.push(normal.x, normal.y, normal.z)
        }
        geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))

        // マテリアルを作成
        const rgbColor = this.hexToRgb(face.color || '#808080')
        const material = new THREE.MeshBasicMaterial({
          color: new THREE.Color(rgbColor.r / 255, rgbColor.g / 255, rgbColor.b / 255),
          side: THREE.DoubleSide,
          wireframe: false
        })

        // メッシュを作成
        const mesh = new THREE.Mesh(geometry, material)
        mesh.userData.voxelId = voxel.id
        mesh.userData.faceId = face.id
        
        // 新しく追加されたボクセルの面について詳細ログ
        if (voxel.id.includes('_4') || voxel.id.includes('_5') || voxel.id.includes('_6') || voxel.id.includes('_7') || voxel.id.includes('_8')) {
          console.log(`[toThreeMesh] Created mesh for ${voxel.id} ${face.id}:`, {
            voxelId: mesh.userData.voxelId,
            faceId: mesh.userData.faceId,
            normal: normal,
            positionCount: positions.length,
            v0: faceVertices[0],
            v1: faceVertices[1],
            v2: faceVertices[2],
            v3: faceVertices[3]
          })
        }
        
        group.add(mesh)
        meshCount++
      })
    })

    console.log(`[toThreeMesh] Created ${meshCount} face meshes in group`)
    return group
  }

  /**
   * 16進数カラーをRGBに変換
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 128, g: 128, b: 128 }
  }

  /**
   * メモリ解放
   */
  dispose(): void {
    this.voxels.clear()
    this.colorMap.clear()
  }
}
