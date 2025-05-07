/*! FlatEarth WebGL v0.0.13  2016-11-13
 * Copyright (C) 2016 T.Seno
 * Copyright (C) 2016 www.flatearthlab.com
 * All rights reserved.
 */

import { Interpolater } from "./lib/Interpolater.js";
import { MapView } from "./MapView.js";
import { RasterAEQD } from './RasterAEQD.js';

let Main = function () {
  this.interpolateTimeSpan = 1e3;
  this.gl = null;
  this.canvas = null;
  this.mapView = null;
  this.requestId = null;
  this.prevTime = null;
  this.prevScale = null;
  // Center of map: lam0 longitude, phi0 latitude in radians
  this.lam0 = -82.0 * 0.0174533;
  this.phi0 = 35.0 * 0.0174533;
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
  this.zoomMax = 60.0;
  this.maxTileLevel = 7; // tile levels 0 to maxTileLevel
  this.imageProj = null;
  this.debug = false;

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

  window.addEventListener('resize', () => {
    this.resizeCanvas(this.canvas);
    this.mapView.resizeCanvas(this.canvas);
    this.imageProj.clear(this.canvas);
  });

  this.animation = () => {
    let getNewTiles = false;
    let currTime = new Date().getTime();
    this.viewStatus.currTileLevel = Math.floor(this.maxTileLevel * this.viewStatus.zoomScale / this.zoomMax);
    // console.log("Tile Level: " + this.viewStatus.currTileLevel + " ZoomScale: " + this.viewStatus.zoomScale);
    this.mapView.setTileLevel(this.viewStatus.currTileLevel);

    let currPos;
    if (this.viewStatus.interpolater != null) { // Interpolater is running
      currPos = this.viewStatus.interpolater.getPos(currTime);
      this.mapView.setProjCenter(currPos.lp.lambda, currPos.lp.phi);
      if (this.viewStatus.interpolater.isFinished()) {
        this.viewStatus.interpolater = null;
        this.mapView.render(getNewTiles); // throw in an extra one why not
        this.mapView.render(getNewTiles); // throw in an extra one why not
        this.mapView.render(getNewTiles); // throw in an extra one why not
        this.mapView.render(getNewTiles); // throw in an extra one why not
        getNewTiles = false;
      };
    } else if (this.viewStatus.targetLambdaPhi != null) { // new lambda phi requested, start up interpolater
      let currLambdaPhi = this.mapView.getProjCenter();
      let targLambdaPhi = this.viewStatus.targetLambdaPhi;
      this.viewStatus.interpolater = Interpolater.create(
        currLambdaPhi,
        targLambdaPhi,
        [0, 0],
        [0, 0],
        this.interpolateTimeSpan
      );
      this.viewStatus.targetLambdaPhi = null;
      getNewTiles = true;
    }
    if (this.prevScale != this.viewStatus.zoomScale) {
      this.imageProj.setScale(this.viewStatus.zoomScale);
      this.prevScale = this.viewStatus.zoomScale;
      getNewTiles = true;
    }
    this.mapView.render(getNewTiles);
    this.requestId = requestAnimationFrame(this.animation);
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

    let mc = new Hammer.Manager(this.canvas, {
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
    let canvasInfo = this.canvas.getBoundingClientRect(); //read-only left, top, right, bottom, x, y, width, height properties of this.canvas
    let canvasSize = {
      width: canvasInfo.width,
      height: canvasInfo.height,
    };
    let tile_opts = {
      canvasSize: canvasSize,
    };
    let cache_opts = {
      num: 50,
      crossOrigin: false,
      debug: this.debug,
    };

    imageProj.init(this.gl);
    imageProj.setProjCenter(this.lam0, this.phi0);
    this.mapView = new MapView(this.gl, imageProj, canvasSize, tile_opts, cache_opts);

    //Add custom function to MapView
    this.mapView.getURL = function (z, x, y) {
      //return "http://www.flatearthlab.com/data/20120925/adb12292ed/NE2_50M_SR_W/" + z + "/" + x + "/" + y + ".png"
      // return `https://api.mapbox.com/v4/mapbox.satellite/${z}/${x}/${y}.png?access_token=pk.eyJ1IjoiYml0c2xheWVyNDIiLCJhIjoiY205MXh4c2ZjMDY5czJrcHcwZTM4NHhiZyJ9.mMYRfw9tewpnBYmKmXXBMw`
      return "./images/" + z + "/" + x + "/" + y + ".png";
    };

    let currTileLevel = Math.floor(this.maxTileLevel * this.viewStatus.zoomScale / this.zoomMax);
    this.mapView.setTileLevel(currTileLevel);

    this.mapView.requestImagesIfNecessary();
  };

  this.resizeCanvas = (canvas) => {
    let width = canvas.clientWidth,
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
      let latLon = latLonStr.split(",");
      if (latLon.length < 2) return null;
      let latDeg = parseFloat(latLon[0]),
        lonDeg = parseFloat(latLon[1]);
      if (isNaN(latDeg) || isNaN(lonDeg)) return null;
      this.phi0 = (latDeg * Math.PI) / 180; //degrees to radians
      this.lam0 = (lonDeg * Math.PI) / 180;
    }
  };

  //returns pixels 0,0 top left of canvas
  this.checkAndGetMousePos = (event) => {
    let canv_xy = this.canvas.getBoundingClientRect();
    let left = event.clientX - canv_xy.left;
    let top = event.clientY - canv_xy.top;
    if (left < 0 || top < 0 || canv_xy.width < left || canv_xy.height < top) { //offscreen
      return null;
    }
    return [left, top];
  };

  //returns pixels 0,0 top left of canvas
  this.checkAndGetGesturePos = (event) => {
    let canv_xy = this.canvas.getBoundingClientRect();
    let left = event.center.x - canv_xy.left;
    let top = event.center.y - canv_xy.top;
    if (left < 0 || top < 0 || canv_xy.width < left || canv_xy.height < top) { //offscreen
      return null;
    }
    return [left, top];
  };

  this.handlePinch = (event) => { // TODO: make it work with new vals
    let canv_xy = this.checkAndGetMousePos(event); //verify on canvas
    if (canv_xy) {
      if (event.scale < 1.0) {
        this.viewStatus.zoomScale = this.viewStatus.pinchPrevScale * event.scale;
      } else {
        this.viewStatus.zoomScale = this.viewStatus.pinchPrevScale + event.scale - 1.0;
      }
      this.viewStatus.zoomScale = Math.min(Math.max(this.viewStatus.zoomMin, this.viewStatus.zoomScale), this.viewStatus.zoomMax);
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
      let canv_xy = this.checkAndGetGesturePos(event);
      if (null != canv_xy) {
        if (this.viewStatus.dragPrevPos) {
          event.preventDefault();
          let dx = canv_xy[0] - this.viewStatus.dragPrevPos[0];
          let dy = canv_xy[1] - this.viewStatus.dragPrevPos[1];
          this.mapView.moveWindow(dx, dy);
        }
        this.viewStatus.dragPrevPos = canv_xy;
      }
    }
  };

  this.handlePanStart = (event) => {
    this.viewStatus.drag = true;
    let canv_xy = this.checkAndGetGesturePos(event);
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
    let canv_xy = this.checkAndGetGesturePos(event);
    if (canv_xy) {
      event.preventDefault();
      let lam_phi = this.mapView.getLambdaPhiPointFromWindow(canv_xy[0], canv_xy[1]);
      this.viewStatus.targetLambdaPhi = lam_phi; //{lambda: 1.533480323761242, phi: 0.5899993533326611} ; //c
    }
  };

  this.handleWheel = (event) => {
    let canv_xy = this.checkAndGetMousePos(event); //verify on canvas
    if (canv_xy) {
      this.viewStatus.zoomScale += event.deltaY * -0.01;
      this.viewStatus.zoomScale = Math.min(Math.max(this.zoomMin, this.viewStatus.zoomScale), this.zoomMax);
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
