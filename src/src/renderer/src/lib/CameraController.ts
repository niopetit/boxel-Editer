/**
 * CameraController
 * カメラ操作（回転、パン、ズーム）の制御
 * カメラ仕様書に準拠
 */

import * as THREE from 'three'
import { Vector3, CameraState } from '../types/index'

export class CameraController {
  private camera: THREE.PerspectiveCamera
  private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0)

  // キー状態の追跡
  private keysPressed: Map<string, boolean> = new Map()

  // 操作パラメータ
  private readonly rotationSensitivity: number = 0.01
  private readonly panSensitivity: number = 0.5
  private readonly zoomSensitivity: number = 1.05
  private readonly minZoom: number = 1
  private readonly maxZoom: number = 100

  // カメラの前回状態（アンドゥ・リドゥ用）
  private previousPosition: THREE.Vector3 = new THREE.Vector3()
  private previousRotation: THREE.Quaternion = new THREE.Quaternion()
  private stateChanged: boolean = false

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera
    this.previousPosition.copy(camera.position)
    this.previousRotation.copy(camera.quaternion)
    this.setupEventListeners()
  }

  /**
   * イベントリスナーを設定
   */
  private setupEventListeners(): void {
    document.addEventListener('keydown', (e) => this.onKeyDown(e))
    document.addEventListener('keyup', (e) => this.onKeyUp(e))
  }

  /**
   * キーダウンイベントハンドラ
   */
  private onKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase()
    this.keysPressed.set(key, true)
  }

  /**
   * キーアップイベントハンドラ
   */
  private onKeyUp(event: KeyboardEvent): void {
    const key = event.key.toLowerCase()
    this.keysPressed.set(key, false)
  }

  /**
   * 毎フレーム更新（アニメーションループから呼び出す）
   */
  update(): void {
    this.previousPosition.copy(this.camera.position)
    this.previousRotation.copy(this.camera.quaternion)

    // 回転操作（WASD）
    if (this.keysPressed.get('w')) this.rotateUp()
    if (this.keysPressed.get('a')) this.rotateLeft()
    if (this.keysPressed.get('s')) this.rotateDown()
    if (this.keysPressed.get('d')) this.rotateRight()

    // パン操作（矢印キー）
    if (this.keysPressed.get('arrowup')) this.panUp()
    if (this.keysPressed.get('arrowdown')) this.panDown()
    if (this.keysPressed.get('arrowleft')) this.panLeft()
    if (this.keysPressed.get('arrowright')) this.panRight()

    // ズーム操作（Q / Shift+Q）
    if (this.keysPressed.get('q')) {
      if (this.keysPressed.get('shift')) {
        this.zoomOut()
      } else {
        this.zoomIn()
      }
    }

    // 状態が変わったかチェック
    if (
      !this.previousPosition.equals(this.camera.position) ||
      !this.previousRotation.equals(this.camera.quaternion)
    ) {
      this.stateChanged = true
    }
  }

  /**
   * カメラを上方向に回転（オブジェクトが下に回転）
   */
  /**
   * カメラを上方向に回転（カメラのローカル座標系の right ベクトル周り）
   */
  private rotateUp(): void {
    const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion)
    const quat = new THREE.Quaternion()
    quat.setFromAxisAngle(rightVector, this.rotationSensitivity)
    this.camera.position.sub(this.target)
    this.camera.position.applyQuaternion(quat)
    this.camera.position.add(this.target)
    this.camera.quaternion.multiplyQuaternions(quat, this.camera.quaternion)
  }

  /**
   * カメラを下方向に回転（カメラのローカル座標系の right ベクトル周り）
   */
  private rotateDown(): void {
    const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion)
    const quat = new THREE.Quaternion()
    quat.setFromAxisAngle(rightVector, -this.rotationSensitivity)
    this.camera.position.sub(this.target)
    this.camera.position.applyQuaternion(quat)
    this.camera.position.add(this.target)
    this.camera.quaternion.multiplyQuaternions(quat, this.camera.quaternion)
  }

  /**
   * カメラを左方向に回転（ワールド Y軸周り）
   */
  private rotateLeft(): void {
    const quat = new THREE.Quaternion()
    quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationSensitivity)
    this.camera.position.sub(this.target)
    this.camera.position.applyQuaternion(quat)
    this.camera.position.add(this.target)
    this.camera.quaternion.multiplyQuaternions(quat, this.camera.quaternion)
  }

  /**
   * カメラを右方向に回転（ワールド Y軸周り）
   */
  private rotateRight(): void {
    const quat = new THREE.Quaternion()
    quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -this.rotationSensitivity)
    this.camera.position.sub(this.target)
    this.camera.position.applyQuaternion(quat)
    this.camera.position.add(this.target)
    this.camera.quaternion.multiplyQuaternions(quat, this.camera.quaternion)
  }

  /**
   * カメラを上方向にパン（カメラのローカル座標系）
   */
  private panUp(): void {
    const panVector = new THREE.Vector3(0, this.panSensitivity, 0)
    this.camera.position.add(panVector)
    this.target.add(panVector)
  }

  /**
   * カメラを下方向にパン（カメラのローカル座標系）
   */
  private panDown(): void {
    const panVector = new THREE.Vector3(0, -this.panSensitivity, 0)
    this.camera.position.add(panVector)
    this.target.add(panVector)
  }

  /**
   * カメラを左方向にパン（カメラのローカル座標系）
   */
  private panLeft(): void {
    const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion)
    const panVector = rightVector.multiplyScalar(-this.panSensitivity)
    this.camera.position.add(panVector)
    this.target.add(panVector)
  }

  /**
   * カメラを右方向にパン（カメラのローカル座標系）
   */
  private panRight(): void {
    const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion)
    const panVector = rightVector.multiplyScalar(this.panSensitivity)
    this.camera.position.add(panVector)
    this.target.add(panVector)
  }

  /**
   * カメラをズームイン
   */
  private zoomIn(): void {
    const direction = this.camera.position.clone().sub(this.target).normalize()
    const distance = this.camera.position.distanceTo(this.target)
    const newDistance = Math.max(distance / this.zoomSensitivity, this.minZoom)
    this.camera.position.copy(this.target).add(direction.multiplyScalar(newDistance))
  }

  /**
   * カメラをズームアウト
   */
  private zoomOut(): void {
    const direction = this.camera.position.clone().sub(this.target).normalize()
    const distance = this.camera.position.distanceTo(this.target)
    const newDistance = Math.min(distance * this.zoomSensitivity, this.maxZoom)
    this.camera.position.copy(this.target).add(direction.multiplyScalar(newDistance))
  }

  /**
   * カメラの状態を取得
   */
  getCameraState(): CameraState {
    return {
      position: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z
      },
      rotation: {
        x: this.camera.quaternion.x,
        y: this.camera.quaternion.y,
        z: this.camera.quaternion.z,
        w: this.camera.quaternion.w
      },
      zoom: this.camera.zoom,
      target: {
        x: this.target.x,
        y: this.target.y,
        z: this.target.z
      }
    }
  }

  /**
   * カメラの状態を設定
   */
  setCameraState(state: CameraState): void {
    this.camera.position.set(state.position.x, state.position.y, state.position.z)
    if ('w' in state.rotation) {
      // Quaternion
      const rot = state.rotation as unknown as Record<string, number>
      this.camera.quaternion.set(rot.x, rot.y, rot.z, rot.w)
    } else {
      // Euler
      this.camera.setRotationFromEuler(
        new THREE.Euler((state.rotation as any).x, (state.rotation as any).y, (state.rotation as any).z)
      )
    }
    this.camera.zoom = state.zoom
    this.camera.updateProjectionMatrix()
    this.target.set(state.target.x, state.target.y, state.target.z)
  }

  /**
   * カメラの前回の状態を取得
   */
  getPreviousState(): CameraState {
    return {
      position: {
        x: this.previousPosition.x,
        y: this.previousPosition.y,
        z: this.previousPosition.z
      },
      rotation: {
        x: this.previousRotation.x,
        y: this.previousRotation.y,
        z: this.previousRotation.z,
        w: this.previousRotation.w
      },
      zoom: this.camera.zoom,
      target: {
        x: this.target.x,
        y: this.target.y,
        z: this.target.z
      }
    }
  }

  /**
   * 状態が変わったかチェック
   */
  hasStateChanged(): boolean {
    return this.stateChanged
  }

  /**
   * 状態変更フラグをリセット
   */
  resetStateChanged(): void {
    this.stateChanged = false
  }

  /**
   * ターゲット（見つめる点）を設定
   */
  setTarget(target: Vector3): void {
    this.target.set(target.x, target.y, target.z)
  }

  /**
   * ターゲットを取得
   */
  getTarget(): THREE.Vector3 {
    return this.target.clone()
  }

  /**
   * リソースの解放
   */
  dispose(): void {
    document.removeEventListener('keydown', (e) => this.onKeyDown(e))
    document.removeEventListener('keyup', (e) => this.onKeyUp(e))
    this.keysPressed.clear()
  }
}
