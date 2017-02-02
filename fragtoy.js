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
    uniform vec3 light;

    #define MARCH_STEPS 25
    #define MIN_DIST 0.0
    #define MAX_DIST 1000.0
    #define EPSILON 0.0001
    #define FOV 45.

    #pragma glslify: sdf_cube = require('glsl-sdf-primitives/sdBox')
    #pragma glslify: sdf_sphere = require('glsl-sdf-primitives/sdSphere')

    float sdf_scene ( vec3 p ) {
      float r = 1.;
      vec3 b = vec3(r);
      vec3 c = vec3(0.);
      float a = (sin(tick / 20.) + 1.) / 2.;
      float ds = sdf_sphere(p, r);
      float dc = sdf_cube(p, b);

      return mix(dc, ds, a);
    }

    float to_surface ( vec3 eye, vec3 dir ) {
      float depth = MIN_DIST;

      for ( int i = 0; i < MARCH_STEPS; i++) {
        float dist = sdf_scene(eye + depth * dir); 

        if ( dist < EPSILON ) return depth;
        
        depth += dist;

        if ( depth >= MAX_DIST ) return MAX_DIST; 
      }
      return MAX_DIST;
    }

    vec3 ray_direction ( float fov, vec2 size ) {
      vec2 xy = gl_FragCoord.xy - size / 2.;
      float z = size.y / tan(radians(fov) / 2.);

      return normalize(vec3(xy, -z));
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
          ? intensity * k_d * dotLN
          : intensity * k_d * dotLN + k_s * pow(dotRV, alpha);
    }

    vec3 phong_illumination ( vec3 k_a, vec3 k_d, vec3 k_s, float alpha, vec3 light, vec3 eye, vec3 p ) {
      vec3 ambient = vec3(.1);
      vec3 color = ambient * k_a;
      vec3 intensity = vec3(1.);

      color += phong_per_light(k_d, k_s, alpha, intensity, light, eye, p);
      return color;
    }
      
    void main () {
      vec3 dir = ray_direction(FOV, viewport);
      float dist = to_surface(eye, dir);
      vec3 p = eye + dist * dir;
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
  eye: [ 0, 0, 10 ],
  light: [ 0, 0, 5 ]
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

  props.light[0] = props.mouse[0] * 10 - 5
  props.light[1] = props.mouse[1] * 10 - 5
  // props.light[0] = Math.sin(tick / 100) * 10
  // props.light[2] = Math.cos(tick / 100) * 10
  regl.clear(clearProps)
  fragToy(props)
})
