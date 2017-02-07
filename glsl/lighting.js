exports.normal = 
`
vec3 normal ( vec3 p ) {
  return normalize(vec3(
    sdf_scene(vec3(p.x + EPSILON, p.y, p.z)) - sdf_scene(vec3(p.x - EPSILON, p.y, p.z)),
    sdf_scene(vec3(p.x, p.y + EPSILON, p.z)) - sdf_scene(vec3(p.x, p.y - EPSILON, p.z)),
    sdf_scene(vec3(p.x, p.y, p.z + EPSILON)) - sdf_scene(vec3(p.x, p.y, p.z - EPSILON))
  ));
}
`

exports.phong_per_light = 
`
vec3 phong_per_light ( vec3 k_d, vec3 k_s, float alpha, vec3 intensity, vec3 light, vec3 eye, vec3 p ) {
  vec3 n = normal(p);
  vec3 l = normalize(light - p);
  vec3 v = normalize(eye - p);
  vec3 r = normalize(reflect(-l, n));
  float dotLN = dot(l, n);
  float dotRV = dot(r, v);
  float dist_squared = pow(l.x - p.x, 2.) + pow(l.y - p.y, 2.) + pow(l.z - p.z, 2.);
  float attenuation = 1. / (.01 * dist_squared + 1.);

  return attenuation * (dotLN < 0. 
    ? vec3(0.)
    : dotRV < 0.
      ? intensity * (k_d * dotLN)
      : intensity * (k_d * dotLN + k_s * pow(dotRV, alpha)));
}
`

exports.phong_illumination = 
`
vec3 phong_illumination ( vec3 k_a, vec3 k_d, vec3 k_s, float alpha, vec3 light, vec3 eye, vec3 p ) {
  vec3 ambient = vec3(.1);
  vec3 color = ambient * k_a;
  vec3 intensity = vec3(1.);

  color += phong_per_light(k_d, k_s, alpha, intensity, light, eye, p);
  return color;
}
`  
