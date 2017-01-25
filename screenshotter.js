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

    #define MARCH_STEPS = 255;
    #define MIN_DIST = 0.0;
    #define MAX_DIST = 100.0;
    #define EPSILON = 0.0001;

    const vec3 cam = vec3(0., 0., 10.);

    float to_surface ( vec3 eye, vec3 dir ) {
      float depth = MIN_DIST;
      float out = 0.;

      for ( int i = 0; i < MARCH_STEPS; i++ ) {
        out = min(out, sdf_sphere(eye + depth * dir))
      }
      return out
    }

    float sdf_sphere ( vec3 p ) {
      return length(p) - 1.;
    }

    void main () {
      vec2 pos = gl_FragCoord.xy / viewport;
      float redness = 1.;


      gl_FragColor = vec4(redness, 0, 0, 1);
    } 
  `,
  uniforms: {
    tick: regl.prop('tick'),
    viewport: regl.prop('viewport'),
    mouse: regl.prop('mouse')
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
  viewport: [ 0, 0 ]
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
  regl.clear(clearProps)
  fragToy(props)
})
