function rk4 ( t, x, h, f ) {
  const k1 = f(t, x)
  const k2 = f(t + h / 2, x + h / 2 * k1)
  const k3 = f(t + h / 2, x + h / 2 * k2)
  const k4 = f(t + h, x + h * k3)
  const x1 = x + ( h / 6 ) * ( k1 + 2 * k2 + 2 * k3 + k4 )

  return x1
}

function yPrime ( t, y ) {
  return t * Math.sqrt(y)
}

function actual ( t ) {
  return ( 1 / 16 ) * ( t * t + 4 ) * ( t * t + 4 );
}

var t = 0 
var y = 1
var h = 0.05

for ( ; t <= 1; t += h ) {
  console.log(`~${ y }\t=${ actual(t) } at ${ t }`)
  y = rk4(t, y, h, yPrime)
}
