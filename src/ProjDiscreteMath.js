/**
 * Raster Map Projection v0.0.13  2016-11-13
 * Copyright (C) 2016 T.Seno
 * All rights reserved.
 * @license GPL v3 License (http://www.gnu.org/licenses/gpl.html)
 */

/**
 * 区間[-pi,pi]を等分割して量子化した数学関数  A mathematical function quantized by equally dividing the interval [-pi, pi]
 * @param {number} divN 区間[-pi,pi]の分割数 Number of divisions of interval [-pi, pi]
 * @constructor
 */
import { ProjMath } from "./ProjMath.js";

var ProjDiscreteMath = function(divN) {
    this.divN_ = divN;
    this.unit_ = Math.PI / divN;
  };
  
  ProjDiscreteMath.prototype.toDiscrete = function(t) {
    var idx = Math.floor(t / this.unit_);
    return idx;
  };
  
  /*
   * \cos\sqrt{x^2+y^2}
   */
  ProjDiscreteMath.prototype.cosR_lower = function(idx, p) {
    var t = (0 <= idx) ? (idx+1) * this.unit_ : -idx * this.unit_;
    var r = Math.sqrt(t * t + p * p);
    return (r <= Math.PI) ?  Math.cos(r) : -1.0;
  };
  
  ProjDiscreteMath.prototype.cosR_upper = function(idx, p) {
    var t = (0 <= idx) ? idx * this.unit_ : (-idx-1) * this.unit_;
    var r = Math.sqrt(t * t + p * p);
    return (r <= Math.PI) ?  Math.cos(r) : -1.0;
  };
  
  /*
   * \sin\sqrt{x^2+y^2}
   */
  ProjDiscreteMath.prototype.sinR_lower = function(idx, p) {
    var x1 = idx * this.unit_;
    var x2 = (idx+1) * this.unit_;
    var r1 = Math.sqrt(x1 * x1 + p * p);
    var r2 = Math.sqrt(x2 * x2 + p * p);
    if ( Math.PI <= r1 || Math.PI <= r2 ) return 0.0;
    if ( r1 <= ProjMath.HALF_PI && r2 <= ProjMath.HALF_PI ) {
      var minr = Math.min(r1, r2);
      return Math.sin(minr);
    }
    if ( ProjMath.HALF_PI <= r1 && ProjMath.HALF_PI <= r2 ) {
      var maxr = Math.max(r1, r2);
      return Math.sin(maxr);
    }
    var v1 = Math.sin(r1);
    var v2 = Math.sin(r2);
    return (v1 < v2) ? v1 : v2;
  };
  
  ProjDiscreteMath.prototype.sinR_upper = function(idx, p) {
    var x1 = idx * this.unit_;
    var x2 = (idx+1) * this.unit_;
    var r1 = Math.sqrt(x1 * x1 + p * p);
    var r2 = Math.sqrt(x2 * x2 + p * p);
    if ( Math.PI <= r1 && Math.PI <= r2 ) return 0.0;
    if ( r1 <= ProjMath.HALF_PI && r2 <= ProjMath.HALF_PI ) {
      var maxr = Math.max(r1, r2);
      return Math.sin(maxr);
    }
    if ( ProjMath.HALF_PI <= r1 && ProjMath.HALF_PI <= r2 ) {
      var minr = Math.min(r1, r2);
      return Math.sin(minr);
    }
    return 1.0;
  };
  
  /**
   * \sqrt{x^2+y^2} \cot\sqrt{x^2+y^2}
   */
  ProjDiscreteMath.prototype.R_cotR_lower = function(idx, p) {
    var t = (0 <= idx) ? (idx+1) * this.unit_ : -idx * this.unit_;
    var r = Math.sqrt(t * t + p * p);
    if ( r < ProjMath.EPSILON )  return 1.0;
    return (r < Math.PI) ? r / Math.tan(r) : -Infinity;
  };
  
  ProjDiscreteMath.prototype.R_cotR_upper = function(idx, p) {
    var t = (0 <= idx) ? idx * this.unit_ : (-idx-1) * this.unit_;
    var r = Math.sqrt(t * t + p * p);
    if ( r < ProjMath.EPSILON )  return 1.0;
    return (r < Math.PI) ? r / Math.tan(r) : -Infinity;
  };
  
  /**
   * \sin\sqrt{x^2+y^2} / \sqrt{x^2+y^2}
   */
  ProjDiscreteMath.prototype.sinR_divR_lower = function(idx, p) {
    var t = (0 <= idx) ? (idx+1) * this.unit_ : -idx * this.unit_;
    var r = Math.sqrt(t * t + p * p);
    if ( r < ProjMath.EPSILON )  return 1.0;
    return (r < Math.PI) ? Math.sin(r) / r : 0.0;
  };
  
  ProjDiscreteMath.prototype.sinR_divR_upper = function(idx, p) {
    var t = (0 <= idx) ? idx * this.unit_ : (-idx-1) * this.unit_;
    var r = Math.sqrt(t * t + p * p);
    if ( r < ProjMath.EPSILON )  return 1.0;
    return (r < Math.PI) ? Math.sin(r) / r : 0.0;
  };
  
  
  /*
   * 
   */
  ProjDiscreteMath.prototype.X_lower = function(idx) {
    return idx * this.unit_;
  };
  
  ProjDiscreteMath.prototype.X_upper = function(idx) {
    return (idx+1) * this.unit_;
  };

  /* -------------------------------------------------------------------------- */

  export { ProjDiscreteMath };