import { useState, useEffect } from 'react'
import './styles/ColorPaletteSidebar.css'

interface ColorPaletteSidebarProps {
  selectedColor: string
  onColorSelect: (color: string) => void
}

interface SavedColor {
  id: string
  hex: string
  name: string
}

const MAX_SAVED_COLORS = 100

function ColorPaletteSidebar({ selectedColor, onColorSelect }: ColorPaletteSidebarProps): JSX.Element {
  const [pickerColor, setPickerColor] = useState(selectedColor)
  const [savedColors, setSavedColors] = useState<SavedColor[]>([])
  const [colorName, setColorName] = useState('')

  // ファイルからカラーパレットデータを読み込む
  useEffect(() => {
    const loadPalette = async (): Promise<void> => {
      try {
        const colors = await window.api.loadPaletteData()
        setSavedColors(colors)
      } catch (error) {
        console.error('Failed to load palette data:', error)
      }
    }

    loadPalette()
  }, [])

  // カラーパレットをファイルに保存
  const savePalette = async (colors: SavedColor[]): Promise<void> => {
    try {
      await window.api.savePaletteData(colors)
      setSavedColors(colors)
    } catch (error) {
      console.error('Failed to save palette data:', error)
    }
  }

  const handleAddColor = async (): Promise<void> => {
    if (savedColors.length >= MAX_SAVED_COLORS) {
      alert(`最大${MAX_SAVED_COLORS}個までカラーを登録できます`)
      return
    }

    const newColor: SavedColor = {
      id: `custom_${Date.now()}`,
      hex: pickerColor,
      name: colorName || `Color ${savedColors.length + 1}`,
    }

    const updatedColors = [...savedColors, newColor]
    await savePalette(updatedColors)
    setColorName('')
  }

  const handleDeleteColor = async (id: string): Promise<void> => {
    const updatedColors = savedColors.filter(c => c.id !== id)
    await savePalette(updatedColors)
  }

  const handleSavedColorClick = (color: SavedColor): void => {
    setPickerColor(color.hex)
    onColorSelect(color.hex)
  }

  return (
    <div className="color-palette-sidebar">
      <div className="sidebar-header">
        <h2>カラーパレット</h2>
      </div>

      {/* カラーピッカー */}
      <div className="color-picker-section">
        <h3>カラーピッカー</h3>
        <div className="picker-container">
          <input
            type="color"
            value={pickerColor}
            onChange={(e) => {
              setPickerColor(e.target.value)
              onColorSelect(e.target.value)
            }}
            className="color-input"
          />
          <div className="color-preview" style={{ backgroundColor: pickerColor }}></div>
        </div>

        <div className="color-hex-display">
          <span>{pickerColor.toUpperCase()}</span>
        </div>

        {/* 色の名前入力 */}
        <div className="color-name-input">
          <input
            type="text"
            placeholder="色の名前（オプション）"
            value={colorName}
            onChange={(e) => setColorName(e.target.value)}
            maxLength={20}
          />
          <button
            onClick={handleAddColor}
            disabled={savedColors.length >= MAX_SAVED_COLORS}
            className="add-color-btn"
            title={savedColors.length >= MAX_SAVED_COLORS ? `最大${MAX_SAVED_COLORS}個まで` : '現在の色を保存'}
          >
            保存
          </button>
        </div>
        </div>

      {/* 登録済みカラー */}
      <div className="saved-colors-section">
        <h3>
          登録済みカラー
          <span className="color-count">({savedColors.length}/{MAX_SAVED_COLORS})</span>
        </h3>
        <div className="colors-grid">
          {savedColors.map(color => (
            <div key={color.id} className="saved-color-item">
              <button
                className={`color-swatch ${selectedColor === color.hex ? 'selected' : ''}`}
                style={{ backgroundColor: color.hex }}
                onClick={() => handleSavedColorClick(color)}
                title={color.name}
              />
              <button
                className="delete-btn"
                onClick={() => handleDeleteColor(color.id)}
                title="削除"
              >
                ✕
              </button>
              <div className="color-label">{color.name}</div>
            </div>
          ))}
        </div>
        {savedColors.length === 0 && (
          <p className="empty-message">登録済みカラーはありません</p>
        )}
      </div>
    </div>
  )
}

export default ColorPaletteSidebar
