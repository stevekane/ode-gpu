const regl = require('regl')({
  extensions: [ 'OES_texture_float' ]
})
const { lookAt, identity, create, translate } = require('gl-mat4')
const { cross, add, subtract, scale, length, normalize } = require('gl-vec3')
const frag = require('./frag')
const canvas = regl._gl.canvas
const { abs, sin, cos } = Math

const MAX_NODES = 64
const TRANSFORMS_SIZE = 16 * MAX_NODES
const transformsBuffer = new Float32Array(TRANSFORMS_SIZE)
const transforms = regl.texture({
  shape: [ 4, MAX_NODES ],
  data: transformsBuffer,
  type: 'float',
  min: 'nearest',
  mag: 'nearest',
  wrap: 'clamp'
})

const n1 = {
  index: 0,
  type: 'SDF',
  fn: 'sdf_sphere',
  radius: 1.5,
  matrix: transformsBuffer.subarray(0, 16)
}
const n2 = {
  index: 1,
  type: 'SDF',
  fn: 'sdf_sphere',
  radius: 1.5,
  matrix: transformsBuffer.subarray(16, 32)
}
const n3 = {
  index: 2,
  type: 'SDF',
  fn: 'sdf_sphere',
  radius: 1.5,
  matrix: transformsBuffer.subarray(32, 48)
}
const n4 = {
  index: 3,
  type: 'SDF',
  fn: 'sdf_sphere',
  radius: 1.3,
  matrix: transformsBuffer.subarray(48, 64)
}

const scene = {
  type: 'OPERATOR',
  operator: 'sdf_difference',
  first: {
    type: 'OPERATOR',
    operator: 'sdf_union_round',
    radius: .1,
    first: n1,
    second: {
      type: 'OPERATOR',
      operator: 'sdf_union_round',
      radius: .1,
      first: n2,
      second: n3
    }
  },
  second: n4,
}

identity(n1.matrix, n1.matrix)
identity(n2.matrix, n2.matrix)
identity(n3.matrix, n3.matrix)
identity(n4.matrix, n4.matrix)
translate(n1.matrix, n1.matrix, [ 0, 1, 0 ])
translate(n2.matrix, n2.matrix, [ 1, 0, 0 ])
translate(n3.matrix, n3.matrix, [ 0, 0, 1 ])

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
    light: regl.prop('light'),
    transforms: regl.prop('transforms')
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
  frag: frag(MAX_NODES, scene),
  tick: 0,
  mouse: [ 0, 0 ],
  viewport: [ 0, 0 ],
  eye: [ 0, 4, 10 ],
  target: [ 0, 0, 0 ],
  light: [ 0, 6, 0 ],
  camera_matrix: create(),
  transforms: transforms
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

  identity(n1.matrix, n1.matrix)
  identity(n2.matrix, n2.matrix)
  identity(n3.matrix, n3.matrix)
  identity(n4.matrix, n4.matrix)
  translate(n1.matrix, n1.matrix, [ 0, sin(tick / 20), cos(tick / 20) ])
  translate(n2.matrix, n2.matrix, [ sin(tick / 20), cos(tick / 20), 0 ])
  translate(n3.matrix, n3.matrix, [ sin(tick / 20), 0, cos(tick / 20) ])

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
  props.frag = frag(MAX_NODES, scene)
  lookAt(props.camera_matrix, props.eye, props.target, UP)

  regl.clear(clearProps)
  transforms.subimage(transformsBuffer)
  fragToy(props)
})
