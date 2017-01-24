var regl = require('regl')({ extensions: [ 'OES_texture_float' ] })
var FULL_SCREEN_QUAD = [ 
  -1, 1, -1, -1, 1, -1, 
  -1, 1, 1, -1, 1, 1 
]

var step = regl({
  vert: `
    attribute vec2 pos;

    void main () {
      gl_Position = vec4(pos, 0, 1);
    } 
  `,
  frag: `
    precision mediump float;

    uniform float h;
    uniform float t;
    uniform float mass;
    uniform float side;
    uniform sampler2D src;

    float dx ( float t, float x, float v ) {
      return v;
    }

    float dv ( float k, float damping, float t, float x, float v ) {
      return -( k / mass ) * x - ( damping / mass ) * v;
    }

    void main () {
      vec2 index = gl_FragCoord.xy / side;
      vec4 previous = texture2D(src, index);

      float x = previous.x;
      float v = previous.y;
      float k = previous.z;
      float damping = previous.w;

      float dx1 = dx(t, x, v);
      float dv1 = dv(k, damping, t, x, v);
      float x1 = x + h / 2. * dx1;
      float v1 = v + h / 2. * dv1;
      float thOver2 = t + h / 2.;

      float dx2 = dx(thOver2, x1, v1);
      float dv2 = dv(k, damping, thOver2, x1, v1);
      float x2 = x + h / 2. * dx2;
      float v2 = v + h / 2. * dv2;

      float dx3 = dx(thOver2, x2, v2);
      float dv3 = dv(k, damping, thOver2, x2, v2);
      float x3 = x + h * dx3;
      float v3 = v + h * dv3;

      float dx4 = dx(t + h, x3, v3);
      float dv4 = dv(k, damping, t + h, x3, v3);
      float xOut = x + ( h / 6. ) * ( dx1 + 2. * dx2 + 2. * dx3 + dx4 );
      float vOut = v + ( h / 6. ) * ( dv1 + 2. * dv2 + 2. * dv3 + dv4 );

      gl_FragColor = vec4(xOut, vOut, previous.z, previous.w);
    } 
  `,
  attributes: {
    pos: FULL_SCREEN_QUAD
  },
  uniforms: {
    t:       regl.prop('t'),
    h:       regl.prop('h'),
    mass:    regl.prop('mass'),
    side:    regl.prop('side'),
    src:     regl.prop('src')
  },
  count: 6,
  framebuffer: regl.prop('dest') 
})

var draw = regl({
  vert: `
    attribute vec2 coord;
    attribute vec2 origin;

    uniform sampler2D src;

    varying float speed;

    void main () {
      vec4 each = texture2D(src, coord);
      vec2 pos = vec2(origin.x, each.x);
      
      speed = each.y;
      gl_PointSize = 10.0;
      gl_Position = vec4(pos, 0., 1.);
    } 
  `,
  frag: `
    precision mediump float;

    varying float speed;

    void main () {
      float redness = clamp(abs(speed), 0., 1.);

      gl_FragColor = vec4(redness, 1. - redness, 1, 1); 
    } 
  `,
  attributes: {
    coord: regl.prop('coords'),
    origin: regl.prop('origins')
  },
  uniforms: {
    src:  regl.prop('src'),
    side: regl.prop('side')
  },
  primitive: 'point',
  count: regl.prop('count')
})

var k = 3
var mass = 0.5
var minDamping = 0.1
var maxDamping = 0.2
var h = 0.1
var t = 0
var x = 1
var v = 0
var side = 8
var count = side * side
var p0 = new Float32Array(count * 4)
var coords = new Float32Array(count * 2)
var origins = new Float32Array(count * 2)

for ( var i = 0, angle; i < count; i++ ) {
  p0[i * 4] = x
  p0[i * 4 + 1] = v
  p0[i * 4 + 2] = k
  p0[i * 4 + 3] = ( maxDamping - minDamping ) * Math.abs(Math.sin(i / 4)) + minDamping
  coords[i * 2] = ( i % side ) / side
  coords[i * 2 + 1] = Math.floor(i / side) / side
  origins[i * 2] = (i / count - .5) * 2 + ( 1 / count )
  origins[i * 2 + 1] = 0
}

var src = regl.framebuffer({
  color: regl.texture({
    data: p0,
    shape: [ side, side ],
    min: 'nearest',
    mag: 'nearest',
    wrap: 'clamp'
  }),
  colorFormat: 'rgba',
  colorType: 'float',
  depth: false
})
var dest = regl.framebuffer({
  color: regl.texture({
    data: p0,
    shape: [ side, side ],
    min: 'nearest',
    mag: 'nearest',
    wrap: 'clamp'
  }),
  colorFormat: 'rgba',
  colorType: 'float',
  depth: false
})
var tmp = null
var stepProps = { h, t, mass, side, src, dest }
var clearProps = { color: [ 0, 0, 0, 1 ] }
var drawProps = { src, coords, origins, count }

requestIdleCallback(main)

function main () {
  var prev = Date.now()
  var current = Date.now() 
  var dT = 0

  regl.frame(function ( props ) {
    prev = current
    current = Date.now()
    dT = current - prev
    t += dT / 1000

    stepProps.h = h
    stepProps.t = t
    stepProps.mass = mass
    stepProps.side = side
    stepProps.src = src
    stepProps.dest = dest
    step(stepProps)

    regl.clear(clearProps)

    drawProps.src = dest
    drawProps.coords = coords
    drawProps.origins = origins
    drawProps.count = count
    draw(drawProps)

    tmp = src
    src = dest
    dest = tmp
  })
}
