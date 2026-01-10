/**
 * ColorSystem
 * カラーパレット管理と着色処理
 * 着色システム仕様書に準拠
 */

import { ColorPalette, PaletteColor, RGBColor } from '../types/index'

export class ColorSystem {
  private palette: ColorPalette
  private readonly localStorageKey = 'boxeleditor_color_palette'
  private readonly defaultColors: PaletteColor[] = [
    { id: 'color_red', name: 'Red', hex: '#FF0000', rgb: { r: 255, g: 0, b: 0 }, custom: false },
    { id: 'color_green', name: 'Green', hex: '#00FF00', rgb: { r: 0, g: 255, b: 0 }, custom: false },
    { id: 'color_blue', name: 'Blue', hex: '#0000FF', rgb: { r: 0, g: 0, b: 255 }, custom: false },
    { id: 'color_yellow', name: 'Yellow', hex: '#FFFF00', rgb: { r: 255, g: 255, b: 0 }, custom: false },
    { id: 'color_cyan', name: 'Cyan', hex: '#00FFFF', rgb: { r: 0, g: 255, b: 255 }, custom: false },
    { id: 'color_magenta', name: 'Magenta', hex: '#FF00FF', rgb: { r: 255, g: 0, b: 255 }, custom: false },
    { id: 'color_white', name: 'White', hex: '#FFFFFF', rgb: { r: 255, g: 255, b: 255 }, custom: false },
    { id: 'color_black', name: 'Black', hex: '#000000', rgb: { r: 0, g: 0, b: 0 }, custom: false },
    { id: 'color_gray', name: 'Gray', hex: '#808080', rgb: { r: 128, g: 128, b: 128 }, custom: false }
  ]

  constructor() {
    this.palette = this.loadPalette()
  }

  /**
   * ローカルストレージからパレットを読み込む
   */
  private loadPalette(): ColorPalette {
    const savedPalette = localStorage.getItem(this.localStorageKey)
    if (savedPalette) {
      try {
        const colors = JSON.parse(savedPalette) as PaletteColor[]
        return {
          colors: [...this.defaultColors, ...colors.filter(c => c.custom)],
          selectedColorId: colors[0]?.id || this.defaultColors[0].id
        }
      } catch (e) {
        console.error('Failed to load color palette from localStorage:', e)
      }
    }

    return {
      colors: [...this.defaultColors],
      selectedColorId: this.defaultColors[0].id
    }
  }

  /**
   * パレットをローカルストレージに保存
   */
  private savePalette(): void {
    const customColors = this.palette.colors.filter(c => c.custom)
    localStorage.setItem(this.localStorageKey, JSON.stringify(customColors))
  }

  /**
   * パレットを取得
   */
  getPalette(): ColorPalette {
    return { ...this.palette }
  }

  /**
   * すべての色を取得
   */
  getColors(): PaletteColor[] {
    return [...this.palette.colors]
  }

  /**
   * 選択中の色を取得
   */
  getSelectedColor(): PaletteColor | null {
    return (
      this.palette.colors.find(c => c.id === this.palette.selectedColorId) ||
      this.palette.colors[0] ||
      null
    )
  }

  /**
   * 選択中の色を設定
   */
  setSelectedColor(colorId: string): boolean {
    const color = this.palette.colors.find(c => c.id === colorId)
    if (color) {
      this.palette.selectedColorId = colorId
      return true
    }
    return false
  }

  /**
   * 選択中の色をHEXで取得
   */
  getSelectedColorHex(): string {
    const color = this.getSelectedColor()
    return color?.hex || '#808080'
  }

  /**
   * 色をIDで取得
   */
  getColorById(colorId: string): PaletteColor | null {
    return this.palette.colors.find(c => c.id === colorId) || null
  }

  /**
   * HEXカラーから色を検索
   */
  getColorByHex(hex: string): PaletteColor | null {
    return this.palette.colors.find(c => c.hex === this.normalizeHex(hex)) || null
  }

  /**
   * カスタムカラーを追加
   */
  addCustomColor(name: string, hex: string): PaletteColor | null {
    const normalizedHex = this.normalizeHex(hex)
    const validRgb = this.hexToRgb(normalizedHex)
    if (!validRgb) return null

    // 既に存在する色かチェック
    if (this.palette.colors.some(c => c.hex === normalizedHex)) {
      console.warn('Color already exists:', normalizedHex)
      return null
    }

    const customColor: PaletteColor = {
      id: `custom_color_${Date.now()}`,
      name: name || `Color ${this.palette.colors.length + 1}`,
      hex: normalizedHex,
      rgb: validRgb,
      custom: true
    }

    this.palette.colors.push(customColor)
    this.savePalette()

    return customColor
  }

  /**
   * カスタムカラーを削除
   */
  deleteCustomColor(colorId: string): boolean {
    const color = this.palette.colors.find(c => c.id === colorId)
    if (!color || !color.custom) {
      console.warn('Cannot delete preset color or non-existent color:', colorId)
      return false
    }

    const index = this.palette.colors.indexOf(color)
    if (index > -1) {
      this.palette.colors.splice(index, 1)
      this.savePalette()

      // 削除した色が選択中だった場合、デフォルトに戻す
      if (this.palette.selectedColorId === colorId) {
        this.palette.selectedColorId = this.defaultColors[0].id
      }

      return true
    }

    return false
  }

  /**
   * カスタムカラーを編集
   */
  editCustomColor(colorId: string, name: string, hex: string): PaletteColor | null {
    const color = this.palette.colors.find(c => c.id === colorId)
    if (!color || !color.custom) {
      console.warn('Cannot edit preset color or non-existent color:', colorId)
      return null
    }

    const normalizedHex = this.normalizeHex(hex)
    const validRgb = this.hexToRgb(normalizedHex)
    if (!validRgb) return null

    color.name = name
    color.hex = normalizedHex
    color.rgb = validRgb

    this.savePalette()
    return color
  }

  /**
   * HEXを正規化（#RRGGBB形式）
   */
  private normalizeHex(hex: string): string {
    const cleaned = hex.replace(/^#/, '').toUpperCase()
    if (!/^[0-9A-F]{6}$/.test(cleaned)) {
      return '#808080' // デフォルト: グレー
    }
    return '#' + cleaned
  }

  /**
   * HEXをRGBに変換
   */
  private hexToRgb(hex: string): RGBColor | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return null

    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    }
  }

  /**
   * RGBをHEXに変換
   */
  static rgbToHex(rgb: RGBColor): string {
    const toHex = (n: number) => {
      const hex = n.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }
    return '#' + [rgb.r, rgb.g, rgb.b].map(toHex).join('').toUpperCase()
  }

  /**
   * RGB値を検証
   */
  static validateRgbValue(value: number): number {
    if (typeof value !== 'number') return 0
    if (value < 0) return 0
    if (value > 255) return 255
    return Math.floor(value)
  }

  /**
   * RGB値をパース
   */
  static parseRgbInput(text: string): RGBColor | null {
    const value = parseInt(text, 10)
    if (isNaN(value)) return null
    const validated = this.validateRgbValue(value)
    return { r: validated, g: validated, b: validated }
  }

  /**
   * HEX値をパース
   */
  parseHexInput(text: string): string | null {
    const cleaned = text.replace(/^#/, '').toUpperCase()
    if (!/^[0-9A-F]{6}$/.test(cleaned)) {
      return null
    }
    return '#' + cleaned
  }

  /**
   * 色を比較
   */
  compareColors(color1: PaletteColor, color2: PaletteColor): boolean {
    return color1.hex === color2.hex
  }

  /**
   * すべてのカスタムカラーを取得
   */
  getCustomColors(): PaletteColor[] {
    return this.palette.colors.filter(c => c.custom)
  }

  /**
   * すべてのプリセットカラーを取得
   */
  getPresetColors(): PaletteColor[] {
    return this.palette.colors.filter(c => !c.custom)
  }

  /**
   * パレットをJSONにシリアライズ
   */
  serialize(): string {
    return JSON.stringify(this.palette, null, 2)
  }

  /**
   * JSONからパレットを復元
   */
  deserialize(json: string): boolean {
    try {
      const palette = JSON.parse(json) as ColorPalette
      if (Array.isArray(palette.colors)) {
        this.palette = palette
        return true
      }
    } catch (e) {
      console.error('Failed to deserialize color palette:', e)
    }
    return false
  }

  /**
   * パレットをリセット（プリセットのみ）
   */
  reset(): void {
    this.palette = {
      colors: [...this.defaultColors],
      selectedColorId: this.defaultColors[0].id
    }
    localStorage.removeItem(this.localStorageKey)
  }
}
