const regl = require('regl')({ extensions: [ 'OES_texture_float' ] })
const glslify = require('glslify')
const canvas = regl._gl.canvas

const fragToy = regl({
  vert: `
    precision mediump float;

    uniform float tick;
    uniform vec2 mouse;
    uniform vec2 viewport;

    attribute vec2 pos;

    void main () {
      gl_Position = vec4(pos, 0., 1.); 
    } 
  `,
  frag: glslify`
    precision mediump float;

    uniform float tick;
    uniform float dT;
    uniform vec2 mouse;
    uniform vec2 viewport;
    uniform vec3 eye;
    uniform vec3 target;
    uniform vec3 light;

    const vec3 up = vec3(0., 1., 0.);

    #define MARCH_STEPS 150
    #define MIN_DIST 0.0
    #define MAX_DIST 100.0
    #define EPSILON 0.01
    #define FOV 45.

    #pragma glslify: sdf_sphere = require('glsl-sdf-primitives/sdSphere')
    #pragma glslify: sdf_difference = require('glsl-sdf-ops/subtraction')
    #pragma glslify: sdf_intersection = require('glsl-sdf-ops/intersection')

    float sdf_union_round (float a, float b, float r) {
      vec2 u = max(vec2(r - a,r - b), vec2(0));

      return max(r, min (a, b)) - length(u);
    }

    float vmax ( vec3 v ) {
      return max(max(v.x, v.y), v.z); 
    }

    float sdf_box (vec3 p, vec3 b) {
      vec3 d = abs(p) - b;

      return length(max(d, vec3(0))) + vmax(min(d, vec3(0)));
    }

    float sdf_scene ( vec3 p ) {
      float r = 1.;
      float x = 0.;
      float y = sin(tick / 50.) - .5;
      float z = 0.;
      vec3 b = vec3(r * 1.2);
      mat4 m = mat4(1.,   0.,   0.,   0., 
                    0.,   1.,   0.,   0.,
                    0.,   0.,   1.,   0.,
                    x,    y,    z,    1.);

      return sdf_union_round (
        sdf_sphere((m * vec4(p, 1.)).xyz, r),
        sdf_box(p, b),
        .3
      );
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

    vec3 normal ( vec3 p ) {
      return normalize(vec3(
        sdf_scene(vec3(p.x + EPSILON, p.y, p.z)) - sdf_scene(vec3(p.x - EPSILON, p.y, p.z)),
        sdf_scene(vec3(p.x, p.y + EPSILON, p.z)) - sdf_scene(vec3(p.x, p.y - EPSILON, p.z)),
        sdf_scene(vec3(p.x, p.y, p.z + EPSILON)) - sdf_scene(vec3(p.x, p.y, p.z - EPSILON))
      ));
    }

    vec3 phong_per_light ( vec3 k_d, vec3 k_s, float alpha, vec3 intensity, vec3 light, vec3 eye, vec3 p ) {
      vec3 n = normal(p);
      vec3 l = normalize(light - p);
      vec3 v = normalize(eye - p);
      vec3 r = normalize(reflect(-l, n));
      float dotLN = dot(l, n);
      float dotRV = dot(r, v);

      return dotLN < 0. 
        ? vec3(0.)
        : dotRV < 0.
          ? intensity * (k_d * dotLN)
          : intensity * (k_d * dotLN + k_s * pow(dotRV, alpha));
    }

    vec3 phong_illumination ( vec3 k_a, vec3 k_d, vec3 k_s, float alpha, vec3 light, vec3 eye, vec3 p ) {
      vec3 ambient = vec3(.1);
      vec3 color = ambient * k_a;
      vec3 intensity = vec3(1.);

      color += phong_per_light(k_d, k_s, alpha, intensity, light, eye, p);
      return color;
    }
      
    vec3 ray_direction ( float fov, vec2 size ) {
      vec2 xy = gl_FragCoord.xy - size / 2.;
      float z = size.y / tan(radians(fov) / 2.);

      return normalize(vec3(xy, -z));
    }

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

    void main () {
      vec3 dir = ray_direction(FOV, viewport);
      mat4 cam_mat = look_at(eye, target, up);
      vec3 cam_dir = (cam_mat * vec4(dir, 1.0)).xyz;
      float dist = to_surface(eye, cam_dir);
      vec3 p = eye + dist * cam_dir;
      vec3 k_a = vec3(.2);
      vec3 k_d = vec3(.7, .2, .2);
      vec3 k_s = vec3(1.);
      float alpha = 10.;

      gl_FragColor = dist > MAX_DIST - EPSILON
        ? vec4(0)
        : vec4(phong_illumination(k_a, k_d, k_s, alpha, light, eye, p), 1);
    } 
  `,
  uniforms: {
    tick: regl.prop('tick'),
    viewport: regl.prop('viewport'),
    mouse: regl.prop('mouse'),
    eye: regl.prop('eye'),
    target: regl.prop('target'),
    light: regl.prop('light')
  },
  attributes: {
    pos: [ [ -4, -4 ], [ 0, 4 ], [ 4, -4 ] ]
  },
  count: 3
})

const clearProps = {
  color: [ 0, 0, 0, 0 ],
  depth: true
}

const props = {
  tick: 0,
  mouse: [ 0, 0 ],
  viewport: [ 0, 0 ],
  eye: [ 10, 10, 10 ],
  target: [ 0, 0, 0 ],
  light: [ 0, 2, 0 ]
}

const domMouse = [ 0, 0 ]

canvas.addEventListener('mousemove', function ({ clientX, clientY }) {
  domMouse[0] = canvas.offsetLeft + clientX
  domMouse[1] = canvas.offsetTop + clientY
})

regl.frame(function ({ tick, viewportWidth, viewportHeight, pixelRatio }) {
  props.tick = tick
  props.mouse[0] = domMouse[0] * pixelRatio / viewportWidth
  props.mouse[1] = 1 - domMouse[1] * pixelRatio / viewportHeight
  props.viewport[0] = viewportWidth
  props.viewport[1] = viewportHeight

  // props.eye[0] = Math.sin(tick / 60) * 10
  // props.eye[1] = Math.cos(tick / 60) * 10
  props.light[0] = Math.sin(tick / 50) * 2
  props.light[2] = Math.cos(tick / 50) * 2
  // props.light[1] = Math.cos(tick / 150) * 10
  regl.clear(clearProps)
  fragToy(props)
})
