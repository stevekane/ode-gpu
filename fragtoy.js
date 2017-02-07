const regl = require('regl')({ extensions: [ 'OES_texture_float' ] })
const { lookAt, create } = require('gl-mat4')
const { cross } = require('gl-vec3')
const look_at = require('./glsl/look_at')
const { vmax, sdf_union_round, repeat_along, sdf_sphere, sdf_box } = require('./glsl/sdf')
const { normal, phong_illumination, phong_per_light } = require('./glsl/lighting')
const { ray_direction, to_surface } = require('./glsl/ray_marching')
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
    uniform vec3 target;
    uniform mat4 camera_matrix;
    uniform vec3 light;

    const int MARCH_STEPS = 500;
    const float MIN_DIST = 0.1;
    const float MAX_DIST = 1000.;
    const float EPSILON = 0.0001;
    const float FOV = 45.;
    const float FOV_FACTOR = 2. / tan(radians(45.));

    ${ look_at + vmax + sdf_union_round + repeat_along + sdf_sphere + sdf_box }

    float sdf_scene ( vec3 p ) {
      float r = 1.;
      float x = 0.;
      float y = sin(tick / 40.);
      float spacing = 8.;
      float x_index = repeat_along(p.x, spacing);
      float y_index = repeat_along(p.y, spacing);
      // float z_index = repeat_along(p.z, spacing);
      float z = 0.;
      vec3 b = vec3(r * 1.2);
      mat4 m = mat4(1.,   0.,   0.,   0., 
                    0.,   1.,   0.,   0.,
                    0.,   0.,   1.,   0.,
                    x,    y,    z,    1.);

      return sdf_union_round(
        sdf_sphere((m * vec4(p, 1.)).xyz, r),
        sdf_box(p, b),
        .3
      );
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
  `,
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
  tick: 0,
  mouse: [ 0, 0 ],
  viewport: [ 0, 0 ],
  eye: [ 0, 4, 100 ],
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

window.props = props

regl.frame(function ({ tick, viewportWidth, viewportHeight, pixelRatio }) {
  const mouseX = domMouse[0] * pixelRatio / viewportWidth
  const mouseY = ((1 - domMouse[1]) * pixelRatio) / viewportHeight 
  const mouseDeltaX = mouseX - props.mouse[0]
  const mouseDeltaY = mouseY - props.mouse[1]

  props.eye[0] += buttons.a + buttons.d
  props.eye[1] += buttons.w + buttons.s
  props.tick = tick
  props.mouse[0] = mouseX
  props.mouse[1] = mouseY
  props.viewport[0] = viewportWidth
  props.viewport[1] = viewportHeight
  lookAt(props.camera_matrix, props.eye, props.target, UP)

  // props.light[0] = Math.sin(tick / 50) * 20
  regl.clear(clearProps)
  fragToy(props)
})
