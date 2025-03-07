/**
 * Raster Map Projection v0.0.13  2016-11-13
 * Copyright (C) 2016 T.Seno
 * All rights reserved.
 * @license GPL v3 License (http://www.gnu.org/licenses/gpl.html)
 */
/* ------------------------------------------------------------ */

/**
 * 数学関数ユーティリティ. Mathematical function utility
 */
var ProjMath = function() {};

ProjMath.EPSILON = 1.0e-7;

ProjMath.SQRT_2 = Math.sqrt(2);

ProjMath.PI_SQ = Math.PI * Math.PI;
ProjMath.HALF_PI = Math.PI / 2;


ProjMath.clamp = function(x, min, max) {
  return Math.max(min, Math.min(max, x));
};


/**
 * atan2(y,x)の範囲を求める。  Find the range of
 * @param {Range} yRange
 * @param {Range} xRange
 * @return {Range}
 */
ProjMath.atan2Range = function(yRange, xRange) {
  console.assert(yRange.min <= yRange.max);
  console.assert(xRange.min <= xRange.max);

  var xmin = xRange.min;
  var xmax = xRange.max;
  var ymin = yRange.min;
  var ymax = yRange.max;

  //  y方向正の領域内. Y direction is not within the domain
  if (0 <= ymin) {
    if (0 < xmin) {
      return { min: Math.atan2(ymin, xmax), max: Math.atan2(ymax, xmin) };
    }
    if (xmax < 0) {
      return { min: Math.atan2(ymax, xmax), max: Math.atan2(ymin, xmin) };
    }
    return { min: Math.atan2(ymin, xmax), max: Math.atan2(ymin, xmin) };
  }

  //  y方向負の領域内  Y direction 
  if (ymax < 0) {
    if (0 < xmin) {
      return { min: Math.atan2(ymin, xmin), max: Math.atan2(ymax, xmax) };
    }
    if (xmax < 0) {
      return { min: Math.atan2(ymax, xmin), max: Math.atan2(ymin, xmax) };
    }
    return { min: Math.atan2(ymax, xmin), max: Math.atan2(ymax, xmax) };
  }

  //  x軸上の場合（原点を内部に含まない）
  //. On the x axis (the origin is not included inside)
  if (0 < xmin) {
    return { min: Math.atan2(ymin, xmin), max: Math.atan2(ymax, xmin) };
  }
  if (xmax < 0) {
    //  周期性の考慮. Consideration of periodicity
    var t1 = Math.atan2(ymax, xmax);
    var t2 = Math.atan2(ymin, xmax);
    if (Math.PI <= t1) {
      return { min: t1 - 2 * Math.PI, max: t2 };
    } else {
      return { min: t1, max: t2 + 2 * Math.PI };
    }
  }

  //  原点を内部に含む. Include the origin inside
  return { min: -Math.PI, max: Math.PI };
};


ProjMath.toLambdaPhi = function(vec3d) {
  var r = Math.sqrt(vec3d[0] * vec3d[0] + vec3d[1] * vec3d[1]);
  var lam = Math.atan2( vec3d[1], vec3d[0] );
  var phi = Math.atan2( vec3d[2], r );
  return { lambda: lam, phi: phi };
};


ProjMath.normalizeLambda = function(lam) {
  if ( -Math.PI <= lam && lam < Math.PI ) {
    return lam;
  }
  return lam - 2 * Math.PI * Math.floor( (lam + Math.PI) / (2 * Math.PI) );
};


ProjMath.neighborPoint = function(pt1, pt2) {
  if ( ProjMath.EPSILON <= Math.abs(pt1.phi - pt2.phi) ) {
    return false;
  }
  var lam1 = ProjMath.normalizeLambda(pt1.lambda);
  var lam2 = ProjMath.normalizeLambda(pt2.lambda);
  return Math.abs(lam1 - lam2) < ProjMath.EPSILON;
};

/* -------------------------------------------------------------------------- */
export { ProjMath };