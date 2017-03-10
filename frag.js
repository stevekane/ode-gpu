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
      const trans = `mat4(vec4(1, 0, 0, 0), vec4(0, 1, 0, 0), vec4(0, 0, 1, 0), texture2D(transforms, vec2(.75, ${ s.index / MAX_NODES })))`

      switch ( s.fn ) {
        case 'sdf_sphere': return `sdf_sphere((${ trans } * vec4(p, 1.)).xyz, ${ f(s.radius) })`
        case 'sdf_box':    return `sdf_box((${ trans } * vec4(p, 1.)).xyz, ${ fmt('vec3', s.dimensions) })`
        default:           throw new Error('Unknown primitive')
      } 
    case 'OPERATOR':
      switch ( s.operator ) {
        case 'sdf_union':
        case 'sdf_intersection':
        case 'sdf_difference':
          return `${ s.operator }(${ glsl(MAX_NODES, s.first) }, ${ glsl(MAX_NODES, s.second) })`
        case 'sdf_union_round': return `sdf_union_round(
          ${ glsl(MAX_NODES, s.first) }, 
          ${ glsl(MAX_NODES, s.second) }, 
          ${ f(s.radius) })`
        default:           throw new Error('Unknown operator')
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

    float vmax ( vec3 v ) {
      return max(max(v.x, v.y), v.z); 
    }

    float sdf_sphere ( vec3 p, float r ) {
      return length(p) - r;
    }

    float sdf_box ( vec3 p, vec3 b ) {
      vec3 d = abs(p) - b;

      return length(max(d, vec3(0))) + vmax(min(d, vec3(0)));
    }

    float sdf_union_round ( float a, float b, float r ) {
      vec2 u = max(vec2(r - a,r - b), vec2(0));

      return max(r, min (a, b)) - length(u);
    }

    float sdf_intersection ( float a, float b ) {
      return max(a, b); 
    }

    float sdf_union ( float a, float b ) {
      return min(a, b); 
    }

    float sdf_difference ( float a, float b ) {
      return max(a, -b); 
    }

    float sdf_repeat_along (inout float p, float size) {
      float halfsize = size * 0.5;
      float c = floor((p + halfsize)/size);

      p = mod(p + halfsize, size) - halfsize;
      return c;
    }

    float sdf_scene ( vec3 p ) {
      return ${ glsl(MAX_NODES, scene) };
    }

    vec3 normal ( vec3 pos ) {
      const vec3 v1 = vec3( 1.0, -1.0, -1.0);
      const vec3 v2 = vec3(-1.0, -1.0,  1.0);
      const vec3 v3 = vec3(-1.0,  1.0, -1.0);
      const vec3 v4 = vec3( 1.0,  1.0,  1.0);

      return normalize(
        v1 * sdf_scene(pos + v1 * EPSILON) +
        v2 * sdf_scene(pos + v2 * EPSILON) +
        v3 * sdf_scene(pos + v3 * EPSILON) +
        v4 * sdf_scene(pos + v4 * EPSILON));
    }

    vec3 phong_per_light ( vec3 k_d, vec3 k_s, float a, vec3 i, vec3 light, vec3 eye, vec3 p ) {
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
          ? i * (k_d * dotLN)
          : i * (k_d * dotLN + k_s * pow(dotRV, a)));
    }

    vec3 phong ( vec3 k_a, vec3 k_d, vec3 k_s, float a, vec3 light, vec3 eye, vec3 p ) {
      vec3 ambient = vec3(.1);
      vec3 color = ambient * k_a;
      vec3 intensity = vec3(1.);

      color += phong_per_light(k_d, k_s, a, intensity, light, eye, p);
      return color;
    }

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
        : vec4(phong(k_a, k_d, k_s, alpha, light, eye, p), 1);
    } 
  `
}
