const regl = require('regl')()
const FULL_SCREEN_QUAD = [ [ -4, -4 ], [ 0, 4 ], [ 4, -4 ] ]
const { abs, sin } = Math
const canvas = regl._gl.canvas

const fullScreen = regl({
  vert: `
    attribute vec2 position;

    void main () {
      gl_Position = vec4(position, 0., 1.);
    }
  ` ,
  frag: `
    precision mediump float;

    uniform vec4 color;
    uniform vec2 viewport;
    uniform vec2 mouse;

    float circle ( vec2 p, float r ) {
      return length(p) - r;
    }

    void main () {
      vec2 mouse_test = vec2(.5);
      vec2 coord = gl_FragCoord.xy / viewport;
      vec4 modified_color = vec4(color);
      float dist = pow(clamp(circle(coord, 0.2), 0., 1.), .1);

      modified_color.r = dist;
      gl_FragColor = modified_color;
    } 
  `,
  attributes: {
    position: FULL_SCREEN_QUAD
  },
  uniforms: {
    color: regl.prop('color'),
    viewport: regl.prop('viewport'),
    mouse: regl.prop('mouse')
  },
  count: 3
})

const mouse = [ 0, 0 ]

canvas.addEventListener('mousemove', function ({ clientX, clientY }) {
  mouse[0] = clientX
  mouse[1] = clientY
})

regl.frame(function ({ tick, viewportWidth, viewportHeight, pixelRatio }) {
  const mx = mouse[0] * pixelRatio / viewportWidth
  const my = (viewportHeight - mouse[1] * pixelRatio) / viewportHeight

  fullScreen({ 
    viewport: [ viewportWidth, viewportHeight ],
    mouse: [ mx, my ],
    color: [ 1, 0, 0, 1 ] 
  })
})
