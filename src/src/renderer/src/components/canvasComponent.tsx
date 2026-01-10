import { useEffect, useRef } from 'react'
import * as THREE from 'three'

function CanvasComponent(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // シーンの作成
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a1a)

    // カメラの作成
    const width = canvasRef.current.clientWidth || 800
    const height = canvasRef.current.clientHeight || 600
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.z = 5

    // レンダラーの作成
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)

    // キューブの作成
    const geometry = new THREE.BoxGeometry(2, 2, 2)
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 })
    const cube = new THREE.Mesh(geometry, material)
    scene.add(cube)

    // ライトの追加
    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(5, 5, 5)
    scene.add(light)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    // ウィンドウリサイズ対応
    const handleResize = (): void => {
      if (!canvasRef.current) return
      const newWidth = canvasRef.current.clientWidth || 800
      const newHeight = canvasRef.current.clientHeight || 600
      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }

    window.addEventListener('resize', handleResize)

    // アニメーションループ
    let animationId: number

    const animate = (): void => {
      animationId = requestAnimationFrame(animate)

      // キューブの回転
      cube.rotation.x += 0.01
      cube.rotation.y += 0.01

      renderer.render(scene, camera)
    }

    animate()

    // クリーンアップ
    return (): void => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      id="three-canvas"
      style={{ width: '100%', height: '100vh', display: 'block' }}
    />
  )
}

export default CanvasComponent
