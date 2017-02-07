module.exports = 
`
mat4 look_at (vec3 eye, vec3 center, vec3 up) {
  vec3 f = normalize(center - eye);
  vec3 s = cross(f, up);
  vec3 u = cross(s, f);

  return mat4(
    vec4(s, 0.0),
    vec4(u, 0.0),
    vec4(-f, 0.0),
    vec4(0.0, 0.0, 0.0, 1));
}
`
