attribute vec3 barycentric;
attribute vec3 normal;

varying vec3 vBarycentric;
varying vec3 vNormal;

void main() {
  vBarycentric = barycentric;
  vNormal = normalize(normalMatrix * normal);
  
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
