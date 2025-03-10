/*! FlatEarth WebGL v0.0.13  2016-11-13
 * Copyright (C) 2016 T.Seno
 * Copyright (C) 2016 www.flatearthlab.com
 * All rights reserved.
 */

import { ProjMath } from "./lib/ProjMath.js";
import { MapView } from "./MapView.js";
import { RasterAEQD } from './RasterAEQD.js';

var Main = function () {
  this.interpolateTimeSpan = 1e3;
  this.gl = null;
  this.canvas = null;
  this.mapView = null;
  this.requestId = null;
  this.prevTime = null;
  this.viewStatus = {
    drag: false,
    dragPrevPos: null,
    pinchPrevScale: null,
    zoomScale: 0.01, // 0 > zoomScale >= 40
    targetLambdaPhi: null,
    interpolater: null,
  };
  this.imageProj = null;
  window.addEventListener("resize", (event) => { // TODO: memory leak
    this.draw();
  });
  document.addEventListener('DOMContentLoaded', () => {
    this.draw();
  });

  this.draw = () => {
    this.canvas = document.getElementById('webglCanvas');
    this.resizeCanvas(this.canvas);
    //  default projCenter parameter
    var phi0 = 0.0 // 35.32 * 0.0174533; // +Math.PI/2; //north pole
    var lam0 = 0.0 //-82.48 * 0.0174533;
    var projCenter = this.getProjCenterParameter();  //(if url includes projCenter=35.3206141,-82.4861473)
    if (projCenter) {
      lam0 = projCenter[0];
      phi0 = projCenter[1];
    }
    this.imageProj = new RasterAEQD();
    //imageProj is a RasterAEQD
    this.startup(this.imageProj); // sets up this.canvas, webgl, and hammer, and calls init
    this.animation(); // starts animation
    this.imageProj.setProjCenter(lam0, phi0);      
  };

  this.animation = () => {
    this.requestId = requestAnimationFrame(this.animation);
    var currTime = new Date().getTime();
    if (null == this.prevTime) {
      this.prevTime = currTime;
    }
    // Zoom

    // this.imageProj.setScale(this.viewStatus.zoomScale);

    // Interpolator
    var d;
    if (null != this.viewStatus.interpolater) {
      d = this.viewStatus.interpolater.getPos(currTime);
      this.mapView.setProjCenter(d.lp.lambda, d.lp.phi);
      this.mapView.setViewCenterPoint(d.viewPos[0], d.viewPos[1]);
      this.viewStatus.interpolater.isFinished() && (this.viewStatus.interpolater = null);
    } else if (null != this.viewStatus.targetLambdaPhi) {
      var e = this.mapView.getViewCenterPoint();
      var f = this.mapView.getProjCenter();
      var g = this.viewStatus.targetLambdaPhi;
      this.viewStatus.interpolater = Interpolater.create(
        f,
        g,
        e,
        [0, 0],
        this.interpolateTimeSpan
      );
      this.viewStatus.targetLambdaPhi = null;
      if (null != this.viewStatus.interpolater) {
        d = this.viewStatus.interpolater.getPos(currTime);
        this.mapView.setProjCenter(d.lp.lambda, d.lp.phi);
        this.mapView.setViewCenterPoint(d.viewPos[0], d.viewPos[1]);
      }
    }
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.mapView.render();
    this.prevTime = currTime;
  };

  this.startup = (imageProj) => {
    this.canvas = document.getElementById("webglCanvas");
    this.gl = WebGLUtils.setupWebGL(this.canvas);
    if (!this.gl) {
      return void alert("Failed to setup WebGL.");
    }
    // resizeCanvas(this.canvas);
    this.canvas.addEventListener("webglcontextlost", this.handleContextLost, false);
    this.canvas.addEventListener("webglcontextrestored", this.handleContextRestored, false);

    var hamm = new Hammer(this.canvas);
    hamm.get("pinch").set({
      enable: true,
    });

    $(this.canvas).hammer().on("panmove", this.handlePan);
    $(this.canvas).hammer().on("panstart", this.handlePanStart);
    $(this.canvas).hammer().on("panend pancancel", this.handlePanEnd);
    $(this.canvas).hammer().on("pinch", this.handlePinch);
    $(this.canvas).hammer().on("pinchend", this.handlePinchEnd);
    $(this.canvas).on("touchend", function (a) {
      a.preventDefault();
    });
    $(this.canvas).hammer().on("doubletap", this.handleDoubleTap);
    window.WheelEvent && document.addEventListener("wheel", this.handleWheel, false);

    this.init(imageProj);
  };

  this.init = (imageProj) => {
    //imageProj is a RasterAEQD
    var b = 0;
    var c = 0;
    var lam0 = 0; //map center longitude
    var phi0 = Math.PI / 2; //map center latitude
    var canvasInfo = this.canvas.getBoundingClientRect(); //read-only left, top, right, bottom, x, y, width, height properties of this.canvas
    var tile_opts = {
      rootNumX: 2,
      rootNumY: 1,
      rootTileSizeX: Math.PI,
      rootTileSizeY: Math.PI,
      numLevels: 4,
      tileOrigin: [-Math.PI, -Math.PI / 2],
      inverseY: false,
    };
    var cache_opts = {
      num: 50,
    };

    imageProj.init(this.gl);
    imageProj.setProjCenter(lam0, phi0);
    var canvasSize = {
      width: canvasInfo.width,
      height: canvasInfo.height,
    };
    this.mapView = new MapView(this.gl, imageProj, canvasSize, tile_opts, cache_opts);

    //Add custom function to MapView- Determines tile level needed
    this.mapView.calculateLevel = function (window, dataRect) {
      var c = window[2] - window[0];
      var d = window[3] - window[1];
      var e = Math.sqrt(c * d);
      return Math.PI <= e ? 0 : Math.PI / 2 <= e ? 1 : Math.PI / 4 <= e ? 2 : 3;
    };

    var j = this.mapView.getViewRect();
    var k = (j[2] - j[0]) / 2; //radius (pi)

    //Add custom function to MapView
    this.mapView.createUrl = function (a, b, c) {
      //return "http://www.flatearthlab.com/data/20120925/adb12292ed/NE2_50M_SR_W/" + a + "/" + b + "/" + c + ".png"
      //https://api.mapbox.com/styles/v1/mapbox/streets-v9/tiles/256/0/0/0?access_token=access_token
      return "./images/" + a + "/" + b + "/" + c + ".png";
    };

    this.mapView.setWindow(b - k, c - k, b + k, c + k);
    this.mapView.requestImagesIfNecessary();
  };

  this.resizeCanvas = (canvas) => {
    var width = canvas.clientWidth,
      height = canvas.clientHeight;
    (canvas.width == width && canvas.height == height) ||
      ((canvas.width = width), (canvas.height = height));
  };

  //   If url includes ?projCenter=lat,log map will be centered there
  //   Returns array of radians [-1.4396548576700308, 0.6164610098713337]
  this.getProjCenterParameter = () => {
    let params = new URLSearchParams(document.location.search);
    let latLonStr = params.get("projCenter");
    if (latLonStr) {
      var latLon = latLonStr.split(",");
      if (latLon.length < 2) return null;
      var latDeg = parseFloat(latLon[0]),
        lonDeg = parseFloat(latLon[1]);
      if (isNaN(latDeg) || isNaN(lonDeg)) return null;
      var latRad = (latDeg * Math.PI) / 180, //degrees to radians
        lonRad = (lonDeg * Math.PI) / 180;
      return (
        // latRad < -Math.PI / 2 && (latRad = -Math.PI / 2),
        // Math.PI / 2 < latRad && (latRad = Math.PI / 2),
        [lonRad, latRad]
      );
    }
    // }
    return null;
  };

  //returns pixels 0,0 top left of canvas (for wheel)
  this.checkAndGetMousePos = (event) => {
    var canv_xy = this.canvas.getBoundingClientRect();
    var left = event.clientX - canv_xy.left;
    var top = event.clientY - canv_xy.top;
    if (left < 0 || top < 0 || canv_xy.width < left || canv_xy.height < top) {
      return null;
    }
    return [left, top];
    // return 0 > left || 0 > top ? null : canv_xy.width < left || canv_xy.height < top ? null : [left, top];
  };

  //returns pixels 0,0 top left of canvas
  this.checkAndGetGesturePos = (event) => {
    var b = this.canvas.getBoundingClientRect();
    var c = event.gesture.center.x - b.left;
    var d = event.gesture.center.y - b.top;
    return 0 > c || 0 > d ? null : b.width < c || b.height < d ? null : [c, d];
  };

  this.handlePan = (event) => {
    if (this.viewStatus.drag) {
      var canv_xy = this.checkAndGetGesturePos(event);
      if (null != canv_xy) {
        if (this.viewStatus.dragPrevPos) {
          event.preventDefault();
          var dx = canv_xy[0] - this.viewStatus.dragPrevPos[0];
          var dy = canv_xy[1] - this.viewStatus.dragPrevPos[1];
          this.mapView.moveWindow(dx, dy);
        }
        this.viewStatus.dragPrevPos = canv_xy;
      }
    }
  };

  this.handlePanStart = (event) => {
    this.viewStatus.drag = true;
    var canv_xy = this.checkAndGetGesturePos(event);
    if (canv_xy) {
      event.preventDefault();
      this.viewStatus.dragStartPos = canv_xy;
    };
  };

  this.handlePanEnd = (event) => {
    this.viewStatus.drag = false;
    this.viewStatus.dragPrevPos = null;
  };

  this.handleDoubleTap = (event) => {
    var canv_xy = this.checkAndGetGesturePos(event);
    if (canv_xy) {
      event.preventDefault();
      var lam_phi = this.mapView.getLambdaPhiPointFromWindow(canv_xy[0], canv_xy[1]);
      this.viewStatus.targetLambdaPhi = lam_phi; //{lambda: 1.533480323761242, phi: 0.5899993533326611} ; //c
    }
  };

  this.handleWheel = (event) => {
    var canv_xy = this.checkAndGetMousePos(event); //verify on canvas
    if (canv_xy) {
      //event.preventDefault();
      this.viewStatus.zoomScale += event.deltaY * -0.01;
      this.viewStatus.zoomScale = Math.min(Math.max(.01, this.viewStatus.zoomScale), 40.0);
      this.imageProj.setScale(this.viewStatus.zoomScale);

    }
  };

  this.handlePinch = (event) => { // TODO: make it work with new vals
    var b = this.checkAndGetGesturePos(event);
    if (null != b) {
      event.preventDefault();
      var c = event.gesture.scale;
      var d = null != this.viewStatus.pinchPrevScale ? this.viewStatus.pinchPrevScale : 1;
      var e = this.gl.this.canvas.height * (c - d);
      this.viewStatus.zoomScale += e;
      this.viewStatus.pinchPrevScale = c;
    }
  };

  this.handlePinchEnd = (event) => {
    this.viewStatus.pinchPrevScale = null;
  };

  this.handleContextLost = (event) => {
    event.preventDefault();
    cancelAnimationFrame(this.requestId), this.mapView.resetImages();
  };

  this.handleContextRestored = (event) => {
    init(), (this.requestId = requestAnimationFrame(animation));
  };
}
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


new Main();

///////////////////////////////////////////////////////////////////
export { Main };
