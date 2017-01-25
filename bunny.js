const bunny = require('bunny')
const normals = require('angle-normals')
const regl = require('regl')({ extensions: [ 'OES_texture_float' ] })
const camera = require('regl-camera')(regl, {
  center: [ 0, 2.5, 0 ]
})
const drawBunny = regl({
  frag: `
    precision mediump float;

    uniform vec3 light;

    varying vec3 vnormal;
    varying vec3 vposition;

    void main () {
      vec3 lightDir = normalize(vposition - light);
      float diffuse = clamp(dot(lightDir, vnormal), 0., 1.);
      float ambient = 0.1;
      float lightLevel = diffuse + ambient;

      gl_FragColor = vec4(vec3(lightLevel), 1.0);
    }
  `,
  vert: `
    precision mediump float;

    uniform mat4 projection;
    uniform mat4 view;

    attribute vec3 position;
    attribute vec3 normal;

    varying vec3 vnormal;
    varying vec3 vposition;

    void main () {
      vnormal = normal;
      vposition = position;
      gl_Position = projection * view * vec4(position, 1.0);
    }
  `,
  attributes: {
    position: regl.prop('model.positions'),
    normal: regl.prop('model.normals')
  },
  uniforms: {
    light: regl.prop('light') 
  },
  elements: regl.prop('model.elements')
})

const bunnyModel = {
  positions: bunny.positions,
  normals: normals(bunny.cells, bunny.positions),
  elements: bunny.cells
}

var state = {
  model: bunnyModel,
  light: [ 0, 20, 0 ]
}

regl.frame(({ tick }) => {
  state.light[0] = Math.sin(tick / 100) * 100
  state.light[2] = Math.cos(tick / 100) * 100
  regl.clear({
    color: [0, 0, 0, 1]
  })
  camera(() => {
    drawBunny(state)
  })
})
