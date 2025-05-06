/**
 * Raster Map Projection v0.0.13  2016-11-13
 * Copyright (C) 2016 T.Seno
 * All rights reserved.
 * @license GPL v3 License (http://www.gnu.org/licenses/gpl.html)
 */
/* ------------------------------------------------------------ */

import { ProjMath } from "./lib/ProjMath.js";
/**
 * Spherical Azimuthal Equidistant Projection
 * @param {number} lam0  latitude of the center [rad].
 * @param {number} phi0  longitude of the center [rad].
 * @param {object} option (divN)
 * @constructor
 */
let AEQD = function(lam0, phi0, zoomScale, opt_divn) {
  this.rando = Math.random();
  this.lam0 = lam0;
  this.phi0 = phi0;
  this.divN_ = (typeof opt_divn !== 'undefined') ? opt_divn : 180;
  //
  this.sin_phi0_ = Math.sin(phi0);
  this.cos_phi0_ = Math.cos(phi0);
  this.zoomScale = zoomScale;
};

/**
 * 値域を表す矩形 Rectangle representing range
 */
// AEQD.RANGE_RECTANGLE = [ -Math.PI, -Math.PI, +Math.PI, +Math.PI ];

// AEQD.prototype.getRange = function() {
//   return AEQD.RANGE_RECTANGLE.slice(0);
// };

AEQD.prototype.getProjCenter = function() {
  return { lambda: this.lam0, phi: this.phi0 };
};

// AEQD.prototype.setProjCenter = function(lam0, phi0) {
//   this.lam0 = lam0;
//   this.phi0 = phi0;
//   this.sin_phi0_ = Math.sin(phi0);
//   this.cos_phi0_ = Math.cos(phi0);
// }

AEQD.prototype.frw_web_merc = function(lam, phi) {      //  Web Mercator
  const atanSinhPi = 1.48442222;
  phi = Math.atan(Math.sinh(phi * Math.PI / atanSinhPi));
  return { lam, phi };
};

/**
 * fisheye effect
 * @param {} x 
 * @param {} y
 */
AEQD.prototype.fwd_fisheye = function(x, y) { 
  [x, y] = [x / Math.PI, y / Math.PI];
  let rho = Math.sqrt(x*x + y*y);
  let theta = Math.atan2(y, x);
  let fisheyeR = Math.log(1 + this.zoomScale * rho) / Math.log(1 + this.zoomScale);
  return [ Math.cos(theta) * fisheyeR * Math.PI, Math.sin(theta) * fisheyeR * Math.PI ];
}

/**
 * Forward projection.
 * @param {Float} lambda
 * @param {Float} phi
 * @return {Point}
 */
AEQD.prototype.forward = function(lambda, phi) {
  let wm = this.frw_web_merc(lambda, phi);
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

AEQD.prototype.inv_web_merc = function(lam, phi) {      //  Web Mercator
  const atanSinhPi = 1.48442222;
  if (Math.abs(phi) < atanSinhPi) {
    phi = Math.asinh(Math.tan(phi)) * atanSinhPi / Math.PI;
  }
  return { lam, phi };
};

/**
 * fisheye effect
 * @param {} x 
 * @param {} y
 */
AEQD.prototype.inv_fisheye = function(x, y) { 
  [x, y] = [x / Math.PI, y / Math.PI];
  let rho = Math.sqrt(x*x + y*y);
  let theta = Math.atan2(y, x);
  let fisheyeR = (Math.exp(rho * Math.log(1.0 + this.zoomScale)) - 1.0) / this.zoomScale;
  return [ Math.cos(theta) * fisheyeR * Math.PI, Math.sin(theta) * fisheyeR * Math.PI ];
}

/**
 * Inverse projection.
 * @param {Float} x
 * @param {Float} y
 * @param {GeoCoord}
 */
AEQD.prototype.inverse = function(x, y) {
  [x, y] = this.inv_fisheye(x, y);

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
  // let { lam: retlambda, phi: retphi } = this.inv_web_merc(lam, phi);

  return { lambda: lam, phi: phi };
};

AEQD.prototype.setScale = function(zoomScale) {
  this.zoomScale = zoomScale;
}
/* -------------------------------------------------------------------------- */
export { AEQD };
