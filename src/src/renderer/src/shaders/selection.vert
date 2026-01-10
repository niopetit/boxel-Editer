// Selection Highlight Vertex Shader
// 選択ハイライト表示用の頂点シェーダー

uniform float uOutlineWidth;
uniform bool uIsSelected;

varying vec3 vNormal;

void main() {
  vec3 newPosition = position;
  
  if (uIsSelected) {
    // 法線方向に膨張させてアウトラインを作成
    newPosition = position + normal * uOutlineWidth;
  }
  
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
