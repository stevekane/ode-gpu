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

    uniform float t;
    uniform float h;
    uniform float k;
    uniform float mass;
    uniform float damping;
    uniform float side;
    uniform sampler2D src;

    float dv ( float t, float x, float v ) {
      return -( k / mass ) * x - ( damping / mass ) * v;
    }

    float dx ( float t, float x, float v ) {
      return v;
    }

    void main () {
      vec2 index = gl_FragCoord.xy / side;
      vec4 previous = texture2D(src, index);

      float x = previous.x;
      float v = previous.y;

      float dx1 = dx(t, x, v);
      float dv1 = dv(t, x, v);
      float x1 = x + h / 2. * dx1;
      float v1 = v + h / 2. * dv1;
      float thOver2 = t + h / 2.;

      float dx2 = dx(thOver2, x1, v1);
      float dv2 = dv(thOver2, x1, v1);
      float x2 = x + h / 2. * dx2;
      float v2 = v + h / 2. * dv2;

      float dx3 = dx(thOver2, x2, v2);
      float dv3 = dv(thOver2, x2, v2);
      float x3 = x + h * dx3;
      float v3 = v + h * dv3;

      float dx4 = dx(t + h, x3, v3);
      float dv4 = dv(t + h, x3, v3);
      float xOut = x + ( h / 6. ) * ( dx1 + 2. * dx2 + 2. * dx3 + dx4 );
      float vOut = v + ( h / 6. ) * ( dv1 + 2. * dv2 + 2. * dv3 + dv4 );

      gl_FragColor = vec4(xOut, vOut, 0, 0);
    } 
  `,
  attributes: {
    pos: FULL_SCREEN_QUAD
  },
  uniforms: {
    h:       regl.prop('h'),
    t:       regl.prop('t'),
    k:       regl.prop('k'),
    mass:    regl.prop('mass'),
    damping: regl.prop('damping'),
    side:    regl.prop('side'),
    src:     regl.prop('src')
  },
  count: 6,
  framebuffer: regl.prop('dest') 
})

var draw = regl({
  vert: `
    uniform sampler2D src;

    void main () {
      vec4 each = texture2D(src, vec2(0.));
      
      gl_PointSize = 100.0;
      gl_Position = vec4(0., each.x, 0., 1.);
    } 
  `,
  frag: `
    void main () {
      gl_FragColor = vec4(1., 0., 0., 1.); 
    } 
  `,
  uniforms: {
    src: regl.prop('src') 
  },
  primitive: 'point',
  count: 1
})

var k = 3
var mass = 0.5
var damping = 0.2
var h = 0.1
var t = 0
var x = 1
var v = 0.2
var side = 1
var p0 = new Float32Array(side * side * 4)

for ( var i = 0; i < p0.length; i+=4 ) {
  p0[i] = x
  p0[i + 1] = v
}

var src = regl.framebuffer({
  color: regl.texture({
    data: p0,
    shape: [ side, side ]
  }),
  colorFormat: 'rgba',
  colorType: 'float',
  depth: false
})
var dest = regl.framebuffer({
  color: regl.texture({
    data: p0,
    shape: [ side, side ]
  }),
  colorFormat: 'rgba',
  colorType: 'float',
  depth: false
})
var tmp = null

requestIdleCallback(main)

function main () {
  var prev = Date.now()
  var current = Date.now() 
  var dT = 0

  regl.frame(function ({ tick }) {
    prev = current
    current = Date.now()
    dT = current - prev
    t += dT / 1000
    regl.clear({
      color: [ 0, 0, 0, 0 ] 
    })
    step({ h, t, k, mass, damping, side, src, dest })
    draw({ src: dest })
    tmp = src
    src = dest
    dest = tmp
  })
}
