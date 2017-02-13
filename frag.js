const { vmax, sdf_union_round, repeat_along, sdf_sphere, sdf_box } = require('./glsl/sdf')
const { normal, phong_illumination, phong_per_light } = require('./glsl/lighting')
const { ray_direction, to_surface } = require('./glsl/ray_marching')

const map = (f, a) => { 
  const out = []

  for ( var i = 0; i < a.length; i++ ) 
    out.push(f(a[i])) 
  return out
}
const f = n => n.toPrecision(4)
const fmt = (n, v) => n + '(' + map(f, v).join(', ') + ')'

function glsl ( MAX_NODES, s ) {
  switch ( s.type ) {
    case 'SDF': 
      const mat = fmt('mat4', s.matrix)
      const trans = `mat4(
          texture2D(transforms, vec2(0, ${ s.index / MAX_NODES })),
          texture2D(transforms, vec2(.25, ${ s.index / MAX_NODES })),
          texture2D(transforms, vec2(.5, ${ s.index / MAX_NODES })),
          texture2D(transforms, vec2(.75, ${ s.index / MAX_NODES })))`

      switch ( s.fn ) {
        case 'SPHERE': return `sdf_sphere((${ trans } * vec4(p, 1.)).xyz, ${ f(s.radius) })`
        case 'BOX':    return `sdf_box((${ trans } * vec4(p, 1.)).xyz, ${ fmt('vec3', s.dimensions) })`
        default:       throw new Error('Unknown primitive')
      } 
    case 'OPERATOR':
      switch ( s.operator ) {
        case 'UNION_ROUND': return `sdf_union_round(
          ${ glsl(MAX_NODES, s.first) }, 
          ${ glsl(MAX_NODES, s.second) }, 
          ${ f(s.radius) })`
        default:          throw new Error('Unknown operator')
      } 
    default: throw new Error('Invalid scene type')
  }
}

module.exports = function ( MAX_NODES, scene ) {
  return `
    precision mediump float;

    uniform float tick;
    uniform float dT;
    uniform vec2 mouse;
    uniform vec2 viewport;
    uniform vec3 eye;
    uniform vec3 target;
    uniform mat4 camera_matrix;
    uniform vec3 light;
    uniform sampler2D transforms;
    
    const int MARCH_STEPS = 1024;
    const int MAX_EDITS = 2;
    const float MIN_DIST = 0.1;
    const float MAX_DIST = 1000.;
    const float EPSILON = 0.0001;
    const float FOV = 45.;
    const float FOV_FACTOR = 2. / tan(radians(45.));

    ${ vmax + sdf_union_round + repeat_along + sdf_sphere + sdf_box }

    float sdf_intersection ( float a, float b ) {
      return max(a, b); 
    }

    float sdf_union ( float a, float b ) {
      return min(a, b); 
    }

    float sdf_difference ( float a, float b ) {
      return max(a, -b); 
    }

    float sdf_scene ( vec3 p ) {
      return ${ glsl(MAX_NODES, scene) };
    }

    ${ normal + phong_per_light + phong_illumination }
    ${ to_surface }

    vec3 ray_direction ( vec2 size ) {
      vec2 xy = gl_FragCoord.xy - size / 2.;
      float z = FOV_FACTOR * size.y;

      return normalize(vec3(xy, -z));
    }

    void main () {
      vec3 dir = ray_direction(viewport);
      vec3 cam_dir = (vec4(dir, 1.0) * camera_matrix).xyz;
      float dist = to_surface(eye, cam_dir);
      vec3 p = dist * cam_dir + eye;
      vec3 k_a = vec3(.2);
      vec3 k_d = vec3(.7, .2, .2);
      vec3 k_s = vec3(1.);
      float alpha = 10.;

      gl_FragColor = dist > MAX_DIST - EPSILON
        ? vec4(0)
        : vec4(phong_illumination(k_a, k_d, k_s, alpha, light, eye, p), 1);
    } 
  `
}
