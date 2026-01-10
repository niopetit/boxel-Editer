// Vertex Highlight Vertex Shader
// 頂点ハイライト表示用の頂点シェーダー

uniform float uVertexSize;
uniform float uHighlightSize;
uniform bool uIsSelected;

varying float vAlpha;

void main() {
  float size = uIsSelected ? uHighlightSize : uVertexSize;
  
  // ビュー座標系での位置
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = size * (300.0 / -mvPosition.z); // 距離に応じてサイズを調整
  
  vAlpha = uIsSelected ? 1.0 : 0.7;
}
