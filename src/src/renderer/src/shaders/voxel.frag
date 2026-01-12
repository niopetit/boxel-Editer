#version 300 es
precision highp float;

// 入力
in vec3 vPosition;
in vec3 vNormal;
in vec3 vColor;

// uniform
uniform vec3 uLightPosition;
uniform vec3 uLightColor;
uniform float uAmbientIntensity;
uniform vec3 uCameraPosition;

// 出力
out vec4 outColor;

void main() {
  // ライト方向
  vec3 lightDir = normalize(uLightPosition - vPosition);
  
  // ビュー方向
  vec3 viewDir = normalize(uCameraPosition - vPosition);
  
  // アンビエント光
  vec3 ambient = vColor * uAmbientIntensity;
  
  // ディフューズ光
  float diffuse = max(dot(vNormal, lightDir), 0.0);
  vec3 diffuseColor = vColor * diffuse * uLightColor;
  
  // スペキュラー光（ボクセルは通常スペキュラーは弱い）
  vec3 reflectDir = reflect(-lightDir, vNormal);
  float specular = pow(max(dot(viewDir, reflectDir), 0.0), 16.0);
  vec3 specularColor = uLightColor * specular * 0.3;
  
  // 最終色
  vec3 finalColor = ambient + diffuseColor + specularColor;
  
  outColor = vec4(finalColor, 1.0);
}
