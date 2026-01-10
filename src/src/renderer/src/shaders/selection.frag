// Selection Highlight Fragment Shader
// 選択ハイライト表示用のフラグメントシェーダー

varying vec3 vNormal;

uniform vec3 uSelectionColor;
uniform float uSelectionIntensity;

void main() {
  // 選択色を出力
  gl_FragColor = vec4(uSelectionColor, uSelectionIntensity);
}
