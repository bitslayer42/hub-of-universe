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
  this.prevScale = null;
  // Center of map: lam0 longitude, phi0 latitude in radians
  this.lam0 = 45 * 0.0174533;
  this.phi0 = 0.0 * 0.0174533;
  this.viewStatus = {
    drag: false,
    dragPrevPos: null,
    pinchPrevScale: null,
    zoomScale: 0.01, // zoomMin >= zoomScale >= zoomMax
    targetLambdaPhi: null,
    interpolater: null,
    currTileLevel: null,
  };
  this.zoomMin = 0.01;
  this.zoomMax = 40.0;
  this.maxTileLevel = 5; // tile levels 0 to maxTileLevel
  this.imageProj = null;
  this.debug = true;

  document.addEventListener('DOMContentLoaded', () => {
    this.canvas = document.getElementById('webglCanvas');
    this.resizeCanvas(this.canvas);

    this.imageProj = new RasterAEQD();
    this.imageProj.setScale(this.viewStatus.zoomScale);
    //imageProj is a RasterAEQD
    this.startup(this.imageProj); // sets up this.canvas, webgl, and hammer, and calls init
    this.animation(); // starts animation

    this.getProjCenterParameter(); // check for url params
  });

  this.animation = () => {
    this.requestId = requestAnimationFrame(this.animation);
    var currTime = new Date().getTime();
    if (null == this.prevTime) {
      this.prevTime = currTime;
    }
    // var baseTileLevel = Math.floor(this.gl.canvas.width / 256);
    // this.viewStatus.currTileLevel = baseTileLevel + Math.floor(this.maxTileLevel * this.viewStatus.zoomScale / this.zoomMax);
    this.viewStatus.currTileLevel = Math.floor(this.maxTileLevel * this.viewStatus.zoomScale / this.zoomMax);
    console.log("Tile Level: " + this.viewStatus.currTileLevel + " ZoomScale: " + this.viewStatus.zoomScale);
    this.mapView.setTileLevel(this.viewStatus.currTileLevel);

    var currPos;
    if (this.viewStatus.interpolater != null) { // Interpolater is running
      currPos = this.viewStatus.interpolater.getPos(currTime);
      this.mapView.setProjCenter(currPos.lp.lambda, currPos.lp.phi);
      this.mapView.setViewCenterPoint(currPos.viewPos[0], currPos.viewPos[1]);
      this.viewStatus.interpolater.isFinished() && (this.viewStatus.interpolater = null);
      this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
      this.mapView.render();
    } else if (this.viewStatus.targetLambdaPhi != null) { // new lambda phi requested, start up interpolater
      var center = [0, 0]; // this.mapView.getViewCenterPoint();
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
      // if (this.viewStatus.interpolater != null) { // NOTE why was this duplicated? First time thru?
      //   currPos = this.viewStatus.interpolater.getPos(currTime);
      //   this.mapView.setProjCenter(currPos.lp.lambda, currPos.lp.phi);
      //   this.mapView.setViewCenterPoint(currPos.viewPos[0], currPos.viewPos[1]);
      // }
    }
    if (this.prevScale != this.viewStatus.zoomScale) {
      this.imageProj.setScale(this.viewStatus.zoomScale);
      this.prevScale = this.viewStatus.zoomScale;
      this.mapView.render();
    }
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.mapView.render();
    this.prevTime = currTime;
  };

  this.startup = (imageProj) => {
    this.canvas = document.getElementById("webglCanvas");
    this.gl = this.canvas.getContext("webgl2");
    // this.gl = WebGLUtils.setupWebGL(this.canvas);
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
    this.init(imageProj);
  };

  this.init = (imageProj) => {
    //imageProj is a RasterAEQD
    var canvasInfo = this.canvas.getBoundingClientRect(); //read-only left, top, right, bottom, x, y, width, height properties of this.canvas
    var canvasSize = {
      width: canvasInfo.width,
      height: canvasInfo.height,
    };
    var tile_opts = {
      rootNumX: 2,
      rootNumY: 1,
      rootTileSizeX: Math.PI,
      rootTileSizeY: Math.PI,
      // maxTileLevel: this.maxTileLevel,
      tileOrigin: [-Math.PI, -Math.PI / 2],
      inverseY: false,
      canvasSize: canvasSize,
    };
    var cache_opts = {
      num: 50,
      crossOrigin: false,
      debug: this.debug,
    };

    imageProj.init(this.gl);
    imageProj.setProjCenter(this.lam0, this.phi0);
    this.mapView = new MapView(this.gl, imageProj, canvasSize, tile_opts, cache_opts);

    var viewRect = this.mapView.getViewRect();
    var radius = (viewRect[2] - viewRect[0]) / 2; //radius (pi)

    //Add custom function to MapView
    this.mapView.getURL = function (z, x, y) {
      //return "http://www.flatearthlab.com/data/20120925/adb12292ed/NE2_50M_SR_W/" + z + "/" + x + "/" + y + ".png"
      // return `https://api.mapbox.com/v4/mapbox.satellite/${z}/${x}/${y}.png?access_token=pk.eyJ1IjoiYml0c2xheWVyNDIiLCJhIjoiY205MXh4c2ZjMDY5czJrcHcwZTM4NHhiZyJ9.mMYRfw9tewpnBYmKmXXBMw`
      return "./images/" + z + "/" + x + "/" + y + ".png";
    };

    var currTileLevel = Math.floor(this.maxTileLevel * this.viewStatus.zoomScale / this.zoomMax);
    this.mapView.setTileLevel(currTileLevel);

    this.mapView.setWindow(-radius, -radius, radius, radius);

    this.mapView.requestImagesIfNecessary();
  };

  this.resizeCanvas = (canvas) => {
    var width = canvas.clientWidth,
      height = canvas.clientHeight;
    (canvas.width == width && canvas.height == height) ||
      ((canvas.width = width), (canvas.height = height));
  };

  //  If url includes ?projCenter=lat,log in degrees map will be centered there
  // //  e.g. http://localhost:8080/?projCenter=35.32,-82.48
  this.getProjCenterParameter = () => {
    let params = new URLSearchParams(document.location.search);
    let latLonStr = params.get("projCenter");
    if (latLonStr) {
      var latLon = latLonStr.split(",");
      if (latLon.length < 2) return null;
      var latDeg = parseFloat(latLon[0]),
        lonDeg = parseFloat(latLon[1]);
      if (isNaN(latDeg) || isNaN(lonDeg)) return null;
      this.phi0 = (latDeg * Math.PI) / 180; //degrees to radians
      this.lam0 = (lonDeg * Math.PI) / 180;
    }
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
  };

  this.handlePinch = (event) => { // TODO: make it work with new vals
    var canv_xy = this.checkAndGetMousePos(event); //verify on canvas
    if (canv_xy) {
      if (event.scale < 1.0) {
        this.viewStatus.zoomScale = this.viewStatus.pinchPrevScale * event.scale;
      } else {
        this.viewStatus.zoomScale = this.viewStatus.pinchPrevScale + event.scale - 1.0;
      }
      this.viewStatus.zoomScale = Math.min(Math.max(this.viewStatus.zoomMin, this.viewStatus.zoomScale), this.viewStatus.zoomMax);
      // this.imageProj.setScale(this.viewStatus.zoomScale);
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
      // this.imageProj.setScale(this.viewStatus.zoomScale);
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
