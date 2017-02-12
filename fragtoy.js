const regl = require('regl')({ 
  extensions: [ 'OES_texture_float', 'EXT_disjoint_timer_query' ],
  // profile: true
})
const { lookAt, identity, create, translate } = require('gl-mat4')
const { cross, add, subtract, scale, length, normalize } = require('gl-vec3')
const frag = require('./frag')
const canvas = regl._gl.canvas
const { abs, sin, cos } = Math

const scene = {
  type: 'OPERATOR',
  operator: 'UNION_ROUND',
  radius: .2,
  first: {
    type: 'SDF',
    fn: 'SPHERE',
    radius: 1,
    matrix: create()
  },
  second: {
    type: 'SDF',
    fn: 'BOX',
    dimensions: [ 1.2, 1.2, 1.2 ],
    matrix: create()
  }
}

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
  frag: regl.prop('frag'),
  uniforms: {
    tick: regl.prop('tick'),
    viewport: regl.prop('viewport'),
    mouse: regl.prop('mouse'),
    eye: regl.prop('eye'),
    target: regl.prop('target'),
    camera_matrix: regl.prop('camera_matrix'),
    light: regl.prop('light')
  },
  attributes: {
    pos: [ [ -4, -4 ], [ 0, 4 ], [ 4, -4 ] ]
  },
  count: 3
})

const UP = [ 0, 1, 0 ]
const clearProps = {
  color: [ 0, 0, 0, 0 ],
  depth: true
}

const props = {
  frag: frag(scene),
  tick: 0,
  mouse: [ 0, 0 ],
  viewport: [ 0, 0 ],
  eye: [ 0, 4, 10 ],
  target: [ 0, 0, 0 ],
  light: [ 0, 6, 0 ],
  camera_matrix: create()
}

const buttons = {
  w: false,
  a: false,
  s: false,
  d: false
}
const domMouse = [ 0, 0 ]
const strafe = [ 0, 0, 0 ]
const forward = [ 0, 0, 0 ]

canvas.addEventListener('mousemove', function ({ clientX, clientY }) {
  domMouse[0] = canvas.offsetLeft + clientX
  domMouse[1] = canvas.offsetTop + clientY
})

document.body.addEventListener('keydown', function ({ keyCode }) {
  switch ( keyCode ) {
    case 87: buttons.w = 1; break 
    case 65: buttons.a = -1; break 
    case 83: buttons.s = -1; break 
    case 68: buttons.d = 1; break 
    default: break
  }
})
document.body.addEventListener('keyup', function ({ keyCode }) {
  switch ( keyCode ) {
    case 87: buttons.w = 0; break 
    case 65: buttons.a = 0; break 
    case 83: buttons.s = 0; break 
    case 68: buttons.d = 0; break 
    default: break
  }
})

regl.frame(function ({ tick, viewportWidth, viewportHeight, pixelRatio }) {
  const mouseX = domMouse[0] * pixelRatio / viewportWidth
  const mouseY = ((1 - domMouse[1]) * pixelRatio) / viewportHeight 
  const mouseDeltaX = mouseX - props.mouse[0]
  const mouseDeltaY = mouseY - props.mouse[1]

  identity(scene.first.matrix)
  translate(scene.first.matrix, scene.first.matrix, [ 0, sin(tick / 20), 0 ])
  subtract(forward, props.target, props.eye)

  const distance = length(forward)

  normalize(forward, forward)
  cross(strafe, forward, UP)
  normalize(strafe, strafe)

  scale(strafe, strafe, (buttons.a + buttons.d) * Math.log(distance))
  scale(forward, forward, buttons.w + buttons.s)
  add(props.eye, props.eye, strafe)
  add(props.eye, props.eye, forward)

  props.tick = tick
  props.mouse[0] = mouseX
  props.mouse[1] = mouseY
  props.viewport[0] = viewportWidth
  props.viewport[1] = viewportHeight
  props.frag = frag(scene)
  lookAt(props.camera_matrix, props.eye, props.target, UP)

  regl.clear(clearProps)
  fragToy(props)
})
