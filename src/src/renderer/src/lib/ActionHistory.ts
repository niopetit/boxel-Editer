/**
 * ActionHistory
 * アンドゥ・リドゥシステムの実装
 * アンドゥリドゥ仕様書に準拠
 */

import { Action, ActionType, ActionData } from '../types/index'

export class ActionHistory {
  private undoStack: Action[] = []
  private redoStack: Action[] = []
  private readonly maxStackSize: number = 1000
  private actionIdCounter: number = 0

  /**
   * アクションをスタックに追加
   */
  pushAction(
    type: ActionType,
    data: ActionData,
    description: string,
    targetObject: 'main' | 'adjacent' = 'main'
  ): void {
    const action: Action = {
      id: `action_${this.actionIdCounter++}`,
      type,
      timestamp: new Date().toISOString(),
      description,
      data,
      targetObject
    }

    console.log('[ActionHistory.pushAction] Action pushed:', action.type, 'undoStack size:', this.undoStack.length + 1)

    // リドゥスタックをクリア（新しい操作が行われたため）
    this.redoStack = []

    // アンドゥスタックに追加
    this.undoStack.push(action)

    // スタックサイズ上限を超えた場合、古い操作を削除
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift()
    }

    this.onStackChanged()
  }

  /**
   * アンドゥを実行
   */
  undo(): Action | null {
    if (this.undoStack.length === 0) {
      console.warn('アンドゥできる操作がありません')
      return null
    }

    const action = this.undoStack.pop()
    if (action) {
      this.redoStack.push(action)
      this.onStackChanged()
    }

    return action || null
  }

  /**
   * リドゥを実行
   */
  redo(): Action | null {
    if (this.redoStack.length === 0) {
      console.warn('リドゥできる操作がありません')
      return null
    }

    const action = this.redoStack.pop()
    if (action) {
      this.undoStack.push(action)
      this.onStackChanged()
    }

    return action || null
  }

  /**
   * アンドゥが可能か判定
   */
  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  /**
   * リドゥが可能か判定
   */
  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /**
   * アンドゥスタックの最上位のアクションを取得（削除しない）
   */
  peekUndo(): Action | null {
    return this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1] : null
  }

  /**
   * リドゥスタックの最上位のアクションを取得（削除しない）
   */
  peekRedo(): Action | null {
    return this.redoStack.length > 0 ? this.redoStack[this.redoStack.length - 1] : null
  }

  /**
   * アンドゥスタックのサイズを取得
   */
  getUndoStackSize(): number {
    return this.undoStack.length
  }

  /**
   * リドゥスタックのサイズを取得
   */
  getRedoStackSize(): number {
    return this.redoStack.length
  }

  /**
   * すべての履歴をクリア
   */
  clear(): void {
    this.undoStack = []
    this.redoStack = []
    this.actionIdCounter = 0
    this.onStackChanged()
  }

  /**
   * 操作履歴を配列として取得
   */
  getHistory(): Action[] {
    return [...this.undoStack, ...this.redoStack]
  }

  /**
   * アクションを履歴に復元（ファイルから読み込み時に使用）
   */
  restoreAction(action: Action): void {
    this.undoStack.push(action)
    // アクションIDカウンターを更新
    const idNum = parseInt(action.id.split('_')[1] || '0', 10)
    if (idNum >= this.actionIdCounter) {
      this.actionIdCounter = idNum + 1
    }
    this.onStackChanged()
  }

  /**
   * すべての履歴を復元（ファイルから読み込み時に使用）
   */
  restoreHistory(actions: Action[]): void {
    this.undoStack = []
    this.redoStack = []
    for (const action of actions) {
      this.restoreAction(action)
    }
  }

  /**
   * 履歴をJSONにシリアライズ
   */
  serialize(): string {
    const history = {
      undoStack: this.undoStack,
      redoStack: this.redoStack
    }
    return JSON.stringify(history, null, 2)
  }

  /**
   * JSONから履歴を復元
   */
  deserialize(json: string): boolean {
    try {
      const history = JSON.parse(json)
      if (Array.isArray(history.undoStack) && Array.isArray(history.redoStack)) {
        this.undoStack = history.undoStack
        this.redoStack = history.redoStack
        this.onStackChanged()
        return true
      }
    } catch (e) {
      console.error('Failed to deserialize action history:', e)
    }
    return false
  }

  /**
   * スタック変更時のコールバック（UIの更新などに使用）
   */
  private onStackChanged(): void {
    // UIの状態を更新する必要がある場合、このメソッドをオーバーライドまたはカスタムハンドラを設定
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('undoRedoStackChanged', {
        detail: {
          canUndo: this.canUndo(),
          canRedo: this.canRedo(),
          undoStackSize: this.undoStack.length,
          redoStackSize: this.redoStack.length
        }
      })
      window.dispatchEvent(event)
    }
  }

  /**
   * スタックの統計情報を取得
   */
  getStats(): {
    undoStackSize: number
    redoStackSize: number
    totalStackSize: number
    maxStackSize: number
    actionIdCounter: number
  } {
    return {
      undoStackSize: this.undoStack.length,
      redoStackSize: this.redoStack.length,
      totalStackSize: this.undoStack.length + this.redoStack.length,
      maxStackSize: this.maxStackSize,
      actionIdCounter: this.actionIdCounter
    }
  }

  /**
   * スタックの妥当性を検証
   */
  validate(): boolean {
    const allActions = [...this.undoStack, ...this.redoStack]
    const ids = new Set<string>()

    for (const action of allActions) {
      if (!action.id || !action.type || !action.timestamp) {
        return false
      }
      if (ids.has(action.id)) {
        // IDが重複している
        return false
      }
      ids.add(action.id)
    }

    return true
  }
}
