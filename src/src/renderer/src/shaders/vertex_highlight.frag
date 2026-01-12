#version 300 es
precision highp float;

// 入力
in float vAlpha;

// uniform
uniform vec3 uVertexColor;
uniform float uGlow;

// 出力
out vec4 outColor;

void main() {
  // 頂点カラーにグロウ効果を追加
  vec3 glowColor = uVertexColor * (1.0 + uGlow);
  
  outColor = vec4(glowColor, vAlpha);
}
