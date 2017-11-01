var ProjMath = function() {};

ProjMath.EPSILON = 1.0e-7;

ProjMath.SQRT_2 = Math.sqrt(2);

ProjMath.PI_SQ = Math.PI * Math.PI;
ProjMath.HALF_PI = Math.PI / 2;


ProjMath.clamp = function(x, min, max) {
  return Math.max(min, Math.min(max, x));
};

//////////////////////////////////////////////////////
var inverse = function(x, y) {
  var rh2 = x * x + y * y;
  if ( ProjMath.PI_SQ < rh2 )   return null;

  var rho = Math.sqrt(rh2);
  if ( rho < ProjMath.EPSILON )  return { lambda: this.lam0, phi: this.phi0 };

  var c_rh = rho;

  var sin_c = Math.sin(c_rh);
  var cos_c = Math.cos(c_rh);

  var sinPhi = cos_c * this.sin_phi0_ + y * sin_c * this.cos_phi0_ / rho;
  var phi = Math.asin(ProjMath.clamp(sinPhi, -1, 1));
  var lam;
  if ( ProjMath.HALF_PI - ProjMath.EPSILON < this.phi0 ) {   //  phi0 = pi/2
    lam = Math.atan2(x, -y) + this.lam0;
  } else if ( this.phi0 < -(ProjMath.HALF_PI - ProjMath.EPSILON) ) {   //  phi0 = -pi/2
    lam = Math.atan2(x, y) + this.lam0;
  } else {
    lam = Math.atan2(x * sin_c, rho * cos_c * this.cos_phi0_ - y * this.sin_phi0_ * sin_c) + this.lam0;
  }

  if ( lam < -Math.PI || Math.PI <= lam ) {
    lam -= 2 * Math.PI * Math.floor((lam + Math.PI) / (2*Math.PI));
  }
  return { lambda: lam, phi: phi };
};

console.log(inverse(0.01,-0.01));
