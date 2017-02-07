exports.to_surface =
`
float to_surface ( vec3 eye, vec3 dir ) {
  float depth = MIN_DIST;

  for ( int i = 0; i < MARCH_STEPS; i++) {
    float dist = sdf_scene(dir * depth + eye); 

    if ( dist < EPSILON ) return depth;
    
    depth += dist;

    if ( depth >= MAX_DIST ) return MAX_DIST; 
  }
  return MAX_DIST;
}
`
