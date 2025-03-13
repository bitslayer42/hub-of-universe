import { ProjMath } from "./ProjMath.js";

///////////////////////////////////////////////////////////////////
///////MapMathUtils////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
var MapMathUtils = function () { };
MapMathUtils.smoothstep = function (a, b, c) {
  var d = ProjMath.clamp((c - a) / (b - a), 0, 1);
  return d * d * (3 - 2 * d);
};
MapMathUtils.smootherstep = function (a, b, c) {
  var d = ProjMath.clamp((c - a) / (b - a), 0, 1);
  return d * d * d * (d * (6 * d - 15) + 10);
};
MapMathUtils.toUnitVector3d = function (a, b) {
  var c = Math.cos(b);
  return [Math.cos(a) * c, Math.sin(a) * c, Math.sin(b)];
};
MapMathUtils.slerp = function (a, b, c) {
  //Spherical Linear Interpolation
  var d = ProjMath.clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1);
  if (1 - ProjMath.EPSILON < d)
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  d < -(1 - ProjMath.EPSILON);
  var e = Math.acos(d),
    f = Math.sin(e),
    g = Math.sin((1 - c) * e) / f,
    h = Math.sin(c * e) / f;
  return [g * a[0] + h * b[0], g * a[1] + h * b[1], g * a[2] + h * b[2]];
};

///////////////////////////////////////////////////////////////////
///////Interpolater////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
var Interpolater = function (a, b, c, d, e) {
  this.v1 = MapMathUtils.toUnitVector3d(a.lambda, a.phi);
  this.v2 = MapMathUtils.toUnitVector3d(b.lambda, b.phi);
  this.iniViewPos = c;
  this.finViewPos = d;
  this.timeSpan = e;
  this.startTime = null;
  this.finished = false;
};
Interpolater.create = function (a, b, c, d, e) {
  return ProjMath.neighborPoint(a, b)
    ? null
    : (Math.PI - ProjMath.EPSILON < Math.abs(b.phi - a.phi) &&
      (a = {
        lambda: a.lambda,
        phi: a.phi + 1e-4 * (0 < a.phi ? -1 : 1),
      }),
      new Interpolater(a, b, c, d, e));
};
Interpolater.prototype.getPos = function (a) {
  var b = 0;
  if (null == this.startTime) this.startTime = a;
  else {
    var c = a - this.startTime;
    (b = ProjMath.clamp(c / this.timeSpan, 0, 1)),
      this.startTime + this.timeSpan < a && (this.finished = true);
  }
  var d = MapMathUtils.smootherstep(0, 1, b),
    e = MapMathUtils.slerp(this.v1, this.v2, d),
    f = ProjMath.toLambdaPhi(e),
    g = [
      this.iniViewPos[0] * (1 - d) + this.finViewPos[0] * d,
      this.iniViewPos[1] * (1 - d) + this.finViewPos[1] * d,
    ];
  return {
    lp: f,
    viewPos: g,
  };
};
Interpolater.prototype.isFinished = function () {
  return this.finished;
};

///////////////////////////////////////////////////////////////////
export { Interpolater };
