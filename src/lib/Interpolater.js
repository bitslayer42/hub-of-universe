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
MapMathUtils.toUnitVector3d = function (lambda, phi) {
  var cosphi = Math.cos(phi);
  return [Math.cos(lambda) * cosphi, Math.sin(lambda) * cosphi, Math.sin(phi)];
};
MapMathUtils.slerp = function (from3dVec, to3dVec, intrpRatio) {
  //Spherical Linear Interpolation
  var d = ProjMath.clamp(from3dVec[0] * to3dVec[0] + from3dVec[1] * to3dVec[1] + from3dVec[2] * to3dVec[2], -1, 1);
  if (1 - ProjMath.EPSILON < d)
    return [(from3dVec[0] + to3dVec[0]) / 2, (from3dVec[1] + to3dVec[1]) / 2, (from3dVec[2] + to3dVec[2]) / 2];
  d < -(1 - ProjMath.EPSILON);
  var e = Math.acos(d),
    f = Math.sin(e),
    g = Math.sin((1 - intrpRatio) * e) / f,
    h = Math.sin(intrpRatio * e) / f;
  return [g * from3dVec[0] + h * to3dVec[0], g * from3dVec[1] + h * to3dVec[1], g * from3dVec[2] + h * to3dVec[2]];
};

///////////////////////////////////////////////////////////////////
///////Interpolater////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
var Interpolater = function (currLP, targLP, iniViewPos, finViewPos, timeSpan) {
  this.v1 = MapMathUtils.toUnitVector3d(currLP.lambda, currLP.phi);
  this.v2 = MapMathUtils.toUnitVector3d(targLP.lambda, targLP.phi);
  this.iniViewPos = iniViewPos;
  this.finViewPos = finViewPos;
  this.timeSpan = timeSpan;
  this.startTime = null;
  this.finished = false;
};
Interpolater.create = function (currLP, targLP, iniViewPos, finViewPos, timeSpan) {
  return ProjMath.neighborPoint(currLP, targLP)
    ? null
    : (Math.PI - ProjMath.EPSILON < Math.abs(targLP.phi - currLP.phi) &&
      (currLP = {
        lambda: currLP.lambda,
        phi: currLP.phi + 1e-4 * (0 < currLP.phi ? -1 : 1),
      }),
      new Interpolater(currLP, targLP, iniViewPos, finViewPos, timeSpan));
};
Interpolater.prototype.getPos = function (currTime) {
  var tm = 0;
  if (null == this.startTime) this.startTime = currTime;
  else {
    var deltaTime = currTime - this.startTime;
    (tm = ProjMath.clamp(deltaTime / this.timeSpan, 0, 1)),
      this.startTime + this.timeSpan < currTime && (this.finished = true);
  }
  var intrpRatio = MapMathUtils.smootherstep(0, 1, tm);
  var currVec3d = MapMathUtils.slerp(this.v1, this.v2, intrpRatio);
  var currLP = ProjMath.toLambdaPhi(currVec3d);
  var currViewPos = [
      this.iniViewPos[0] * (1 - intrpRatio) + this.finViewPos[0] * intrpRatio,
      this.iniViewPos[1] * (1 - intrpRatio) + this.finViewPos[1] * intrpRatio,
    ];
  return {
    lp: currLP,
    viewPos: currViewPos,
  };
};
Interpolater.prototype.isFinished = function () {
  return this.finished;
};

///////////////////////////////////////////////////////////////////
export { Interpolater };
