function rk4 ( h, t, x, v, dx, dv ) {
  const dx1 = dx(t, x, v)
  const dv1 = dv(t, x, v)
  const x1 = x + h / 2 * dx1
  const v1 = v + h / 2 * dv1
  const thOver2 = t + h / 2

  const dx2 = dx(thOver2, x1, v1)
  const dv2 = dv(thOver2, x1, v1)
  const x2 = x + h / 2 * dx2 
  const v2 = v + h / 2 * dv2 

  const dx3 = dx(thOver2, x2, v2)
  const dv3 = dv(thOver2, x2, v2)
  const x3 = x + h * dx3
  const v3 = v + h * dv3

  const dx4 = dx(t + h, x3, v3)
  const dv4 = dv(t + h, x3, v3)

  const xOut = x + ( h / 6 ) * ( dx1 + 2 * dx2 + 2 * dx3 + dx4 )
  const vOut = v + ( h / 6 ) * ( dv1 + 2 * dv2 + 2 * dv3 + dv4 )

  return [ xOut, vOut ]
}

function dv ( k, m, d, t, x, v ) {
  return -( k / m ) * x - ( d / m ) * v
}

function dx ( t, x, v ) {
  return v
}

var K = 3
var MASS = 0.5
var DAMPING = 0.1
var t = 0 
var x = 1
var v = 0.2
var h = 0.1
var dv1 = dv.bind(null, K, MASS, DAMPING)

for ( var i = 0; i <= 100; i++, t += h ) {
  renderToConsole(.1, t, x)
  var out = rk4(h, t, x, v, dx, dv1)

  x = out[0]
  v = out[1]
}

function renderToConsole ( xScale, t, x ) {
  var xBarMagnitude = x / xScale | 0
  var xBar = ''
  var tVal = t.toPrecision(1)
  var xVal = x.toPrecision(4)

  for ( var i = 0; i < xBarMagnitude; i++ ) {
    xBar += '*' 
  }
  console.log(`t: ${tVal}, \tx: ${xVal} \t${xBar}`)
}
