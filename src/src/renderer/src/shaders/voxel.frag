// Voxel Mesh Fragment Shader
// ボクセルメッシュ表示用のフラグメントシェーダー

varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vColor;

uniform vec3 uLightPosition;
uniform vec3 uLightColor;
uniform float uAmbientIntensity;
uniform vec3 uCameraPosition;

void main() {
  // ライト方向
  vec3 lightDir = normalize(uLightPosition - vPosition);
  
  // 視線方向
  vec3 viewDir = normalize(uCameraPosition - vPosition);
  
  // ディフューズ
  float diff = max(dot(vNormal, lightDir), 0.0);
  
  // スペキュラー
  vec3 reflectDir = reflect(-lightDir, vNormal);
  float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
  
  // アンビエント
  vec3 ambient = uLightColor * uAmbientIntensity;
  
  // 最終色
  vec3 finalColor = ambient + (diff + spec) * uLightColor * vColor;
  
  gl_FragColor = vec4(finalColor, 1.0);
}
