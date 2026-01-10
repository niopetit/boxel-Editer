// Vertex Highlight Fragment Shader
// 頂点ハイライト表示用のフラグメントシェーダー

varying float vAlpha;

uniform vec3 uVertexColor;
uniform float uGlow;

void main() {
  // ポイントスプライトで円形に描画
  vec2 cxy = 2.0 * gl_PointCoord - 1.0;
  float r = dot(cxy, cxy);
  if (r > 1.0) discard;
  
  // グロー効果
  float glow = uGlow * (1.0 - r);
  vec3 glowColor = uVertexColor + glow;
  
  gl_FragColor = vec4(glowColor, vAlpha);
}
