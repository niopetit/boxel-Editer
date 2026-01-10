// Adjacent Object Fragment Shader
// 隣接オブジェクト（グレースケール）表示用のフラグメントシェーダー

varying vec3 vPosition;
varying vec3 vNormal;

uniform vec3 uCameraPosition;
uniform vec3 uLightPosition;
uniform float uAdjacentAlpha;

void main() {
  // ライト方向
  vec3 lightDir = normalize(uLightPosition - vPosition);
  
  // 視線方向
  vec3 viewDir = normalize(uCameraPosition - vPosition);
  
  // ディフューズ
  float diff = max(dot(vNormal, lightDir), 0.0);
  
  // グレースケール色（固定）
  vec3 grayColor = vec3(0.5, 0.5, 0.5);
  
  // 最終色
  vec3 finalColor = grayColor * (0.3 + 0.7 * diff);
  
  gl_FragColor = vec4(finalColor, uAdjacentAlpha);
}
