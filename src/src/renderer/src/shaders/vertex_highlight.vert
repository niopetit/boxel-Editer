#version 300 es
precision highp float;

// 入力
in vec3 position;
in vec3 offset;

// uniform
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform float uVertexSize;
uniform float uHighlightSize;
uniform bool uIsSelected;

// 出力
out float vAlpha;

void main() {
  // スフィアのサイズを決定
  float size = uIsSelected ? uHighlightSize : uVertexSize;
  
  // スフィアのメッシュをスケール
  vec3 scaledOffset = offset * size;
  
  // 最終頂点座標
  vec3 worldPosition = vec3(uModelMatrix * vec4(position, 1.0)) + scaledOffset;
  
  // アルファ値（選択時は不透明度を上げる）
  vAlpha = uIsSelected ? 1.0 : 0.7;
  
  // クリップ空間の座標
  gl_Position = uProjectionMatrix * uViewMatrix * vec4(worldPosition, 1.0);
}
