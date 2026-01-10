// Voxel Mesh Vertex Shader
// ボクセルメッシュ表示用の頂点シェーダー

varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vColor;

void main() {
  vPosition = vec3(modelMatrix * vec4(position, 1.0));
  vNormal = normalize(normalMatrix * normal);
  vColor = color;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
