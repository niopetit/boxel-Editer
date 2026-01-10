/**
 * ColorPalette Component
 * カラーパレットのUI表示
 */

import { FC, useState, useCallback, useMemo, memo } from 'react'
import { ColorSystem } from '../lib/ColorSystem'
import { PaletteColor } from '../types/index'
import './ColorPalette.css'

interface ColorPaletteProps {
  colorSystem: ColorSystem
  onColorSelect: (hex: string) => void
  selectedColor: string
}

// 色サッチコンポーネント（メモ化）
const ColorSwatch = memo<{
  color: PaletteColor
  isSelected: boolean
  onColorClick: (hex: string) => void
  onDeleteColor: (colorId: string) => void
}>(({ color, isSelected, onColorClick, onDeleteColor }) => (
  <div
    className={`color-swatch ${isSelected ? 'selected' : ''}`}
    style={{ backgroundColor: color.hex }}
    onClick={() => onColorClick(color.hex)}
    title={color.name}
  >
    {color.custom && (
      <button
        className="delete-btn"
        onClick={(e) => {
          e.stopPropagation()
          onDeleteColor(color.id)
        }}
      >
        ×
      </button>
    )}
  </div>
))

ColorSwatch.displayName = 'ColorSwatch'

const ColorPalette: FC<ColorPaletteProps> = ({ colorSystem, onColorSelect, selectedColor }) => {
  const [colors, setColors] = useState<PaletteColor[]>(colorSystem.getColors())
  const [showCustomColorDialog, setShowCustomColorDialog] = useState(false)
  const [customColorName, setCustomColorName] = useState('')
  const [customColorHex, setCustomColorHex] = useState('#FF0000')

  // メモ化済みコールバック
  const handleColorClick = useCallback((hex: string) => {
    onColorSelect(hex)
    colorSystem.setSelectedColor(hex)
  }, [colorSystem, onColorSelect])

  const handleAddCustomColor = useCallback(() => {
    const newColor = colorSystem.addCustomColor(customColorName || `Color ${colors.length + 1}`, customColorHex)
    if (newColor) {
      setColors(colorSystem.getColors())
      setCustomColorName('')
      setCustomColorHex('#FF0000')
      setShowCustomColorDialog(false)
    }
  }, [colorSystem, colors.length, customColorName, customColorHex])

  const handleDeleteCustomColor = useCallback((colorId: string) => {
    const color = colorSystem.getColorById(colorId)
    if (color?.custom && window.confirm(`色 "${color.name}" を削除しますか？`)) {
      colorSystem.deleteCustomColor(colorId)
      setColors(colorSystem.getColors())
    }
  }, [colorSystem])

  // メモ化された色グリッド
  const colorGridMemo = useMemo(
    () =>
      colors.map(color => (
        <ColorSwatch
          key={color.id}
          color={color}
          isSelected={selectedColor === color.hex}
          onColorClick={handleColorClick}
          onDeleteColor={handleDeleteCustomColor}
        />
      )),
    [colors, selectedColor, handleColorClick, handleDeleteCustomColor]
  )

  return (
    <div className="color-palette">
      <div className="palette-header">
        <h3>カラーパレット</h3>
        <button className="add-color-btn" onClick={() => setShowCustomColorDialog(true)}>
          +
        </button>
      </div>

      <div className="palette-grid">
        {colorGridMemo}
      </div>

      {showCustomColorDialog && (
        <div className="custom-color-dialog">
          <div className="dialog-content">
            <h4>カスタムカラーを追加</h4>
            <div className="form-group">
              <label>色名:</label>
              <input
                type="text"
                value={customColorName}
                onChange={(e) => setCustomColorName(e.target.value)}
                placeholder="例: My Blue"
              />
            </div>
            <div className="form-group">
              <label>HEXコード:</label>
              <input
                type="color"
                value={customColorHex}
                onChange={(e) => setCustomColorHex(e.target.value)}
              />
              <input
                type="text"
                value={customColorHex}
                onChange={(e) => setCustomColorHex(e.target.value)}
                placeholder="#RRGGBB"
              />
            </div>
            <div className="dialog-buttons">
              <button onClick={handleAddCustomColor}>追加</button>
              <button onClick={() => setShowCustomColorDialog(false)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ColorPalette
