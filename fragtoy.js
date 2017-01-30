const regl = require('regl')({ extensions: [ 'OES_texture_float' ] })
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
  frag: `
    precision mediump float;

    uniform float tick;
    uniform float dT;
    uniform vec2 mouse;
    uniform vec2 viewport;
    uniform vec3 eye;
    uniform vec3 light;

    #define MARCH_STEPS 255
    #define MIN_DIST 0.0
    #define MAX_DIST 100.0
    #define NEARLY_ZERO 0.0001
    #define EPSILON 0.1
    #define FOV 45.

    float sdf_sphere ( vec3 p ) {
      return length(p) - 1.;
    }

    float sdf_scene ( vec3 p ) {
      return sdf_sphere(p);
    }

    float to_surface ( vec3 eye, vec3 dir ) {
      float depth = MIN_DIST;

      for ( int i = 0; i < MARCH_STEPS; i++) {
        float dist = sdf_scene(eye + depth * dir); 

        if ( dist < NEARLY_ZERO ) return depth;
        
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
        sdf_scene(vec3(p.x + EPSILON, p.y, p.z) - sdf_scene(vec3(p.x - EPSILON, p.y, p.z))),
        sdf_scene(vec3(p.x, p.y + EPSILON, p.z) - sdf_scene(vec3(p.x, p.y - EPSILON, p.z))),
        sdf_scene(vec3(p.x, p.y, p.z + EPSILON) - sdf_scene(vec3(p.x, p.y, p.z - EPSILON)))
      ));
    }
      
    void main () {
      vec3 dir = ray_direction(FOV, viewport);
      float dist = to_surface(eye, dir);
      vec3 p = dist * dir + eye;
      vec3 n = normal(p);
      vec3 l = normalize(light - p);
      vec3 v = normalize(eye - p);
      float dotLN = dot(l, n);
      float diffuse = clamp(dotLN, 0., 1.);
      float ambient = 0.05;
      float i = diffuse + ambient;

      gl_FragColor = dist > MAX_DIST - NEARLY_ZERO
        ? vec4(0, 0, 0, 1)
        : vec4(i, i, i, 1);
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
  color: [ 0, 0, 0, 0 ]
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
  // props.light[0] = props.mouse[0] * 10 - 5
  // props.light[1] = props.mouse[1] * 10 - 5
  props.light[0] = Math.sin(tick / 100) * 10
  //props.light[2] = Math.cos(tick / 100) * 10
  regl.clear(clearProps)
  fragToy(props)
})
