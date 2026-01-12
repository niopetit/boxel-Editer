#version 300 es
precision highp float;

// 入力
in vec3 vBarycentric;
in vec3 vNormal;

// uniform
uniform vec3 uBoundaryColor;
uniform float uBoundaryWidth;
uniform vec3 uFaceColor;
uniform float uBoundaryIntensity;

// 出力
out vec4 outColor;

void main() {
  // 重心座標の最小値を計算（エッジからの距離を表す）
  float minBary = min(min(vBarycentric.x, vBarycentric.y), vBarycentric.z);
  
  // エッジの判定（線形ステップで滑らかに遷移）
  float edge = smoothstep(uBoundaryWidth, uBoundaryWidth * 1.5, minBary);
  
  // 面の色と境界線色をブレンド
  vec3 finalColor = mix(uBoundaryColor, uFaceColor, edge);
  
  // 境界線の濃度を適用
  float alpha = 1.0;
  if (minBary < uBoundaryWidth) {
    alpha = uBoundaryIntensity;
  }
  
  outColor = vec4(finalColor, alpha);
}
