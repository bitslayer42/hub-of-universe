/**
 * Raster Map Projection v0.0.13  2016-11-13
 * Copyright (C) 2016 T.Seno
 * All rights reserved.
 * @license GPL v3 License (http://www.gnu.org/licenses/gpl.html)
 */
/* ------------------------------------------------------------ */

import { ProjDiscreteMath } from "./lib/ProjDiscreteMath.js";
import { ProjMath } from "./lib/ProjMath.js";
/**
 * Spherical Azimuthal Equidistant Projection
 * @param {number} lam0  latitude of the center [rad].
 * @param {number} phi0  longitude of the center [rad].
 * @param {object} option (divN)
 * @constructor
 */
var AEQD = function(lam0, phi0, zoomScale, opt_divn) {
  this.rando = Math.random();
  this.lam0 = lam0;
  this.phi0 = phi0;
  this.divN_ = (typeof opt_divn !== 'undefined') ? opt_divn : 180;
  //
  this.dMath_ = new ProjDiscreteMath(this.divN_);
  this.sin_phi0_ = Math.sin(phi0);
  this.cos_phi0_ = Math.cos(phi0);
  this.zoomScale = zoomScale;
};

/**
 * 値域を表す矩形 Rectangle representing range
 */
AEQD.RANGE_RECTANGLE = [ -Math.PI, -Math.PI, +Math.PI, +Math.PI ];

AEQD.prototype.getRange = function() {
  return AEQD.RANGE_RECTANGLE.slice(0);
};

AEQD.prototype.getProjCenter = function() {
  return { lambda: this.lam0, phi: this.phi0 };
};

AEQD.prototype.setProjCenter = function(lam0, phi0) {
  this.lam0 = lam0;
  this.phi0 = phi0;
  this.sin_phi0_ = Math.sin(phi0);
  this.cos_phi0_ = Math.cos(phi0);
}

AEQD.prototype.setScale = function(zoomScale) {
  this.zoomScale = zoomScale;
}

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
  var sin_phi = Math.sin(phi);
  var cos_phi = Math.cos(phi);
  var sin_lam = Math.sin(lambda - this.lam0);
  var cos_lam = Math.cos(lambda - this.lam0);

  var c = Math.acos( this.sin_phi0_ * sin_phi + this.cos_phi0_ * cos_phi * cos_lam );
  if ( Math.abs(c) < ProjMath.EPSILON ) {
    return { x: 0.0, y: 0.0 };
  }

  var sin_c = Math.sin(c);
  if ( Math.abs(sin_c) < ProjMath.EPSILON ) {
    return null;  //  対蹠点. point of view
  }

  var k = c / sin_c;
  var x = k * cos_phi * sin_lam;
  var y = k * ( this.cos_phi0_ * sin_phi - this.sin_phi0_ * cos_phi * cos_lam );
  [x, y] = this.fwd_fisheye(x, y);
  return { x:x, y:y };
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


AEQD.prototype.inverseBoundingBox = function(x1, y1, x2, y2) {
  var x_min = (x1 <= x2) ? x1 : x2;
  var x_max = (x1 <= x2) ? x2 : x1;
  var y_min = (y1 <= y2) ? y1 : y2;
  var y_max = (y1 <= y2) ? y2 : y1;

  if ( x_min <= 0 && 0 <= x_max ) {
    var yn = ProjMath.HALF_PI - this.phi0;
    var containsNorthPole =
        ( -(ProjMath.HALF_PI - ProjMath.EPSILON) < this.phi0 ) && (y_min <= yn) && (yn <= y_max);

    var ys = - ProjMath.HALF_PI - this.phi0;
    var containsSouthPole =
        ( this.phi0 < ProjMath.HALF_PI - ProjMath.EPSILON ) && (y_min <= ys) && (ys <= y_max);

    //  N極,S極の双方を含む場合. When it includes both N pole and S pole
    if ( containsNorthPole && containsSouthPole ) {
      return { lambda: [ -Math.PI, +Math.PI ], phi: [ -Math.PI/2, +Math.PI/2 ] };
    }

    //  N極,S極のどちらか一方を含む場合 When it includes either N pole or S pole
    if ( containsNorthPole || containsSouthPole ) {
      var range = this.inversePhiRange_([x_min, x_max], [y_min, y_max]);
      if ( containsNorthPole ) {
        return { lambda: [-Math.PI, +Math.PI], phi: [range[0], Math.PI/2] };
      } else {
        return { lambda: [-Math.PI, +Math.PI], phi: [-Math.PI/2, range[1]] };
      }
    }

    //  N極から上方への半直線、あるいはS極から下方への半直線を跨ぐ場合
    //  When crossing over a half line upward from the N pole, or a half line downward from the S pole
    if ( y_max < ys || yn < y_min ) {
      var rangeMinus1 = this.inverseLambdaRangeAtY_([x_min, -ProjMath.EPSILON], [y_min, y_max]);
      var rangeMinus2 = this.inverseLambdaRangeAtX_([y_min, y_max], [ x_min ]);
      var rangePlus1 = this.inverseLambdaRangeAtY_([ProjMath.EPSILON, x_max], [y_min, y_max]);
      var rangePlus2 = this.inverseLambdaRangeAtX_([y_min, y_max], [ x_max ]);

      var rangeMinus = this.mergeRange_(rangeMinus1, rangeMinus2);
      var rangePlus = this.mergeRange_(rangePlus1, rangePlus2);

      var lamRange1 = [ rangePlus[0], rangeMinus[1] + 2 * Math.PI ];
      var phiRange1 = this.inversePhiRange_([x_min, x_max], [y_min, y_max]);
      lamRange1 = this.normalizeLambdaRange_(lamRange1);
      return { lambda: lamRange1, phi: phiRange1 };
    }
  }

  //  通常ケース  Normal case
  var phiRange2 = this.inversePhiRange_([x_min, x_max], [y_min, y_max]);
  var lamRange2 = this.inverseLambdaRange_([x_min, x_max], [y_min, y_max]);
  lamRange2 = this.normalizeLambdaRange_(lamRange2);
  return { lambda: lamRange2, phi: phiRange2 };
};


AEQD.prototype.mergeRange_ = function(origRange, newRange) {
  var range = null;
  if ( origRange == null ) {
    range = newRange;
  } else if ( newRange != null ) {
    range = origRange;
    if ( newRange[0] < range[0] ) {
      range[0] = newRange[0];
    }
    if ( range[1] < newRange[1] ) {
      range[1] = newRange[1];
    }
  }
  return range;
};


AEQD.prototype.normalizeLambdaRange_ = function(range) {
  var lam = range[0];
  if ( -Math.PI <= lam && lam < Math.PI ) {
    return range;
  }
  var d = 2 * Math.PI * Math.floor( (lam + Math.PI) / (2 * Math.PI) );
  return [ range[0] - d, range[1] - d ];
};


AEQD.prototype.inverseLambdaRange_ = function(xRange, yRange) {
  var x_min = (xRange[0] <= xRange[1]) ? xRange[0] : xRange[1];
  var x_max = (xRange[0] <= xRange[1]) ? xRange[1] : xRange[0];
  var y_min = (yRange[0] <= yRange[1]) ? yRange[0] : yRange[1];
  var y_max = (yRange[0] <= yRange[1]) ? yRange[1] : yRange[0];

  var rangeAtY = this.inverseLambdaRangeAtY_([x_min, x_max], [y_min, y_max]);
  var rangeAtX = this.inverseLambdaRangeAtX_([y_min, y_max], [x_min, x_max]);
  var range = this.mergeRange_(rangeAtX, rangeAtY);

  return range;
};


AEQD.prototype.inverseLambdaRangeAtY_ = function(xRange, yValues) {
  var x_min = (xRange[0] <= xRange[1]) ? xRange[0] : xRange[1];
  var x_max = (xRange[0] <= xRange[1]) ? xRange[1] : xRange[0];

  var range = null;

  var x_idx_min = this.dMath_.toDiscrete(x_min);
  var x_idx_max = this.dMath_.toDiscrete(x_max);

  var numY = yValues.length;

  for ( var x_idx = x_idx_min; x_idx <= x_idx_max; ++x_idx ) {
    for ( var i = 0; i < numY; ++i ) {
      var r = this.inverseLambdaAtY_(x_idx, yValues[i]);
      range = this.mergeRange_(range, r);
    }
  }

  return range;
};


AEQD.prototype.inverseLambdaRangeAtX_ = function(yRange, xValues) {
  var y_min = (yRange[0] <= yRange[1]) ? yRange[0] : yRange[1];
  var y_max = (yRange[0] <= yRange[1]) ? yRange[1] : yRange[0];

  var range = null;

  var y_idx_min = this.dMath_.toDiscrete(y_min);
  var y_idx_max = this.dMath_.toDiscrete(y_max);

  var numX = xValues.length;

  for ( var y_idx = y_idx_min; y_idx <= y_idx_max; ++y_idx ) {
    for ( var i = 0; i < numX; ++i ) {
      var r = this.inverseLambdaAtX_(y_idx, xValues[i]);
      range = this.mergeRange_(range, r);
    }
  }

  return range;
};


AEQD.prototype.inversePhiRange_ = function(xRange, yRange) {
  var x_min = (xRange[0] <= xRange[1]) ? xRange[0] : xRange[1];
  var x_max = (xRange[0] <= xRange[1]) ? xRange[1] : xRange[0];
  var y_min = (yRange[0] <= yRange[1]) ? yRange[0] : yRange[1];
  var y_max = (yRange[0] <= yRange[1]) ? yRange[1] : yRange[0];

  var rangeAtY = this.inversePhiRangeAtY_([x_min, x_max], [y_min, y_max]);
  var rangeAtX = this.inversePhiRangeAtX_([y_min, y_max], [x_min, x_max]);
  var range = this.mergeRange_(rangeAtX, rangeAtY);

  return range;
};


AEQD.prototype.inversePhiRangeAtY_ = function(xRange, yValues) {
  var xmin = (xRange[0] <= xRange[1]) ? xRange[0] : xRange[1];
  var xmax = (xRange[0] <= xRange[1]) ? xRange[1] : xRange[0];

  var range = null;

  var x_idx_min = this.dMath_.toDiscrete(xmin);
  var x_idx_max = this.dMath_.toDiscrete(xmax);

  var numY = yValues.length;

  for ( var x_idx = x_idx_min; x_idx <= x_idx_max; ++x_idx ) {
    for ( var i = 0; i < numY; ++i ) {
      var r = this.inversePhiAtY_(x_idx, yValues[i]);
      range = this.mergeRange_(range, r);
    }
  }

  return range;
};


AEQD.prototype.inversePhiRangeAtX_ = function(yRange, xValues) {
  var ymin = (yRange[0] <= yRange[1]) ? yRange[0] : yRange[1];
  var ymax = (yRange[0] <= yRange[1]) ? yRange[1] : yRange[0];

  var range = null;

  var y_idx_min = this.dMath_.toDiscrete(ymin);
  var y_idx_max = this.dMath_.toDiscrete(ymax);

  var numX = xValues.length;

  for ( var y_idx = y_idx_min; y_idx <= y_idx_max; ++y_idx ) {
    for ( var i = 0; i < numX; ++i ) {
      var r = this.inversePhiAtX_(y_idx, xValues[i]);
      range = this.mergeRange_(range, r);
    }
  }

  return range;
};


AEQD.prototype.inverseLambdaAtX_ = function(y_idx, x) {
  if ( ProjMath.HALF_PI - ProjMath.EPSILON < Math.abs(this.phi0) ) {
    var sign = (0 < this.phi0) ? -1 : +1;
    var yl = sign * this.dMath_.X_lower(y_idx);
    var yu = sign * this.dMath_.X_upper(y_idx);
    var y_max = (yl <= yu) ? yu : yl;
    var y_min = (yl <= yu) ? yl : yu;
    var range = ProjMath.atan2Range({min: x, max: x}, {min: y_min, max: y_max});
    return [ range.min + this.lam0, range.max + this.lam0 ];
  }

  var t1l = this.cos_phi0_ * this.dMath_.R_cotR_lower(y_idx, x);
  var t1u = this.cos_phi0_ * this.dMath_.R_cotR_upper(y_idx, x);
  var t1_max = (t1l <= t1u) ? t1u : t1l;
  var t1_min = (t1l <= t1u) ? t1l : t1u;

  var t2l = - this.sin_phi0_ * this.dMath_.X_lower(y_idx);
  var t2u = - this.sin_phi0_ * this.dMath_.X_upper(y_idx);
  var t2_max = (t2l <= t2u) ? t2u : t2l;
  var t2_min = (t2l <= t2u) ? t2l : t2u;

  var t_max = t1_max + t2_max;
  var t_min = t1_min + t2_min;

  var r = ProjMath.atan2Range({min: x, max: x}, {min: t_min, max: t_max});
  return [ r.min + this.lam0, r.max + this.lam0 ];
};


AEQD.prototype.inverseLambdaAtY_ = function(x_idx, y) {
  if ( ProjMath.HALF_PI - ProjMath.EPSILON < Math.abs(this.phi0) ) {
    var sign = (0 < this.phi0) ? -1 : +1;
    var x_min = this.dMath_.X_lower(x_idx);
    var x_max = this.dMath_.X_upper(x_idx);
    var range = ProjMath.atan2Range({min: x_min, max: x_max}, {min: sign * y, max: sign * y});
    return [ range.min + this.lam0, range.max + this.lam0 ];
  }
  var t1 = this.cos_phi0_ * this.dMath_.R_cotR_lower(x_idx, y) - this.sin_phi0_ * y;
  var t2 = this.cos_phi0_ * this.dMath_.R_cotR_upper(x_idx, y) - this.sin_phi0_ * y;
  var t_max = (t2 <= t1) ? t1 : t2;
  var t_min = (t2 <= t1) ? t2 : t1;

  var s_min = this.dMath_.X_lower(x_idx);
  var s_max = this.dMath_.X_upper(x_idx);

  var r = ProjMath.atan2Range({min: s_min, max: s_max}, {min: t_min, max: t_max});
  return [ r.min + this.lam0, r.max + this.lam0 ];
};



AEQD.prototype.inversePhiAtY_ = function(x_idx, y) {
  var t1l = this.dMath_.cosR_lower(x_idx, y) * this.sin_phi0_;
  var t1u = this.dMath_.cosR_upper(x_idx, y) * this.sin_phi0_;
  var t1_max = (t1l <= t1u) ? t1u : t1l;
  var t1_min = (t1l <= t1u) ? t1l : t1u;

  var t2l = y * this.dMath_.sinR_divR_lower(x_idx, y) * this.cos_phi0_;
  var t2u = y * this.dMath_.sinR_divR_upper(x_idx, y) * this.cos_phi0_;
  var t2_max = (t2l <= t2u) ? t2u : t2l;
  var t2_min = (t2l <= t2u) ? t2l : t2u;

  var t_max = ProjMath.clamp(t1_max + t2_max, -1, 1);
  var t_min = ProjMath.clamp(t1_min + t2_min, -1, 1);

  return [ Math.asin(t_min), Math.asin(t_max) ];
};



AEQD.prototype.inversePhiAtX_ = function(y_idx, x) {
  var t1l = this.dMath_.cosR_lower(y_idx, x) * this.sin_phi0_;
  var t1u = this.dMath_.cosR_upper(y_idx, x) * this.sin_phi0_;
  var t1_max = (t1l <= t1u) ? t1u : t1l;
  var t1_min = (t1l <= t1u) ? t1l : t1u;

  var y1_abs = Math.abs(this.dMath_.X_lower(y_idx));
  var y2_abs = Math.abs(this.dMath_.X_upper(y_idx));
  var y_abs_max = (y1_abs <= y2_abs) ? y2_abs : y1_abs;
  var y_abs_min = (y1_abs <= y2_abs) ? y1_abs : y2_abs;

  var cos_phi0_abs = Math.abs(this.cos_phi0_);
  var t2_abs_max = y_abs_max * this.dMath_.sinR_divR_upper(y_idx, x) * cos_phi0_abs;
  var t2_abs_min = y_abs_min * this.dMath_.sinR_divR_lower(y_idx, x) * cos_phi0_abs;

  var t2_sign = (0 <= y_idx * this.cos_phi0_) ? +1 : -1;
  var t2_max = (0 < t2_sign) ? +t2_abs_max : -t2_abs_min;
  var t2_min = (0 < t2_sign) ? +t2_abs_min : -t2_abs_max;

  var t_max = ProjMath.clamp(t1_max + t2_max, -1, 1);
  var t_min = ProjMath.clamp(t1_min + t2_min, -1, 1);

  return [ Math.asin(t_min), Math.asin(t_max) ];
};

AEQD.prototype.setScale = function(zoomScale) {
  this.zoomScale = zoomScale;
}
/* -------------------------------------------------------------------------- */
export { AEQD };
