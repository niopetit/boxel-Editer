import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { VoxelMesh } from '../lib/VoxelMesh'
import { CameraController } from '../lib/CameraController'
import { ActionHistory } from '../lib/ActionHistory'
import { ColorSystem } from '../lib/ColorSystem'
import { FileManager } from '../lib/FileManager'
import { AdjacentObjectManager } from '../lib/AdjacentObjectManager'
import { AdjacentObject } from '../types/index'
import AdjacentObjectPanel from './AdjacentObjectPanel'
import './styles/BoxelEditor.css'

// ハイライト色定数
const HOVER_HIGHLIGHT_COLOR = 0x0099FF
const SELECTION_HIGHLIGHT_COLOR = 0xFFFF00

interface BoxelEditorProps {
  gridSize: { x: number; y: number; z: number }
  selectedColor: string
}

// メッシュの色を設定するヘルパー関数
const setMeshColor = (mesh: THREE.Mesh, colorHex: number): void => {
  if (mesh.material instanceof THREE.MeshBasicMaterial) {
    mesh.material.color.setHex(colorHex)
  } else if (mesh.material instanceof THREE.ShaderMaterial && mesh.material.uniforms.uColor) {
    const r = ((colorHex >> 16) & 255) / 255
    const g = ((colorHex >> 8) & 255) / 255
    const b = (colorHex & 255) / 255
    mesh.material.uniforms.uColor.value.setRGB(r, g, b)
  }
}

// メッシュの色を取得するヘルパー関数
const getMeshColor = (mesh: THREE.Mesh): number | null => {
  if (mesh.material instanceof THREE.MeshBasicMaterial) {
    return mesh.material.color.getHex()
  } else if (mesh.material instanceof THREE.ShaderMaterial && mesh.material.uniforms.uColor) {
    const c = mesh.material.uniforms.uColor.value
    return (Math.round(c.r * 255) << 16) | (Math.round(c.g * 255) << 8) | Math.round(c.b * 255)
  }
  return null
}

function BoxelEditor({ gridSize, selectedColor }: BoxelEditorProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [vertexCount, setVertexCount] = useState(0)
  const [voxelCount, setVoxelCount] = useState(0)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [selectedVoxelId, setSelectedVoxelId] = useState<string | null>(null)
  const [adjacentObjects, setAdjacentObjects] = useState<AdjacentObject[]>([])

  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const voxelMeshRef = useRef<VoxelMesh | null>(null)
  const cameraControllerRef = useRef<CameraController | null>(null)
  const actionHistoryRef = useRef<ActionHistory | null>(null)
  const colorSystemRef = useRef<ColorSystem | null>(null)
  const meshGroupRef = useRef<THREE.Group | null>(null)
  const adjacentMeshGroupRef = useRef<THREE.Group | null>(null)
  const adjacentObjectManagerRef = useRef<AdjacentObjectManager | null>(null)
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const animationIdRef = useRef<number>(0)
  const updateVoxelMeshRef = useRef<(() => void) | null>(null)
  const updateAdjacentMeshesRef = useRef<(() => void) | null>(null)
  const previouslySelectedMeshRef = useRef<THREE.Mesh | null>(null)
  const previouslyHoveredMeshRef = useRef<THREE.Mesh | null>(null)

  // === アクション復元ヘルパー関数（useEffect外で定義） ===
  const applyAction = (action: {
    type: string
    data: Record<string, any>
  }): void => {
    if (!voxelMeshRef.current) return

    switch (action.type) {
      case 'addVoxel':
        if (action.data.voxelData) {
          voxelMeshRef.current.restoreVoxel(action.data.voxelId, action.data.voxelData)
        }
        break
      case 'deleteVoxel':
        voxelMeshRef.current.deleteVoxel(action.data.voxelId)
        break
      case 'colorFace':
        voxelMeshRef.current.colorSpecificFace(
          action.data.voxelId,
          action.data.faceId,
          action.data.newColor
        )
        break
    }
  }

  const applyActionReverse = (action: {
    type: string
    data: Record<string, any>
  }): void => {
    if (!voxelMeshRef.current) return

    switch (action.type) {
      case 'addVoxel':
        voxelMeshRef.current.deleteVoxel(action.data.voxelId)
        break
      case 'deleteVoxel':
        if (action.data.voxelData) {
          voxelMeshRef.current.restoreVoxel(action.data.voxelId, action.data.voxelData)
        }
        break
      case 'colorFace':
        voxelMeshRef.current.colorSpecificFace(
          action.data.voxelId,
          action.data.faceId,
          action.data.previousColor
        )
        break
    }
  }

  const updateUndoRedoButtons = (): void => {
    setCanUndo(actionHistoryRef.current?.canUndo() ?? false)
    setCanRedo(actionHistoryRef.current?.canRedo() ?? false)
  }

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current

    // === Three.js初期化 ===
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x333333)
    sceneRef.current = scene

    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const dpr = window.devicePixelRatio || 1

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    // カメラを Z軸上に遠く配置し、オブジェクトの中心高さを見るように設定
    camera.position.set(0, 0, 20)
    camera.lookAt(0, gridSize.y / 2, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false })
    renderer.setPixelRatio(dpr)
    renderer.setSize(width, height, false)
    renderer.setClearColor(0x333333)
    rendererRef.current = renderer

    // === ライト設定 ===
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(20, 20, 20)
    scene.add(directionalLight)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    // === グリッド表示 ===
    const gridHelper = new THREE.GridHelper(80, 80, 0x444444, 0x222222)
    gridHelper.position.y = -0.5
    scene.add(gridHelper)

    // === 軸ヘルパー ===
    const axesHelper = new THREE.AxesHelper(30)
    scene.add(axesHelper)



    // === ボクセルメッシュ初期化 ===
    const voxelMesh = new VoxelMesh(gridSize.x, gridSize.y)
    voxelMeshRef.current = voxelMesh

    // === 初期ボクセルを立方体で追加、底面を y=0 に固定 ===
    
    // 底面が y=0 に、X-Z 平面の中心が (0,0) になるようにオフセットを計算
    const offsetX = -Math.floor(gridSize.x / 2)
    const offsetY = 0 // 底面を y=0 に固定
    const offsetZ = -Math.floor(gridSize.z / 2)
    
    // gridSize で指定されたサイズの立方体を作成
    for (let x = 0; x < gridSize.x; x++) {
      for (let y = 0; y < gridSize.y; y++) {
        for (let z = 0; z < gridSize.z; z++) {
          voxelMesh.addVoxel({
            x: x + offsetX,
            y: y + offsetY,
            z: z + offsetZ
          })
        }
      }
    }

    // === メッシュをシーンに追加 ===
    const meshGroup = new THREE.Group()
    const threeMesh = voxelMesh.toThreeMesh()
    
    // threeMeshはGROUPなので、その子要素をmeshGroupに直接追加
    // 注: children は リアルタイムコレクションなので、スプレッド演算子でコピーを作成
    const initialChildrenCopy = [...threeMesh.children]
    initialChildrenCopy.forEach((child) => {
      meshGroup.add(child)
    })
    
    scene.add(meshGroup)
    meshGroupRef.current = meshGroup

    // === メッシュ更新ヘルパー関数 ===
    const updateVoxelMesh = (): void => {
      if (!meshGroupRef.current || !voxelMeshRef.current) return
      
      // ハイライト参照をクリア
      previouslySelectedMeshRef.current = null
      previouslyHoveredMeshRef.current = null
      
      // 既存のメッシュをクリア
      meshGroupRef.current.clear()
      
      // 新しいメッシュを生成
      const newMesh = voxelMeshRef.current.toThreeMesh()
      
      // newMeshはGROUPなので、その子要素をmeshGroupに直接追加
      // 注: children は リアルタイムコレクションなので、スプレッド演算子でコピーを作成
      const childrenCopy = [...newMesh.children]
      childrenCopy.forEach((child) => {
        meshGroupRef.current?.add(child)
      })
      
      setVertexCount(voxelMeshRef.current.getVertexCount())
      setVoxelCount(voxelMeshRef.current.getVoxelCount())
    }
    updateVoxelMeshRef.current = updateVoxelMesh

    // === 隣接オブジェクトマネージャー初期化 ===
    const adjacentObjectManager = new AdjacentObjectManager()
    adjacentObjectManagerRef.current = adjacentObjectManager

    // === 隣接オブジェクト用メッシュグループ ===
    const adjacentMeshGroup = new THREE.Group()
    adjacentMeshGroup.name = 'adjacentMeshGroup'
    scene.add(adjacentMeshGroup)
    adjacentMeshGroupRef.current = adjacentMeshGroup

    // === 隣接オブジェクトのメッシュを更新 ===
    const updateAdjacentMeshes = (): void => {
      if (!adjacentMeshGroupRef.current || !adjacentObjectManagerRef.current) return

      // 既存のメッシュをクリア
      adjacentMeshGroupRef.current.clear()

      const adjacentObjs = adjacentObjectManagerRef.current.getAllAdjacentObjects()

      adjacentObjs.forEach((adjObj) => {
        if (!adjObj.visible || !adjObj.mesh) return

        // GLTFから読み込んだメッシュをそのまま追加（パフォーマンス最適化済み）
        adjObj.mesh.position.set(adjObj.position.x, adjObj.position.y, adjObj.position.z)
        adjObj.mesh.userData.adjacentObjectId = adjObj.id
        adjacentMeshGroupRef.current?.add(adjObj.mesh)
      })

    }
    updateAdjacentMeshesRef.current = updateAdjacentMeshes

    // === カメラコントローラー初期化 ===
    const cameraController = new CameraController(camera)
    cameraControllerRef.current = cameraController

    // === アクション履歴初期化 ===
    const actionHistory = new ActionHistory()
    actionHistoryRef.current = actionHistory

    // === カラーシステム初期化 ===
    const colorSystem = new ColorSystem()
    colorSystemRef.current = colorSystem

    // === ステータス更新 ===
    setVertexCount(voxelMesh.getVertexCount())
    setVoxelCount(voxelMesh.getVoxelCount())

    // === マウスイベント: ムーブ（ホバーハイライト） ===
    const handleMouseMove = (event: MouseEvent): void => {
      if (!canvasRef.current || !cameraRef.current || !rendererRef.current || !meshGroupRef.current) return

      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)

      // meshGroupRef の直下のメッシュのみを対象にする
      const meshes: THREE.Object3D[] = []
      if (meshGroupRef.current) {
        meshGroupRef.current.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            meshes.push(child)
          }
        })
      }

      const intersects = raycasterRef.current.intersectObjects(meshes, false)

      if (intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh

        // 前回ホバーされたメッシュと異なる場合、前のホバーハイライトを解除
        if (previouslyHoveredMeshRef.current && previouslyHoveredMeshRef.current !== mesh) {
          // 選択状態でなければハイライト解除
          if (previouslyHoveredMeshRef.current !== previouslySelectedMeshRef.current) {
            const baseColor = previouslyHoveredMeshRef.current.userData.baseColor
            if (baseColor) {
              setMeshColor(previouslyHoveredMeshRef.current, baseColor)
            }
          }
        }

        // 新しいホバー対象が選択されていなければホバーハイライトを適用
        if (mesh !== previouslySelectedMeshRef.current) {
          // 元の色を保存
          if (!mesh.userData.baseColor) {
            if (mesh.material instanceof THREE.MeshBasicMaterial) {
              mesh.userData.baseColor = mesh.material.color.getHex()
            } else if (mesh.material instanceof THREE.ShaderMaterial && mesh.material.uniforms.uColor) {
              const c = mesh.material.uniforms.uColor.value
              mesh.userData.baseColor = (Math.round(c.r * 255) << 16) | (Math.round(c.g * 255) << 8) | Math.round(c.b * 255)
            }
          }
          // 青色でホバーハイライト
          setMeshColor(mesh, HOVER_HIGHLIGHT_COLOR)
          previouslyHoveredMeshRef.current = mesh
        } else {
          // 選択されているメッシュをホバーした場合、ホバー参照をクリア（選択色を維持）
          previouslyHoveredMeshRef.current = null
        }
      } else {
        // ホバー対象がなくなった場合、ホバーハイライトを解除
        if (previouslyHoveredMeshRef.current && previouslyHoveredMeshRef.current !== previouslySelectedMeshRef.current) {
          const baseColor = previouslyHoveredMeshRef.current.userData.baseColor
          if (baseColor) {
            setMeshColor(previouslyHoveredMeshRef.current, baseColor)
          }
        }
        previouslyHoveredMeshRef.current = null
      }
    }

    // === マウスイベント: クリック ===
    const handleMouseClick = (event: MouseEvent): void => {
      if (!cameraRef.current || !rendererRef.current || !sceneRef.current) return

      const canvasElement = rendererRef.current.domElement as HTMLCanvasElement
      const rect = canvasElement.getBoundingClientRect()

      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)

      // meshGroupRef の直下のメッシュのみを対象にする
      const meshes: THREE.Object3D[] = []
      if (meshGroupRef.current) {
        meshGroupRef.current.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            meshes.push(child)
          }
        })
      }


      const intersects = raycasterRef.current.intersectObjects(meshes, false)


      if (intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh


        // 前回選択されたメッシュのハイライトを解除
        if (previouslySelectedMeshRef.current && previouslySelectedMeshRef.current !== mesh) {
          const baseColor = previouslySelectedMeshRef.current.userData.baseColor
          if (baseColor) {
            setMeshColor(previouslySelectedMeshRef.current, baseColor)
          }
          previouslyHoveredMeshRef.current = null
        }

        // メッシュのuserDataからボクセルIDと面IDを取得
        if (mesh.userData.voxelId && mesh.userData.faceId) {
          const voxelId = mesh.userData.voxelId as string
          const faceId = mesh.userData.faceId as string

          setSelectedVoxelId(voxelId)

          // 元の色を保存（baseColorがなければ現在の色を保存）
          if (!mesh.userData.baseColor) {
            mesh.userData.baseColor = getMeshColor(mesh)
          }
          // 黄色でハイライト
          setMeshColor(mesh, SELECTION_HIGHLIGHT_COLOR)
          previouslySelectedMeshRef.current = mesh
          previouslyHoveredMeshRef.current = null

          // 選択された面を保存
          if (canvasRef.current) {
            ;(canvasRef.current as any).selectedFaceId = faceId
            ;(canvasRef.current as any).selectedVoxelId = voxelId
          }
        }
      }
    }

    // === ウィンドウリサイズ対応 ===
    const handleResize = (): void => {
      if (!cameraRef.current || !rendererRef.current || !canvasRef.current) return
      const newWidth = canvasRef.current.clientWidth
      const newHeight = canvasRef.current.clientHeight
      const dpr = window.devicePixelRatio || 1
      
      cameraRef.current.aspect = newWidth / newHeight
      cameraRef.current.updateProjectionMatrix()
      
      // キャンバスのサイズをDPRを考慮して設定
      rendererRef.current.setPixelRatio(dpr)
      rendererRef.current.setSize(newWidth, newHeight, false)
    }

    // === イベントリスナー登録 ===
    canvasRef.current.addEventListener('click', handleMouseClick)
    canvasRef.current.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('resize', handleResize)

    // === アニメーションループ ===
    const animate = (): void => {
      animationIdRef.current = requestAnimationFrame(animate)

      cameraControllerRef.current?.update()
      rendererRef.current?.render(sceneRef.current!, cameraRef.current!)
    }

    animate()

    // === クリーンアップ ===
    return (): void => {
      window.removeEventListener('resize', handleResize)
      canvasRef.current?.removeEventListener('click', handleMouseClick)
      canvasRef.current?.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationIdRef.current)
      renderer.dispose()
    }
  }, [gridSize])

  const handleAddVoxel = (): void => {
    // canvas に保存された値を使う
    const selectedVoxelId = (canvasRef.current as any)?.selectedVoxelId
    const selectedFaceId = (canvasRef.current as any)?.selectedFaceId
    
    if (!selectedVoxelId || !voxelMeshRef.current) {
      return
    }
    
    const voxel = voxelMeshRef.current.getVoxels().get(selectedVoxelId)
    if (voxel && voxel.faces.length > 0) {
      const targetFaceId = selectedFaceId || voxel.faces[0].id
      const targetFace = voxel.faces.find((f) => f.id === targetFaceId)
      
      if (targetFace) {
        const newVoxel = voxelMeshRef.current.addVoxelAtFaceId(selectedVoxelId, targetFace.id)
        
        if (newVoxel) {
          // アクション履歴に追加
          actionHistoryRef.current?.pushAction(
            'addVoxel',
            {
              voxelId: newVoxel.id,
              position: newVoxel.position,
              adjacentDirection: targetFace.normal,
              voxelData: newVoxel
            },
            `ボクセルを追加: ${newVoxel.id}`,
            'main'
          )
          
          updateVoxelMeshRef.current?.()
          ;(canvasRef.current as any).selectedVoxelId = newVoxel.id
          setSelectedVoxelId(newVoxel.id)
          updateUndoRedoButtons()
        }
      }
    }
  }

  const handleDeleteVoxel = (): void => {
    const selectedVoxelId = (canvasRef.current as any)?.selectedVoxelId
    
    if (!selectedVoxelId || !voxelMeshRef.current) {
      return
    }
    
    const snapshot = voxelMeshRef.current.deleteVoxel(selectedVoxelId)
    if (snapshot) {
      
      // アクション履歴に追加
      actionHistoryRef.current?.pushAction(
        'deleteVoxel',
        {
          voxelId: selectedVoxelId,
          position: snapshot.position,
          voxelData: snapshot
        },
        `ボクセルを削除: ${selectedVoxelId}`,
        'main'
      )
      
      updateVoxelMeshRef.current?.()
      ;(canvasRef.current as any).selectedVoxelId = null
      setSelectedVoxelId(null)
      updateUndoRedoButtons()
    }
  }

  const handlePaintFace = (): void => {
    // state ではなく canvas に保存された値を使う
    const voxelId = (canvasRef.current as any)?.selectedVoxelId
    const faceId = (canvasRef.current as any)?.selectedFaceId
    
    if (!voxelId || !voxelMeshRef.current || !meshGroupRef.current) {
      return
    }
    
    const voxel = voxelMeshRef.current.getVoxels().get(voxelId)
    if (voxel) {
      // 選択された面の ID を取得
      const targetFace = faceId
        ? voxel.faces.find((f) => f.id === faceId)
        : voxel.faces[0]

      if (targetFace) {
        const previousColor = targetFace.color || '#808080'
        voxelMeshRef.current.colorSpecificFace(voxelId, targetFace.id, selectedColor)
        // メッシュの色を直接更新
        voxelMeshRef.current.updateMeshColor(meshGroupRef.current, voxelId, targetFace.id, selectedColor)
        
        // 更新されたメッシュの baseColor を新しい色に設定
        meshGroupRef.current.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.userData.voxelId === voxelId && child.userData.faceId === targetFace.id) {
              const colorValue = parseInt(selectedColor.replace('#', ''), 16)
              child.userData.baseColor = colorValue
            }
          }
        })

        // アクション履歴に追加
        actionHistoryRef.current?.pushAction(
          'colorFace',
          {
            faceId: targetFace.id,
            voxelId: voxelId,
            previousColor: previousColor,
            newColor: selectedColor
          },
          `面を着色: ${selectedColor}`,
          'main'
        )

        updateUndoRedoButtons()
      }
    }
  }

  const handleSave = async (): Promise<void> => {
    if (!voxelMeshRef.current) return
    
    try {
      // ファイル保存ダイアログを表示（タイムスタンプ付きのデフォルト名）
      const defaultFileName = `boxel_project_${new Date().toISOString().slice(0, 10)}_${new Date().getHours().toString().padStart(2, '0')}${new Date().getMinutes().toString().padStart(2, '0')}.glw`
      const result = await window.api.showSaveDialog(defaultFileName)
      if (result.canceled || !result.filePath) {
        return
      }

      const glwFile = FileManager.createGlwTemplate(gridSize.x, gridSize.y)
      glwFile.mainObject.voxels = Array.from(voxelMeshRef.current.getVoxels().values())
      
      // ファイルに保存
      const content = JSON.stringify(glwFile, null, 2)
      await window.api.saveProjectFile(result.filePath, content)
      alert(`プロジェクトを保存しました: ${result.filePath}`)
    } catch (error) {
      console.error('Failed to save project:', error)
      alert('プロジェクトの保存に失敗しました')
    }
  }

  const handleLoad = async (): Promise<void> => {
    if (!voxelMeshRef.current || !cameraRef.current || !meshGroupRef.current) {
      alert('プロジェクト読み込みに必要なオブジェクトが初期化されていません')
      return
    }

    try {
      // ファイル開くダイアログを表示
      const result = await window.api.showOpenDialog()
      if (result.canceled || result.filePaths.length === 0) {
        return
      }

      const filePath = result.filePaths[0]
      const content = await window.api.loadProjectFile(filePath)
      const glwFile = JSON.parse(content)

      // ボクセルメッシュをリセット
      meshGroupRef.current.clear()
      voxelMeshRef.current.clear()

      // ボクセルを復元
      if (glwFile.mainObject && glwFile.mainObject.voxels) {
        glwFile.mainObject.voxels.forEach((voxelData: any) => {
          voxelMeshRef.current?.restoreVoxel(voxelData.id, voxelData)
        })
      }

      // カメラをリセット
      cameraRef.current.position.set(0, 0, 20)
      cameraRef.current.lookAt(0, gridSize.y / 2, 0)

      // メッシュを再生成
      updateVoxelMeshRef.current?.()
      
      // undo/redoをリセット
      actionHistoryRef.current?.clear()
      updateUndoRedoButtons()

      alert(`プロジェクトを読み込みました: ${filePath}`)
    } catch (error) {
      console.error('Failed to load project:', error)
      alert('プロジェクトの読み込みに失敗しました')
    }
  }

  const handleExport = async (): Promise<void> => {
    if (!voxelMeshRef.current) return

    try {
      // ファイル保存ダイアログを表示
      const defaultFileName = `boxel_${new Date().toISOString().slice(0, 10)}.gltf`
      const result = await window.api.showExportDialog(defaultFileName)
      
      if (result.canceled || !result.filePath) {
        return
      }

      // GLTFデータを生成（カラー情報を含める）
      const voxels = voxelMeshRef.current.getVoxels()
      const colorMap = voxelMeshRef.current.getColorMap()
      const gltfData = FileManager.createGltfData(voxels, colorMap)
      const gltfString = JSON.stringify(gltfData, null, 2)

      // ファイルに保存
      await window.api.saveGltfFile(result.filePath, gltfString)
      alert(`GLTFファイルをエクスポートしました: ${result.filePath}`)
    } catch (error) {
      console.error('Failed to export GLTF:', error)
      alert('GLTFエクスポートに失敗しました')
    }
  }

  // === 隣接オブジェクトハンドラー ===
  const handleAddAdjacentObject = async (direction: string, filePath: string): Promise<void> => {
    if (!adjacentObjectManagerRef.current) {
      console.error('[BoxelEditor] adjacentObjectManagerRef.current is null')
      return
    }

    try {
      const adjObj = await adjacentObjectManagerRef.current.addAdjacentObject(
        filePath,
        direction as 'up' | 'down' | 'left' | 'right' | 'front' | 'back',
        gridSize.x,
        gridSize.y
      )

      if (adjObj) {
        setAdjacentObjects(adjacentObjectManagerRef.current.getAllAdjacentObjects())
        updateAdjacentMeshesRef.current?.()
      } else {
        console.error('[BoxelEditor] adjObj is null')
        alert('隣接オブジェクトの追加に失敗しました')
      }
    } catch (error) {
      console.error('[BoxelEditor] Failed to add adjacent object:', error)
      alert('隣接オブジェクトの追加に失敗しました')
    }
  }

  const handleRemoveAdjacentObject = (objectId: string): void => {
    if (!adjacentObjectManagerRef.current) return

    if (adjacentObjectManagerRef.current.removeAdjacentObject(objectId)) {
      setAdjacentObjects(adjacentObjectManagerRef.current.getAllAdjacentObjects())
      updateAdjacentMeshesRef.current?.()
    }
  }

  const handleToggleAdjacentVisibility = (objectId: string): void => {
    if (!adjacentObjectManagerRef.current) return

    const obj = adjacentObjectManagerRef.current.getAdjacentObject(objectId)
    if (obj) {
      adjacentObjectManagerRef.current.setAdjacentObjectVisibility(objectId, !obj.visible)
      setAdjacentObjects([...adjacentObjectManagerRef.current.getAllAdjacentObjects()])
      updateAdjacentMeshesRef.current?.()
    }
  }

  const handleRotateAdjacentObject = (objectId: string): void => {
    if (!adjacentObjectManagerRef.current) return

    if (adjacentObjectManagerRef.current.rotateAdjacentObjectClockwise(objectId)) {
      setAdjacentObjects([...adjacentObjectManagerRef.current.getAllAdjacentObjects()])
      updateAdjacentMeshesRef.current?.()
    }
  }

  return (
    <div className="boxel-editor" onDoubleClick={(e) => {
      // canvas以外でのダブルクリックを無効化
      if ((e.target as HTMLElement).tagName !== 'CANVAS') {
        e.preventDefault()
        e.stopPropagation()
      }
    }}>
      <div className="main-content">
        <div className="toolbar">
        <button onClick={handleAddVoxel} disabled={!selectedVoxelId}>
          追加
        </button>
        <button onClick={handleDeleteVoxel} disabled={!selectedVoxelId}>
          削除
        </button>
        <button onClick={handlePaintFace} disabled={!selectedVoxelId}>
          着色
        </button>
        <button onClick={handleLoad}>開く</button>
        <button onClick={handleSave}>保存</button>
        <button onClick={handleExport}>エクスポート</button>
        <button onClick={() => {
          const action = actionHistoryRef.current?.peekUndo()
          if (action) {
            applyActionReverse(action)
            actionHistoryRef.current?.undo()
            updateVoxelMeshRef.current?.()
            updateUndoRedoButtons()
          }
        }} disabled={!canUndo}>
          アンドゥ
        </button>
        <button onClick={() => {
          const action = actionHistoryRef.current?.redo()
          if (action) {
            applyAction(action)
            updateVoxelMeshRef.current?.()
            updateUndoRedoButtons()
          }
        }} disabled={!canRedo}>
          リドゥ
        </button>
        </div>

        <div className="status-bar">
          <span>グリッドサイズ: {gridSize.x} × {gridSize.y} × {gridSize.z}</span>
          <span>頂点数: {vertexCount}</span>
          <span>ボクセル数: {voxelCount}</span>
          <span>選択: {selectedVoxelId ? selectedVoxelId : 'なし'}</span>
          <span>色: {selectedColor}</span>
          <span>隣接: {adjacentObjects.length}</span>
        </div>

        <div className="instructions">
          <p>クリック=選択 · WASD=回転 · 矢印=パン · Q=ズーム</p>
        </div>

        <canvas
          ref={canvasRef}
          id="three-canvas"
          style={{ width: '100%', height: 'calc(100vh - 130px)', display: 'block' }}
        />
      </div>

      {/* 右サイドパネル - 隣接オブジェクト */}
      <div className="side-panel right-panel">
        <AdjacentObjectPanel
          adjacentObjects={adjacentObjects}
          onAddAdjacentObject={handleAddAdjacentObject}
          onRemoveAdjacentObject={handleRemoveAdjacentObject}
          onToggleVisibility={handleToggleAdjacentVisibility}
          onRotateObject={handleRotateAdjacentObject}
        />
      </div>
    </div>
  )
}

export default BoxelEditor
