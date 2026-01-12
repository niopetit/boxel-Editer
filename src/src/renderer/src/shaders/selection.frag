varying vec3 vBarycentric;
varying vec3 vNormal;

uniform vec3 uColor;

void main() {
  // グリッド線の処理（選択色の上に表示）
  vec3 bary = vBarycentric;
  float minBary = min(min(bary.x, bary.y), bary.z);
  float edge = smoothstep(0.02, 0.01, minBary);
  
  // グリッド線を黒で描画、それ以外は選択色
  gl_FragColor = edge > 0.5 ? vec4(0.0, 0.0, 0.0, 1.0) : vec4(uColor * 0.8, 1.0);
}
