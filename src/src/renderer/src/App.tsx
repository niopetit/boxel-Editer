import './App.css'
import { useState } from 'react'
import BoxelEditor from './components/BoxelEditor'
import ColorPaletteSidebar from './components/ColorPaletteSidebar'

function App(): JSX.Element {
  const [gridSize, setGridSize] = useState({ x: 10, y: 10, z: 10 })
  const [showSetup, setShowSetup] = useState(true)
  const [inputX, setInputX] = useState('10')
  const [inputY, setInputY] = useState('10')
  const [inputZ, setInputZ] = useState('10')
  const [selectedColor, setSelectedColor] = useState('#FF0000')

  const handleStart = (): void => {
    const x = Math.max(1, Math.min(50, parseInt(inputX) || 10))
    const y = Math.max(1, Math.min(50, parseInt(inputY) || 10))
    const z = Math.max(1, Math.min(50, parseInt(inputZ) || 10))
    setGridSize({ x, y, z })
    setShowSetup(false)
  }

  if (showSetup) {
    return (
      <div className="setup-screen">
        <div className="setup-dialog">
          <h1>Boxel Editor</h1>
          <p>グリッドサイズを指定してください（1～50）</p>
          
          <div className="setup-form">
            <div className="form-group">
              <label>X軸:</label>
              <input
                type="number"
                min="1"
                max="50"
                value={inputX}
                onChange={(e) => setInputX(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Y軸:</label>
              <input
                type="number"
                min="1"
                max="50"
                value={inputY}
                onChange={(e) => setInputY(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Z軸:</label>
              <input
                type="number"
                min="1"
                max="50"
                value={inputZ}
                onChange={(e) => setInputZ(e.target.value)}
              />
            </div>
            
            <button className="start-button" onClick={handleStart}>
              開始
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <ColorPaletteSidebar selectedColor={selectedColor} onColorSelect={setSelectedColor} />
      <div className="app">
        <BoxelEditor gridSize={gridSize} selectedColor={selectedColor} />
      </div>
    </div>
  )
}

export default App
