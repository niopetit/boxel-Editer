#version 300 es
precision highp float;

// 入力
in vec3 vPosition;
in vec3 vNormal;

// uniform
uniform vec3 uCameraPosition;
uniform vec3 uLightPosition;
uniform float uAdjacentAlpha;

// 出力
out vec4 outColor;

void main() {
  // グレースケール色（固定値）
  vec3 baseColor = vec3(0.533, 0.533, 0.533); // #888888
  
  // ライト計算（アンビエント + ディフューズ）
  vec3 lightDir = normalize(uLightPosition - vPosition);
  float diffuse = max(dot(vNormal, lightDir), 0.0);
  
  vec3 finalColor = baseColor * (0.5 + 0.5 * diffuse);
  
  outColor = vec4(finalColor, uAdjacentAlpha);
}
