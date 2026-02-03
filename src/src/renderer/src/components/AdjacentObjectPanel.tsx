/**
 * AdjacentObjectPanel
 * 隣接オブジェクト配置パネル
 * 複数オブジェクト配置仕様書に準拠
 */

import { useState } from 'react'
import { AdjacentObject } from '../types/index'
import './styles/AdjacentObjectPanel.css'

interface AdjacentObjectPanelProps {
  adjacentObjects: AdjacentObject[]
  onAddAdjacentObject: (direction: string, filePath: string) => void
  onRemoveAdjacentObject: (objectId: string) => void
  onToggleVisibility: (objectId: string) => void
  onRotateObject: (objectId: string) => void
  onSetPosition?: (objectId: string, position: { x: number; y: number; z: number }) => void
}

type Direction = 'up' | 'down' | 'left' | 'right' | 'front' | 'back'

const directionLabels: Record<Direction, string> = {
  up: '上 (Y+)',
  down: '下 (Y-)',
  left: '左 (X-)',
  right: '右 (X+)',
  front: '前 (Z-)',
  back: '後 (Z+)'
}

function AdjacentObjectPanel({
  adjacentObjects,
  onAddAdjacentObject,
  onRemoveAdjacentObject,
  onToggleVisibility,
  onRotateObject,
  onSetPosition
}: AdjacentObjectPanelProps): JSX.Element {
  const [showDialog, setShowDialog] = useState(false)
  const [selectedDirection, setSelectedDirection] = useState<Direction>('up')
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleAddClick = (): void => {
    setShowDialog(true)
  }

  const handleSelectFile = async (): Promise<void> => {
    try {
      const result = await window.api.showGltfOpenDialog()
      if (!result.canceled && result.filePaths.length > 0) {
        onAddAdjacentObject(selectedDirection, result.filePaths[0])
        setShowDialog(false)
      }
    } catch (error) {
      console.error('Failed to open file dialog:', error)
    }
  }

  const handleCloseDialog = (): void => {
    setShowDialog(false)
  }

  const getFileName = (filePath: string): string => {
    const parts = filePath.split('/')
    return parts[parts.length - 1] || filePath
  }

  return (
    <div className={`adjacent-object-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="panel-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span className="panel-title">隣接オブジェクト</span>
        <span className="panel-toggle">{isCollapsed ? '▶' : '▼'}</span>
      </div>

      {!isCollapsed && (
        <div className="panel-content">
          <button className="add-button" onClick={handleAddClick}>
            + 隣接オブジェクトを追加
          </button>

          <div className="object-list">
            {adjacentObjects.length === 0 && (
              <div className="empty-message">
                配置されている隣接オブジェクトはありません
              </div>
            )}
            {adjacentObjects.length > 0 && adjacentObjects.map((obj) => (
                <div key={obj.id} className="object-item">
                  <div className="object-info">
                    <span className="object-direction">{directionLabels[obj.direction]}</span>
                    <span className="object-filename" title={obj.filePath}>
                      {getFileName(obj.filePath)}
                    </span>
                    <span className="object-size">
                      {obj.gridSizeX}×{obj.gridSizeY}
                    </span>
                  </div>
                  <div className="object-actions">
                    <button
                      className="rotate-button"
                      onClick={() => onRotateObject(obj.id)}
                      title="時計回りに回転"
                    >
                      ↻
                    </button>
                    <button
                      className={`visibility-button ${obj.visible ? 'visible' : 'hidden'}`}
                      onClick={() => onToggleVisibility(obj.id)}
                      title={obj.visible ? '非表示にする' : '表示する'}
                    >
                      {obj.visible ? '👁' : '👁‍🗨'}
                    </button>
                    <button
                      className="remove-button"
                      onClick={() => onRemoveAdjacentObject(obj.id)}
                      title="削除"
                    >
                      ✕
                    </button>
                    {/* 位置調整ボタン（X/Y/Z 各行、0.25単位） */}
                    <div className="position-controls">
                      <div className="pos-row">
                        <button className="visibility-button" onClick={() => onSetPosition?.(obj.id, { x: obj.position.x + 0.25, y: obj.position.y, z: obj.position.z })}>X+</button>
                        <button className="visibility-button" onClick={() => onSetPosition?.(obj.id, { x: obj.position.x - 0.25, y: obj.position.y, z: obj.position.z })}>X-</button>
                      </div>
                      <div className="pos-row">
                        <button className="visibility-button" onClick={() => onSetPosition?.(obj.id, { x: obj.position.x, y: obj.position.y + 0.25, z: obj.position.z })}>Y+</button>
                        <button className="visibility-button" onClick={() => onSetPosition?.(obj.id, { x: obj.position.x, y: obj.position.y - 0.25, z: obj.position.z })}>Y-</button>
                      </div>
                      <div className="pos-row">
                        <button className="visibility-button" onClick={() => onSetPosition?.(obj.id, { x: obj.position.x, y: obj.position.y, z: obj.position.z + 0.25 })}>Z+</button>
                        <button className="visibility-button" onClick={() => onSetPosition?.(obj.id, { x: obj.position.x, y: obj.position.y, z: obj.position.z - 0.25 })}>Z-</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>

          <div className="stats">
            <span>配置数: {adjacentObjects.length}</span>
          </div>
        </div>
      )}

      {/* 追加ダイアログ */}
      {showDialog && (
        <div className="dialog-overlay" onClick={handleCloseDialog}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>隣接オブジェクトを追加</h3>
              <button className="dialog-close" onClick={handleCloseDialog}>
                ✕
              </button>
            </div>

            <div className="dialog-content">
              <div className="step">
                <label>1. 配置方向を選択</label>
                <div className="direction-selector">
                  {(Object.keys(directionLabels) as Direction[]).map((dir) => (
                    <button
                      key={dir}
                      className={`direction-button ${selectedDirection === dir ? 'selected' : ''}`}
                      onClick={() => setSelectedDirection(dir)}
                    >
                      {directionLabels[dir]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="step">
                <label>2. GLTFファイルを選択</label>
                <button className="select-file-button" onClick={handleSelectFile}>
                  ファイルを選択...
                </button>
              </div>
            </div>

            <div className="dialog-footer">
              <button className="cancel-button" onClick={handleCloseDialog}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdjacentObjectPanel
