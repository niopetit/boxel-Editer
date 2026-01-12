// ============================================
// 基本型定義
// ============================================

export interface Vector3 {
  x: number
  y: number
  z: number
}

export interface Quaternion {
  x: number
  y: number
  z: number
  w: number
}

export interface Euler {
  x: number
  y: number
  z: number
}

export interface Color {
  r: number
  g: number
  b: number
}

export interface RGBColor {
  r: number
  g: number
  b: number
}

// ============================================
// ボクセル関連の型定義（3Dオブジェクト仕様書）
// ============================================

export interface Vertex {
  id: string
  x: number
  y: number
  z: number
  normal?: Vector3
}

export interface Face {
  id: string
  vertexIds: string[]
  normal: string // "x+", "x-", "y+", "y-", "z+", "z-"
  color?: string // #RRGGBB形式
}

export interface VoxelSnapshot {
  position: Vector3
  vertices: Vertex[]
  faces: Face[]
  colors?: { [faceId: string]: string }
}

export interface Voxel {
  id: string
  position: Vector3
  vertices: Vertex[]
  faces: Face[]
}

// ============================================
// アクション関連の型定義（アンドゥリドゥ仕様書）
// ============================================

export type ActionType =
  | 'addVoxel'
  | 'deleteVoxel'
  | 'colorFace'
  | 'cameraMove'
  | 'cameraRotate'
  | 'cameraZoom'

export interface ActionData {
  [key: string]: unknown
}

export interface Action {
  id: string
  type: ActionType
  timestamp: string // ISO 8601形式
  description: string
  data: ActionData
  targetObject: 'main' | 'adjacent'
}

export interface AddVoxelAction extends Action {
  type: 'addVoxel'
  data: {
    voxelId: string
    position: Vector3
    adjacentDirection?: string
  }
}

export interface DeleteVoxelAction extends Action {
  type: 'deleteVoxel'
  data: {
    voxelId: string
    position: Vector3
    voxelData: VoxelSnapshot
  }
}

export interface ColorFaceAction extends Action {
  type: 'colorFace'
  data: {
    faceId: string
    voxelId: string
    previousColor: string
    newColor: string
  }
}

export interface CameraMoveAction extends Action {
  type: 'cameraMove'
  data: {
    previousPosition: Vector3
    newPosition: Vector3
  }
}

export interface CameraRotateAction extends Action {
  type: 'cameraRotate'
  data: {
    previousRotation: Quaternion | Euler
    newRotation: Quaternion | Euler
  }
}

export interface CameraZoomAction extends Action {
  type: 'cameraZoom'
  data: {
    previousZoom: number
    newZoom: number
  }
}

// ============================================
// カメラ関連の型定義（カメラ仕様書）
// ============================================

export interface CameraState {
  position: Vector3
  rotation: Quaternion | Euler
  zoom: number
  target: Vector3
}

export interface CameraConfig {
  fov: number
  aspect: number
  near: number
  far: number
  rotationSensitivity: number
  panSensitivity: number
  zoomSensitivity: number
}

// ============================================
// カラー関連の型定義（着色システム仕様書）
// ============================================

export interface FaceColor {
  faceId: string
  hexColor: string
  rgbColor: RGBColor
  alpha?: number
  timestamp?: string
}

export interface PaletteColor {
  id: string
  name: string
  hex: string
  rgb: RGBColor
  category?: string
  custom: boolean
}

export interface ColorPalette {
  colors: PaletteColor[]
  selectedColorId?: string
}

// ============================================
// ファイル関連の型定義（ファイル仕様書）
// ============================================

export interface GlwMetadata {
  version: string
  createdAt: string
  updatedAt: string
  gridSizeX: number
  gridSizeY: number
  gridSizeZ?: number
  maxGridX?: number
  maxGridY?: number
  maxGrid?: number
}

export interface GlwMainObject {
  gridSizeX: number
  gridSizeY: number
  gridSizeZ?: number
  voxels: Voxel[]
  colors: { [key: string]: string }
}

export interface GlwAdjacentObject {
  id: string
  filePath: string
  direction: 'up' | 'down' | 'left' | 'right' | 'front' | 'back'
  position: Vector3
  gridSizeX: number
  gridSizeY: number
  voxels: Voxel[]
  colors: { [key: string]: string }
}

export interface GlwFile {
  version: string
  metadata: GlwMetadata
  mainObject: GlwMainObject
  adjacentObjects: GlwAdjacentObject[]
  colorPalette: PaletteColor[]
  undoRedoHistory: Action[]
}

export interface GltfExportOptions {
  format: 'gltf' | 'glb'
  compress?: boolean
}

// ============================================
// 隣接オブジェクト関連の型定義（複数オブジェクト配置仕様書）
// ============================================

export interface AdjacentObject {
  id: string
  filePath: string
  direction: 'up' | 'down' | 'left' | 'right' | 'front' | 'back'
  position: Vector3
  gridSizeX: number
  gridSizeY: number
  voxels: Map<string, Voxel>
  colors: Map<string, string>
  visible: boolean
}

// ============================================
// UI関連の型定義
// ============================================

export interface ColorPaletteEntry {
  id: string
  name: string
  hex: string
  rgb: RGBColor
  custom: boolean
}

export interface EditorState {
  selectedVoxelId: string | null
  selectedFaceId: string | null
  currentColor: string
  gridSize: {
    x: number
    y: number
    z: number
  }
  voxels: Map<string, Voxel>
  isDirty: boolean
  undoStackSize: number
  redoStackSize: number
}

export interface ToolbarState {
  canUndo: boolean
  canRedo: boolean
  selectedVoxelId: string | null
  selectedColor: string
}
