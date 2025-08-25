import { ProjMath } from "./src/mod/ProjMath.js";


let Projection = function(lam0, phi0, zoomScale) {
  // this.rando = Math.random();
  this.lam0 = lam0;
  this.phi0 = phi0;
  //
  this.sin_phi0_ = Math.sin(phi0);
  this.cos_phi0_ = Math.cos(phi0);
  this.zoomScale = zoomScale;
};

//////////////////////////////////
// Projection.prototype.frw_web_merc = function(lam, phi) {      //  Web Mercator
//   const atanSinhPi = 1.48442222;
//   phi = Math.atan(Math.sinh(phi * Math.PI / atanSinhPi));
//   return { lam, phi };
// };

Projection.prototype.fwd_fisheye = function(x, y) { 
  [x, y] = [x / Math.PI, y / Math.PI];
  let rho = Math.sqrt(x*x + y*y);
  let theta = Math.atan2(y, x);
  let fisheyeR = Math.log(1 + this.zoomScale * rho) / Math.log(1 + this.zoomScale);
  return [ Math.cos(theta) * fisheyeR * Math.PI, Math.sin(theta) * fisheyeR * Math.PI ];
}

Projection.prototype.forward = function(lambda, phi) {
  // let wm = this.frw_web_merc(lambda, phi);
  let wm = { lam: lambda, phi: phi };
  let sin_phi = Math.sin(wm.phi);
  let cos_phi = Math.cos(wm.phi);
  let sin_lam = Math.sin(wm.lam - this.lam0);
  let cos_lam = Math.cos(wm.lam - this.lam0);

  let c = Math.acos( this.sin_phi0_ * sin_phi + this.cos_phi0_ * cos_phi * cos_lam );
  if ( Math.abs(c) < ProjMath.EPSILON ) {
    return { x: 0.0, y: 0.0 };
  }

  let sin_c = Math.sin(c);
  if ( Math.abs(sin_c) < ProjMath.EPSILON ) {
    return null;  //  対蹠点. point of view
  }

  let k = c / sin_c;
  let x = k * cos_phi * sin_lam;
  let y = k * ( this.cos_phi0_ * sin_phi - this.sin_phi0_ * cos_phi * cos_lam );
  [x, y] = this.fwd_fisheye(x, y);
  return { x:x, y:y };
};

//////////////////////////////////
// Projection.prototype.inv_web_merc = function(phi) {      //  Web Mercator
//   const atanSinhPi = 1.48442222; // atan(sinh(pi)) = max phi for web merc
//   if (Math.abs(phi) < atanSinhPi) {
//     phi = Math.asinh(Math.tan(phi)) * 0.5;
//     // phi = Math.asinh(Math.tan(phi)) * atanSinhPi / Math.PI; [or * 0.5]
//   }
//   return phi;
// };

Projection.prototype.inv_fisheye = function(x, y) { 
  [x, y] = [x / Math.PI, y / Math.PI];
  let rho = Math.sqrt(x*x + y*y);
  let theta = Math.atan2(y, x);
  let fisheyeR = (Math.exp(rho * Math.log(1.0 + this.zoomScale)) - 1.0) / this.zoomScale;
  return [ Math.cos(theta) * fisheyeR * Math.PI, Math.sin(theta) * fisheyeR * Math.PI ];
}

Projection.prototype.inverse = function(x, y) {// Called from getLambdaPhiPointFromWindow (handleDoubleTap)
  [x, y] = this.inv_fisheye(x, y);
console.log("after fisheye ", {x, y});
  let rh2 = x * x + y * y;
  if ( ProjMath.PI_SQ < rh2 )   return null;

  let rho = Math.sqrt(rh2);
  if ( rho < ProjMath.EPSILON )  return { lambda: this.lam0, phi: this.phi0 };

  let c_rh = rho;
  let sin_c = Math.sin(c_rh);
  let cos_c = Math.cos(c_rh);

  let sinPhi = cos_c * this.sin_phi0_ + y * sin_c * this.cos_phi0_ / rho;
  let phi = Math.asin(ProjMath.clamp(sinPhi, -1, 1));
  let lam;
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
  // let retphi = this.inv_web_merc(phi); // This is not correct for some reason?
  // return { lambda: lam, phi: retphi };
  return { lambda: lam, phi: phi };
};


/* -------------------------------------------------------------------------- */
// let lam0 = -71.0576282 * 0.0174533; // // -1.24019010226 // Beantown
// let phi0 = 42.3587364 * 0.0174533; //  0.73929973401
// let lam_p  = -74.0113949 * 0.0174533; // -1.29174307860817 // Fraunces Tavern
// let phi_p  = 40.703355 * 0.0174533; // 0.7104078658215001
let lam0 = 0.0;
let phi0 = 0.0;
let lam_p  = 0.0;
let phi_p  = 0.0001;
let zoomScale = 10_000_000.01; // 300.01 is the default zoomScale
let projection = new Projection(lam0, phi0, zoomScale);    
console.log("Projection projection: ", projection, lam_p, phi_p);
let {x,y} = projection.forward(lam_p, phi_p);
console.log("Projection forward: ", {x, y});
let {lambda, phi} = projection.inverse(x, y);
console.log("Projection inverse: ", {lambda, phi});
// console.log("Projection inverse from 0,0: ", projection.inverse(0, 0)); // Should be lam0, phi0
// console.log("Projection forward from 0,0: ", projection.forward(0, 0)); // Should be x,y = 0,0


