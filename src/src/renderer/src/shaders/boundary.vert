#version 300 es
precision highp float;

// 入力
in vec3 position;
in vec3 normal;
in vec3 barycentric;

// uniform
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;

// 出力
out vec3 vBarycentric;
out vec3 vNormal;

void main() {
  vec3 worldPosition = vec3(uModelMatrix * vec4(position, 1.0));
  vNormal = normalize(uNormalMatrix * normal);
  vBarycentric = barycentric;
  
  gl_Position = uProjectionMatrix * uViewMatrix * vec4(worldPosition, 1.0);
}
