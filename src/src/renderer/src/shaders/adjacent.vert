// Adjacent Object Vertex Shader
// 隣接オブジェクト（グレースケール）表示用の頂点シェーダー

varying vec3 vPosition;
varying vec3 vNormal;

void main() {
  vPosition = vec3(modelMatrix * vec4(position, 1.0));
  vNormal = normalize(normalMatrix * normal);
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
