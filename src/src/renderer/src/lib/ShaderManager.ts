/**
 * ShaderManager
 * シェーダー処理の管理と統合
 * 仕様書の描画パイプラインに従い、各シェーダーを管理する
 */

import * as THREE from 'three'
import voxelVertexShader from '../shaders/voxel.vert?raw'
import voxelFragmentShader from '../shaders/voxel.frag?raw'
import boundaryVertexShader from '../shaders/boundary.vert?raw'
import boundaryFragmentShader from '../shaders/boundary.frag?raw'
import vertexHighlightVertexShader from '../shaders/vertex_highlight.vert?raw'
import vertexHighlightFragmentShader from '../shaders/vertex_highlight.frag?raw'
import selectionVertexShader from '../shaders/selection.vert?raw'
import selectionFragmentShader from '../shaders/selection.frag?raw'
import adjacentVertexShader from '../shaders/adjacent.vert?raw'
import adjacentFragmentShader from '../shaders/adjacent.frag?raw'

export class ShaderManager {
  private materials: Map<string, THREE.ShaderMaterial> = new Map()

  constructor(_camera: THREE.Camera, _scene: THREE.Scene) {
    this.initializeShaders()
  }

  /**
   * すべてのシェーダーを初期化
   */
  private initializeShaders(): void {
    // ボクセルメッシュシェーダー
    this.createVoxelShader()
    
    // ボクセル境界シェーダー
    this.createBoundaryShader()
    
    // 頂点ハイライトシェーダー
    this.createVertexHighlightShader()
    
    // 選択ハイライトシェーダー
    this.createSelectionShader()
    
    // 隣接オブジェクトシェーダー
    this.createAdjacentShader()
  }

  /**
   * ボクセルメッシュシェーダーを作成
   */
  private createVoxelShader(): void {
    const uniforms = {
      uModelMatrix: { value: new THREE.Matrix4() },
      uViewMatrix: { value: new THREE.Matrix4() },
      uProjectionMatrix: { value: new THREE.Matrix4() },
      uNormalMatrix: { value: new THREE.Matrix3() },
      uLightPosition: { value: new THREE.Vector3(50, 50, 50) },
      uLightColor: { value: new THREE.Vector3(1, 1, 1) },
      uAmbientIntensity: { value: 0.5 },
      uCameraPosition: { value: new THREE.Vector3(0, 0, 0) },
      uFaceColor: { value: new THREE.Color(0.5, 0.5, 0.5) }
    }

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: voxelVertexShader,
      fragmentShader: voxelFragmentShader,
      side: THREE.DoubleSide,
      glslVersion: THREE.GLSL3
    })

    this.materials.set('voxel', material)
  }

  /**
   * ボクセル境界シェーダーを作成
   */
  private createBoundaryShader(): void {
    const uniforms = {
      uModelMatrix: { value: new THREE.Matrix4() },
      uViewMatrix: { value: new THREE.Matrix4() },
      uProjectionMatrix: { value: new THREE.Matrix4() },
      uNormalMatrix: { value: new THREE.Matrix3() },
      uBoundaryColor: { value: new THREE.Vector3(0, 0, 0) },
      uBoundaryWidth: { value: 0.02 },
      uFaceColor: { value: new THREE.Vector3(1, 1, 1) },
      uBoundaryIntensity: { value: 0.8 }
    }

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: boundaryVertexShader,
      fragmentShader: boundaryFragmentShader,
      side: THREE.DoubleSide,
      glslVersion: THREE.GLSL3
    })

    this.materials.set('boundary', material)
  }

  /**
   * 頂点ハイライトシェーダーを作成
   */
  private createVertexHighlightShader(): void {
    const uniforms = {
      uModelMatrix: { value: new THREE.Matrix4() },
      uViewMatrix: { value: new THREE.Matrix4() },
      uProjectionMatrix: { value: new THREE.Matrix4() },
      uVertexSize: { value: 0.5 },
      uHighlightSize: { value: 0.8 },
      uIsSelected: { value: false },
      uVertexColor: { value: new THREE.Vector3(0.29, 0.56, 0.89) },
      uGlow: { value: 0.2 }
    }

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vertexHighlightVertexShader,
      fragmentShader: vertexHighlightFragmentShader,
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      glslVersion: THREE.GLSL3
    })

    this.materials.set('vertexHighlight', material)
  }

  /**
   * 選択ハイライトシェーダーを作成
   */
  private createSelectionShader(): void {
    const uniforms = {
      uModelMatrix: { value: new THREE.Matrix4() },
      uViewMatrix: { value: new THREE.Matrix4() },
      uProjectionMatrix: { value: new THREE.Matrix4() },
      uNormalMatrix: { value: new THREE.Matrix3() },
      uOutlineWidth: { value: 0.05 },
      uIsSelected: { value: false },
      uSelectionColor: { value: new THREE.Vector3(1, 1, 0) },
      uSelectionIntensity: { value: 0.8 }
    }

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: selectionVertexShader,
      fragmentShader: selectionFragmentShader,
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.NormalBlending,
      glslVersion: THREE.GLSL3
    })

    this.materials.set('selection', material)
  }

  /**
   * 隣接オブジェクトシェーダーを作成
   */
  private createAdjacentShader(): void {
    const uniforms = {
      uModelMatrix: { value: new THREE.Matrix4() },
      uViewMatrix: { value: new THREE.Matrix4() },
      uProjectionMatrix: { value: new THREE.Matrix4() },
      uNormalMatrix: { value: new THREE.Matrix3() },
      uCameraPosition: { value: new THREE.Vector3(0, 0, 0) },
      uLightPosition: { value: new THREE.Vector3(50, 50, 50) },
      uAdjacentAlpha: { value: 0.75 }
    }

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: adjacentVertexShader,
      fragmentShader: adjacentFragmentShader,
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.NormalBlending,
      glslVersion: THREE.GLSL3
    })

    this.materials.set('adjacent', material)
  }

  /**
   * マテリアルを取得
   */
  getMaterial(name: string): THREE.ShaderMaterial | undefined {
    return this.materials.get(name)
  }

  /**
   * マテリアルのクローンを作成（uniformは深くコピー）
   */
  cloneMaterial(name: string): THREE.ShaderMaterial | undefined {
    const original = this.materials.get(name)
    if (!original) return undefined

    const cloned = original.clone()
    
    // Uniformを深くコピー（各フェイスで独立した値を持つようにする）
    const newUniforms: Record<string, { value: any }> = {}
    for (const key in original.uniforms) {
      const uniform = original.uniforms[key]
      if (uniform.value instanceof THREE.Vector3) {
        newUniforms[key] = { value: uniform.value.clone() }
      } else if (uniform.value instanceof THREE.Vector4) {
        newUniforms[key] = { value: uniform.value.clone() }
      } else if (uniform.value instanceof THREE.Color) {
        newUniforms[key] = { value: uniform.value.clone() }
      } else if (uniform.value instanceof THREE.Matrix3) {
        newUniforms[key] = { value: uniform.value.clone() }
      } else if (uniform.value instanceof THREE.Matrix4) {
        newUniforms[key] = { value: uniform.value.clone() }
      } else if (typeof uniform.value === 'number') {
        newUniforms[key] = { value: uniform.value }
      } else {
        // その他の型はそのまま参照
        newUniforms[key] = uniform
      }
    }
    (cloned as THREE.ShaderMaterial).uniforms = newUniforms
    return cloned as THREE.ShaderMaterial
  }

  /**
   * すべてのマテリアルのuniiformsを更新
   */
  updateUniforms(camera: THREE.Camera): void {
    this.materials.forEach((material) => {
      // 共通のuniform更新
      if (material.uniforms.uModelMatrix) {
        material.uniforms.uModelMatrix.value.identity()
      }
      if (material.uniforms.uViewMatrix) {
        material.uniforms.uViewMatrix.value.copy((camera as THREE.PerspectiveCamera).matrixWorldInverse)
      }
      if (material.uniforms.uProjectionMatrix) {
        material.uniforms.uProjectionMatrix.value.copy((camera as THREE.PerspectiveCamera).projectionMatrix)
      }
      if (material.uniforms.uNormalMatrix) {
        const normalMatrix = new THREE.Matrix3()
        normalMatrix.getNormalMatrix(new THREE.Matrix4())
        material.uniforms.uNormalMatrix.value.copy(normalMatrix)
      }
      if (material.uniforms.uCameraPosition) {
        material.uniforms.uCameraPosition.value.copy(camera.position)
      }
    })
  }

  /**
   * マテリアルのリソースを解放
   */
  dispose(): void {
    this.materials.forEach((material) => {
      material.dispose()
    })
    this.materials.clear()
  }
}
