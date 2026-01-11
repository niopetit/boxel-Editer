import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { VoxelMesh } from '../lib/VoxelMesh'
import { CameraController } from '../lib/CameraController'
import { ActionHistory } from '../lib/ActionHistory'
import { ColorSystem } from '../lib/ColorSystem'
import { FileManager } from '../lib/FileManager'
import './styles/BoxelEditor.css'

interface BoxelEditorProps {
  gridSize: { x: number; y: number; z: number }
}

function BoxelEditor({ gridSize }: BoxelEditorProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [vertexCount, setVertexCount] = useState(0)
  const [voxelCount, setVoxelCount] = useState(0)
  const [selectedColor, setSelectedColor] = useState('#FF0000')
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [selectedVoxelId, setSelectedVoxelId] = useState<string | null>(null)

  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const voxelMeshRef = useRef<VoxelMesh | null>(null)
  const cameraControllerRef = useRef<CameraController | null>(null)
  const actionHistoryRef = useRef<ActionHistory | null>(null)
  const colorSystemRef = useRef<ColorSystem | null>(null)
  const meshGroupRef = useRef<THREE.Group | null>(null)
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const animationIdRef = useRef<number>(0)
  const updateVoxelMeshRef = useRef<(() => void) | null>(null)
  const previouslySelectedMeshRef = useRef<THREE.Mesh | null>(null)
  const previouslyHoveredMeshRef = useRef<THREE.Mesh | null>(null)

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
    console.log('[BoxelEditor] VoxelMesh created')
    console.log(`[BoxelEditor] Grid size: ${gridSize.x} x ${gridSize.y} x ${gridSize.z}`)
    
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
    console.log(`[BoxelEditor] Added ${gridSize.x * gridSize.y * gridSize.z} voxels (${gridSize.x}×${gridSize.y}×${gridSize.z} cube)`)
    console.log(`[BoxelEditor] Bottom face at y=0, X-Z center at (0, 0)`)
    console.log(`[BoxelEditor] Total voxels: ${voxelMesh.getVoxelCount()}`)

    // === メッシュをシーンに追加 ===
    const meshGroup = new THREE.Group()
    const threeMesh = voxelMesh.toThreeMesh()
    console.log(`[BoxelEditor] Three.js mesh created with ${threeMesh.children.length} children`)
    
    // threeMeshはGROUPなので、その子要素をmeshGroupに直接追加
    // 注: children は リアルタイムコレクションなので、スプレッド演算子でコピーを作成
    const initialChildrenCopy = [...threeMesh.children]
    initialChildrenCopy.forEach((child) => {
      meshGroup.add(child)
    })
    console.log(`[BoxelEditor] Added ${meshGroup.children.length} meshes to meshGroup`)
    
    scene.add(meshGroup)
    meshGroupRef.current = meshGroup
    console.log(`[BoxelEditor] Mesh added to scene`)

    // === メッシュ更新ヘルパー関数 ===
    const updateVoxelMesh = (): void => {
      if (!meshGroupRef.current || !voxelMeshRef.current) return
      console.log('[updateVoxelMesh] Updating mesh...')
      console.log(`[updateVoxelMesh] Before clear: meshGroup has ${meshGroupRef.current.children.length} children`)
      
      // ハイライト参照をクリア
      previouslySelectedMeshRef.current = null
      previouslyHoveredMeshRef.current = null
      
      // 既存のメッシュをクリア
      meshGroupRef.current.clear()
      console.log(`[updateVoxelMesh] After clear: meshGroup has ${meshGroupRef.current.children.length} children`)
      
      // 新しいメッシュを生成
      const newMesh = voxelMeshRef.current.toThreeMesh()
      console.log(`[updateVoxelMesh] Generated newMesh with ${newMesh.children.length} children`)
      
      // newMeshはGROUPなので、その子要素をmeshGroupに直接追加
      // 注: children は リアルタイムコレクションなので、スプレッド演算子でコピーを作成
      const childrenCopy = [...newMesh.children]
      childrenCopy.forEach((child) => {
        meshGroupRef.current?.add(child)
      })
      
      console.log(`[updateVoxelMesh] After add: meshGroup has ${meshGroupRef.current.children.length} children`)
      console.log(`[updateVoxelMesh] Updated with ${voxelMeshRef.current.getVoxelCount()} voxels`)
      setVertexCount(voxelMeshRef.current.getVertexCount())
      setVoxelCount(voxelMeshRef.current.getVoxelCount())
    }
    updateVoxelMeshRef.current = updateVoxelMesh

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
            if (baseColor && previouslyHoveredMeshRef.current.material instanceof THREE.MeshBasicMaterial) {
              previouslyHoveredMeshRef.current.material.color.setHex(baseColor)
            }
          }
        }

        // 新しいホバー対象が選択されていなければホバーハイライトを適用
        if (mesh !== previouslySelectedMeshRef.current) {
          if (mesh.material instanceof THREE.MeshBasicMaterial) {
            // 元の色を保存（baseColorはメッシュ更新時に設定される）
            if (!mesh.userData.baseColor) {
              mesh.userData.baseColor = mesh.material.color.getHex()
            }
            // 青色でホバーハイライト
            mesh.material.color.setHex(0x0099FF)
            previouslyHoveredMeshRef.current = mesh
          }
        } else {
          // 選択されているメッシュをホバーした場合、ホバー参照をクリア（選択色を維持）
          previouslyHoveredMeshRef.current = null
        }
      } else {
        // ホバー対象がなくなった場合、ホバーハイライトを解除
        if (previouslyHoveredMeshRef.current && previouslyHoveredMeshRef.current !== previouslySelectedMeshRef.current) {
          const baseColor = previouslyHoveredMeshRef.current.userData.baseColor
          if (baseColor && previouslyHoveredMeshRef.current.material instanceof THREE.MeshBasicMaterial) {
            previouslyHoveredMeshRef.current.material.color.setHex(baseColor)
          }
        }
        previouslyHoveredMeshRef.current = null
      }
    }

    // === マウスイベント: クリック ===
    const handleMouseClick = (event: MouseEvent): void => {
      console.log('[handleMouseClick] Canvas clicked')
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

      console.log('[handleMouseClick] Total meshes in meshGroup:', meshes.length)

      const intersects = raycasterRef.current.intersectObjects(meshes, false)

      console.log('[handleMouseClick] Intersects:', intersects.length)

      if (intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh

        console.log('[handleMouseClick] Hit object:', mesh.name || 'unnamed')
        console.log('[handleMouseClick] Hit object userData:', mesh.userData)

        // 前回選択されたメッシュのハイライトを解除
        if (previouslySelectedMeshRef.current && previouslySelectedMeshRef.current !== mesh) {
          const baseColor = previouslySelectedMeshRef.current.userData.baseColor
          if (baseColor && previouslySelectedMeshRef.current.material instanceof THREE.MeshBasicMaterial) {
            previouslySelectedMeshRef.current.material.color.setHex(baseColor)
          }
          previouslyHoveredMeshRef.current = null
        }

        // メッシュのuserDataからボクセルIDと面IDを取得
        if (mesh.userData.voxelId && mesh.userData.faceId) {
          const voxelId = mesh.userData.voxelId as string
          const faceId = mesh.userData.faceId as string

          setSelectedVoxelId(voxelId)
          console.log('✓ Selected voxel:', voxelId, 'face:', faceId)

          // 選択メッシュのハイライトを適用
          if (mesh.material instanceof THREE.MeshBasicMaterial) {
            // 元の色を保存（baseColorがなければ現在の色を保存）
            if (!mesh.userData.baseColor) {
              mesh.userData.baseColor = mesh.material.color.getHex()
            }
            // 黄色でハイライト
            mesh.material.color.setHex(0xFFFF00)
            previouslySelectedMeshRef.current = mesh
            previouslyHoveredMeshRef.current = null
          }

          // 選択された面を保存
          if (canvasRef.current) {
            ;(canvasRef.current as any).selectedFaceId = faceId
            ;(canvasRef.current as any).selectedVoxelId = voxelId
          }

          // 選択されたボクセルの面の色をパレットに反映
          if (voxelMeshRef.current) {
            const voxel = voxelMeshRef.current.getVoxel(voxelId)
            if (voxel) {
              const face = voxel.faces.find((f) => f.id === faceId)
              if (face && face.color) {
                console.log('[handleMouseClick] Setting color palette to:', face.color)
                setSelectedColor(face.color)
              }
            }
          }
        } else {
          console.log('[handleMouseClick] WARNING: userData missing or incomplete')
          console.log('[handleMouseClick] Available keys:', Object.keys(mesh.userData))
        }
      } else {
        console.log('[handleMouseClick] No intersection detected')
      }
    }

    // === キーボードイベント ===
    const handleKeyDown = (event: KeyboardEvent): void => {
      console.log('[handleKeyDown] Key pressed:', event.key, 'shift:', event.shiftKey, 'ctrl/cmd:', event.ctrlKey || event.metaKey, 'alt:', event.altKey || event.metaKey)
      
      // Undo/Redo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        if (event.shiftKey) {
          const action = actionHistoryRef.current?.redo()
          if (action) {
            applyActionReverse(action)
            console.log('Redo:', action.type)
          }
        } else {
          const action = actionHistoryRef.current?.peekUndo()
          if (action) {
            applyActionReverse(action)
            actionHistoryRef.current?.undo()
            console.log('Undo:', action.type)
          }
        }
        updateVoxelMeshRef.current?.()
        updateUndoRedoButtons()
      }

      // 削除: Alt + Backspace
      if ((event.altKey || event.metaKey) && event.key === 'Backspace') {
        event.preventDefault()
        if (selectedVoxelId && voxelMeshRef.current) {
          const snapshot = voxelMeshRef.current.deleteVoxel(selectedVoxelId)
          if (snapshot) {
            console.log('Voxel deleted:', selectedVoxelId)
            
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
            setSelectedVoxelId(null)
            updateUndoRedoButtons()
          }
        }
      }

      // 追加: Shift + キー 'n' (New)
      if (event.shiftKey && (event.key === 'n' || event.key === 'N')) {
        event.preventDefault()
        console.log('[handleKeyDown] ✓ Shift+N detected - attempting to add voxel')
        
        // クリック時に保存された voxelId を使う（state より信頼性がある）
        const selectedVoxelId = (canvasRef.current as any)?.selectedVoxelId
        console.log('[handleKeyDown] selectedVoxelId (from canvas):', selectedVoxelId)
        
        if (selectedVoxelId && voxelMeshRef.current) {
          const voxel = voxelMeshRef.current.getVoxels().get(selectedVoxelId)
          console.log('[handleKeyDown] voxel found:', voxel?.id, 'faces count:', voxel?.faces.length)
          
          if (voxel && voxel.faces.length > 0) {
            // 選択された面の ID を取得
            const selectedFaceId = (canvasRef.current as any)?.selectedFaceId
            console.log('[handleKeyDown] selectedFaceId:', selectedFaceId)
            
            const targetFaceId = selectedFaceId || voxel.faces[0].id
            const targetFace = voxel.faces.find((f) => f.id === targetFaceId)
            
            console.log('[handleKeyDown] targetFace:', targetFace?.id, 'normal:', targetFace?.normal)
            
            if (targetFace) {
              // voxelId と faceId を直接指定してボクセルを追加
              const newVoxel = voxelMeshRef.current.addVoxelAtFaceId(selectedVoxelId, targetFace.id)
              console.log('[handleKeyDown] addVoxelAtFaceId result:', newVoxel?.id || 'null')
              
              if (newVoxel) {
                console.log('✓ New voxel added:', newVoxel.id, 'at face:', targetFace.id)
                
                // アクション履歴に追加
                actionHistoryRef.current?.pushAction(
                  'addVoxel',
                  {
                    voxelId: newVoxel.id,
                    position: newVoxel.position,
                    adjacentDirection: targetFace.normal
                  },
                  `ボクセルを追加: ${newVoxel.id}`,
                  'main'
                )
                
                updateVoxelMeshRef.current?.()
                // 新しく追加されたボクセルを選択状態にする
                ;(canvasRef.current as any).selectedVoxelId = newVoxel.id
                setSelectedVoxelId(newVoxel.id)
                updateUndoRedoButtons()
              } else {
                console.log('[handleKeyDown] ✗ Failed to add voxel - position already exists')
              }
            }
          }
        } else {
          console.log('[handleKeyDown] ✗ No voxel selected or voxelMesh not initialized')
        }
      }

      // 着色: Alt + 'c'
      if ((event.altKey || event.metaKey) && event.key === 'c') {
        event.preventDefault()
        if (selectedVoxelId && voxelMeshRef.current && meshGroupRef.current) {
          const voxel = voxelMeshRef.current.getVoxels().get(selectedVoxelId)
          if (voxel) {
            // 選択された面を取得（レイキャスティングから）
            const selectedFaceId = (canvasRef.current as any)?.selectedFaceId
            const targetFace = selectedFaceId
              ? voxel.faces.find(f => f.id === selectedFaceId)
              : voxel.faces[0]

            if (targetFace) {
              const previousColor = targetFace.color || '#808080'
              voxelMeshRef.current.colorSpecificFace(selectedVoxelId, targetFace.id, selectedColor)
              
              // メッシュの色を直接更新（再生成しない）
              voxelMeshRef.current.updateMeshColor(meshGroupRef.current, selectedVoxelId, targetFace.id, selectedColor)

              // 更新されたメッシュの baseColor を新しい色に設定
              if (meshGroupRef.current) {
                meshGroupRef.current.children.forEach((child) => {
                  if (child instanceof THREE.Mesh) {
                    if (child.userData.voxelId === selectedVoxelId && child.userData.faceId === targetFace.id) {
                      const colorValue = parseInt(selectedColor.replace('#', ''), 16)
                      child.userData.baseColor = colorValue
                    }
                  }
                })
              }

              console.log('Face painted:', selectedVoxelId, targetFace.id, selectedColor)

              // アクション履歴に追加
              actionHistoryRef.current?.pushAction(
                'colorFace',
                {
                  faceId: targetFace.id,
                  voxelId: selectedVoxelId,
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
      }
    }

    // === アクション復元ヘルパー関数 ===
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
    document.addEventListener('keydown', handleKeyDown)
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
      document.removeEventListener('keydown', handleKeyDown)
      cancelAnimationFrame(animationIdRef.current)
      renderer.dispose()
    }
  }, [gridSize])

  const handleAddVoxel = (): void => {
    // canvas に保存された値を使う
    const selectedVoxelId = (canvasRef.current as any)?.selectedVoxelId
    const selectedFaceId = (canvasRef.current as any)?.selectedFaceId
    
    if (!selectedVoxelId || !voxelMeshRef.current) {
      console.log('[handleAddVoxel] No voxel selected')
      return
    }
    
    console.log('[handleAddVoxel] Adding voxel from:', selectedVoxelId, 'face:', selectedFaceId)
    const voxel = voxelMeshRef.current.getVoxels().get(selectedVoxelId)
    if (voxel && voxel.faces.length > 0) {
      const targetFaceId = selectedFaceId || voxel.faces[0].id
      const targetFace = voxel.faces.find((f) => f.id === targetFaceId)
      
      if (targetFace) {
        const newVoxel = voxelMeshRef.current.addVoxelAtFaceId(selectedVoxelId, targetFace.id)
        console.log('[handleAddVoxel] Result:', newVoxel?.id || 'null')
        
        if (newVoxel) {
          updateVoxelMeshRef.current?.()
          ;(canvasRef.current as any).selectedVoxelId = newVoxel.id
          setSelectedVoxelId(newVoxel.id)
        }
      }
    }
  }

  const handleDeleteVoxel = (): void => {
    const selectedVoxelId = (canvasRef.current as any)?.selectedVoxelId
    
    if (!selectedVoxelId || !voxelMeshRef.current) {
      console.log('[handleDeleteVoxel] No voxel selected')
      return
    }
    
    console.log('[handleDeleteVoxel] Deleting voxel:', selectedVoxelId)
    const deleted = voxelMeshRef.current.deleteVoxel(selectedVoxelId)
    if (deleted) {
      console.log('[handleDeleteVoxel] Voxel deleted successfully')
      updateVoxelMeshRef.current?.()
      ;(canvasRef.current as any).selectedVoxelId = null
      setSelectedVoxelId(null)
    }
  }

  const handlePaintFace = (): void => {
    // state ではなく canvas に保存された値を使う
    const voxelId = (canvasRef.current as any)?.selectedVoxelId
    const faceId = (canvasRef.current as any)?.selectedFaceId
    
    if (!voxelId || !voxelMeshRef.current || !meshGroupRef.current) {
      console.log('[handlePaintFace] No voxel selected')
      return
    }
    
    console.log('[handlePaintFace] Painting voxel:', voxelId, 'face:', faceId, 'color:', selectedColor)
    const voxel = voxelMeshRef.current.getVoxels().get(voxelId)
    if (voxel) {
      // 選択された面の ID を取得
      const targetFace = faceId
        ? voxel.faces.find((f) => f.id === faceId)
        : voxel.faces[0]

      if (targetFace) {
        console.log('[handlePaintFace] Coloring face:', targetFace.id)
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
      }
    }
  }

  const handleSave = async (): Promise<void> => {
    if (!voxelMeshRef.current) return
    const glwFile = FileManager.createGlwTemplate(gridSize.x, gridSize.y)
    glwFile.mainObject.voxels = Array.from(voxelMeshRef.current.getVoxels().values())
    await FileManager.saveGlw(`boxel_${Date.now()}.glw`, glwFile)
  }

  const handleExport = async (): Promise<void> => {
    if (!voxelMeshRef.current) return
    await FileManager.exportGltf(`boxel_${Date.now()}.gltf`, voxelMeshRef.current.getVoxels())
  }

  return (
    <div className="boxel-editor">
      <div className="toolbar">
        <button onClick={handleAddVoxel} disabled={!selectedVoxelId}>
          追加 (Shift+A)
        </button>
        <button onClick={handleDeleteVoxel} disabled={!selectedVoxelId}>
          削除 (Alt+Del)
        </button>
        <button onClick={handlePaintFace} disabled={!selectedVoxelId}>
          着色 (Alt+C)
        </button>
        <input
          type="color"
          value={selectedColor}
          onChange={(e) => setSelectedColor(e.target.value)}
          title="色を選択"
        />
        <button onClick={handleSave}>保存</button>
        <button onClick={handleExport}>エクスポート</button>
        <button onClick={() => actionHistoryRef.current?.undo()} disabled={!canUndo}>
          アンドゥ
        </button>
        <button onClick={() => actionHistoryRef.current?.redo()} disabled={!canRedo}>
          リドゥ
        </button>
      </div>

      <div className="status-bar">
        <span>グリッドサイズ: {gridSize.x} × {gridSize.y} × {gridSize.z}</span>
        <span>頂点数: {vertexCount}</span>
        <span>ボクセル数: {voxelCount}</span>
        <span>選択: {selectedVoxelId ? selectedVoxelId : 'なし'}</span>
        <span>色: {selectedColor}</span>
      </div>

      <div className="instructions">
        <p>クリック=選択 · A=追加 · Del=削除 · C=着色 · WASD=回転 · 矢印=パン · Q=ズーム</p>
      </div>

      <canvas
        ref={canvasRef}
        id="three-canvas"
        style={{ width: '100%', height: 'calc(100vh - 130px)', display: 'block' }}
      />
    </div>
  )
}

export default BoxelEditor
