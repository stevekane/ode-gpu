// UTILS
exports.vmax = 
`
float vmax ( vec3 v ) {
  return max(max(v.x, v.y), v.z); 
}
`



// OPERATOR
exports.sdf_union_round = 
`
float sdf_union_round (float a, float b, float r) {
  vec2 u = max(vec2(r - a,r - b), vec2(0));

  return max(r, min (a, b)) - length(u);
}
`



// SPACE FOLDING
exports.repeat_along = 
`
float repeat_along (inout float p, float size) {
  float halfsize = size * 0.5;
  float c = floor((p + halfsize)/size);

  p = mod(p + halfsize, size) - halfsize;
  return c;
}
`




// PRIMITIVES
exports.sdf_sphere = 
`
float sdf_sphere ( vec3 p, float r ) {
  return length(p) - r;
}
`

exports.sdf_box = 
`
float sdf_box (vec3 p, vec3 b) {
  vec3 d = abs(p) - b;

  return length(max(d, vec3(0))) + vmax(min(d, vec3(0)));
}
`
