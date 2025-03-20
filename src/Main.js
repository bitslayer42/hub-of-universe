/*! FlatEarth WebGL v0.0.13  2016-11-13
 * Copyright (C) 2016 T.Seno
 * Copyright (C) 2016 www.flatearthlab.com
 * All rights reserved.
 */

import { Interpolater } from "./lib/Interpolater.js";
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
  document.addEventListener('DOMContentLoaded', () => {
    this.canvas = document.getElementById('webglCanvas');
    this.resizeCanvas(this.canvas);

    this.imageProj = new RasterAEQD();
    //imageProj is a RasterAEQD
    this.startup(this.imageProj); // sets up this.canvas, webgl, and hammer, and calls init
    this.animation(); // starts animation

    var { lam0, phi0 } = this.getProjCenterParameter();
    this.imageProj.setProjCenter(lam0, phi0);
  });

  this.animation = () => {
    this.requestId = requestAnimationFrame(this.animation);
    var currTime = new Date().getTime();
    if (null == this.prevTime) {
      this.prevTime = currTime;
    }

    var currPos;
    if (null != this.viewStatus.interpolater) {
      currPos = this.viewStatus.interpolater.getPos(currTime);
      this.mapView.setProjCenter(currPos.lp.lambda, currPos.lp.phi);
      this.mapView.setViewCenterPoint(currPos.viewPos[0], currPos.viewPos[1]);
      this.viewStatus.interpolater.isFinished() && (this.viewStatus.interpolater = null);
    } else if (null != this.viewStatus.targetLambdaPhi) {
      var center = this.mapView.getViewCenterPoint();
      var currLambdaPhi = this.mapView.getProjCenter();
      var targLambdaPhi = this.viewStatus.targetLambdaPhi;
      this.viewStatus.interpolater = Interpolater.create(
        currLambdaPhi,
        targLambdaPhi,
        center,
        [0, 0],
        this.interpolateTimeSpan
      );
      this.viewStatus.targetLambdaPhi = null;
      if (null != this.viewStatus.interpolater) {
        currPos = this.viewStatus.interpolater.getPos(currTime);
        this.mapView.setProjCenter(currPos.lp.lambda, currPos.lp.phi);
        this.mapView.setViewCenterPoint(currPos.viewPos[0], currPos.viewPos[1]);
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
    this.canvas.addEventListener("webglcontextlost", this.handleContextLost, false);
    this.canvas.addEventListener("webglcontextrestored", this.handleContextRestored, false);

    var mc = new Hammer.Manager(this.canvas, {
      recognizers: [
        [Hammer.Pinch, { enable: true, }],
        [Hammer.Pan, { enable: true, }],
        [Hammer.Tap, { enable: true, taps: 2, }],
      ]
    });
    mc.on("pinch", this.handlePinch);
    mc.on("pinchend pinchcancel", this.handlePinchEnd);
    mc.on("pinchstart", this.handlePinchStart);
    mc.on("pan", this.handlePan);
    mc.on("panstart", this.handlePanStart);
    mc.on("panend pancancel", this.handlePanEnd);
    mc.on("tap", this.handleDoubleTap);

    window.WheelEvent && document.addEventListener("wheel", this.handleWheel, false);
    document.querySelector("header").addEventListener("click", (e) => {
      e.preventDefault();
      var phi0 = 0.0; //35.32 * 0.0174533; // +Math.PI/2; //north pole
      var lam0 = 0.0; //-82.48 * 0.0174533;
      this.viewStatus.targetLambdaPhi = {lambda: lam0, phi: phi0}
    });
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
      numLevels: 6,
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
      if (e > Math.PI) {
        return 0;
      } else if (e > Math.PI / 2) {
        return 1;
      } else if (e > Math.PI / 4) {
        return 2;
      } else if (e > Math.PI / 8) {
        return 3;
      } else if (e > Math.PI / 16) {
        return 4;
      } else {
        return 5;
      }
    }
    //   return Math.PI <= e ? 0 : Math.PI / 2 <= e ? 1 : Math.PI / 4 <= e ? 2 : 3;
    // };

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
    const checkURL = () => {
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
          [lonRad, latRad]
        );
      }
      // }
      return null;
    };

    //  default projCenter parameter
    var phi0 = 35.32 * 0.0174533; // +Math.PI/2; //north pole
    var lam0 = -82.48 * 0.0174533;
    var projCenter = checkURL();  //(if url includes projCenter=35.3206141,-82.4861473)
    if (projCenter) {
      lam0 = projCenter[0];
      phi0 = projCenter[1];
    }
    return { lam0, phi0 };
  };

  //returns pixels 0,0 top left of canvas
  this.checkAndGetMousePos = (event) => {
    var canv_xy = this.canvas.getBoundingClientRect();
    var left = event.clientX - canv_xy.left;
    var top = event.clientY - canv_xy.top;
    if (left < 0 || top < 0 || canv_xy.width < left || canv_xy.height < top) { //offscreen
      return null;
    }
    return [left, top];
    // return 0 > left || 0 > top ? null : canv_xy.width < left || canv_xy.height < top ? null : [left, top];
  };

  //returns pixels 0,0 top left of canvas
  this.checkAndGetGesturePos = (event) => {
    var canv_xy = this.canvas.getBoundingClientRect();
    var left = event.center.x - canv_xy.left;
    var top = event.center.y - canv_xy.top;
    if (left < 0 || top < 0 || canv_xy.width < left || canv_xy.height < top) { //offscreen
      return null;
    }
    return [left, top];
    // return 0 > left || 0 > top ? null : canv_xy.width < left || canv_xy.height < top ? null : [left, top];
  };

  this.handlePinch = (event) => { // TODO: make it work with new vals
    var canv_xy = this.checkAndGetMousePos(event); //verify on canvas
    if (canv_xy) {
      if (event.scale < 1.0) {
        this.viewStatus.zoomScale = this.viewStatus.pinchPrevScale * event.scale;
      } else {
        this.viewStatus.zoomScale = this.viewStatus.pinchPrevScale + event.scale - 1.0;
      }
      this.viewStatus.zoomScale = Math.min(Math.max(.01, this.viewStatus.zoomScale), 40.0);
      this.imageProj.setScale(this.viewStatus.zoomScale);
    }
  };

  this.handlePinchStart = (event) => {
    this.viewStatus.pinchPrevScale = this.viewStatus.pinchPrevScale ? this.viewStatus.pinchPrevScale : 0.0;
  };

  this.handlePinchEnd = (event) => {
    this.viewStatus.pinchPrevScale = this.viewStatus.zoomScale
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
      this.viewStatus.dragPrevPos = canv_xy;
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
      this.viewStatus.zoomScale += event.deltaY * -0.01;
      this.viewStatus.zoomScale = Math.min(Math.max(.01, this.viewStatus.zoomScale), 40.0);
      this.imageProj.setScale(this.viewStatus.zoomScale);
    }
  };

  this.handleContextLost = (event) => {
    event.preventDefault();
    cancelAnimationFrame(this.requestId), this.mapView.resetImages();
  };

  this.handleContextRestored = (event) => {
    init(), (this.requestId = requestAnimationFrame(animation));
  };
}

new Main();

///////////////////////////////////////////////////////////////////
export { Main };
