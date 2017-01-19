var regl = require('regl')({ extensions: [ 'OES_texture_float' ] })
var FULL_SCREEN_QUAD = [ 
  -1, 1, -1, -1, 1, -1, 
  -1, 1, 1, -1, 1, 1 
]

var glsl_rk4 = `
  #define F(t, x) t * sqrt(x)

  float rk4 ( float t, float x, float h ) {
    float k1 = F(t, x);
    float k2 = F(t + h / 2., x + h / 2. * k1);
    float k3 = F(t + h / 2., x + h / 2. * k2);
    float k4 = F(t + h, x + h * k3);
    float x1 = x + ( h / 6. ) * ( k1 + 2. * k2 + 2. * k3 + k4 );

    return x1;
  }
`

var SIDE = 2
var p0 = new Float32Array(SIDE * SIDE * 4)

for ( var i = 0; i < p0.length; i+=4 ) {
  p0[i] = i
}

var t = 0
var h = 0.1
var src = regl.framebuffer({
  width: SIDE,
  height: SIDE,
  data: p0,
  colorType: 'float',
  depth: false
})
var dest = regl.framebuffer({
  width: SIDE,
  height: SIDE,
  colorType: 'float',
  depth: false
})
var tmp = null

var step = regl({
  vert: `
    attribute vec2 pos;

    void main () {
      gl_Position = vec4(pos, 0, 1);
    } 
  `,
  frag: `
    precision mediump float;

    ${glsl_rk4}

    uniform float t;
    uniform float h;
    uniform sampler2D src;

    const vec2 shape = vec2(${SIDE}.);

    void main () {
      vec2 index = gl_FragCoord.xy / shape;
      vec4 i = texture2D(src, index);
      float xt1 = rk4(t, i.x, h);

      gl_FragColor = vec4(xt1, 0, 0, 0); 
    } 
  `,
  attributes: {
    pos: FULL_SCREEN_QUAD
  },
  uniforms: {
    src: regl.prop('src'),
    h: regl.prop('h'),
    t: regl.prop('t')
  },
  count: 6,
  framebuffer: regl.prop('dest') 
})

// for ( ; t <= 1; t += h ) {
//   tmp = src
//   src = dest
//   dest = tmp
//   step({ src, dest, t, h })
// }

step({ src, dest, t, h })
step({ dest, src, t: t + h, h })
regl({ framebuffer: src })(_ => {
  regl.read(p0)
  console.log(p0)
})
