import { Interpolater } from "./mod/Interpolater.js";
import { MapView } from "./MapView.js";
import { RasterAEQD } from './RasterAEQD.js';
import { mapbox_access_token } from './MapboxAccessToken.js';
import 'hammerjs';

let Main = function () {
  this.interpolateTimeSpan = 1e3;
  this.gl = null;
  this.canvas = null;
  this.mapView = null;
  this.requestId = null;
  this.prevTime = null;
  this.prevScale = null;
  // Center of map: lam0 longitude, phi0 latitude in radians -82.5,35.3
  // this.lam0 = -74.0113949 * 0.0174533; // -1.29174307860817 // Manhattan
  // this.phi0 = 40.703355 * 0.0174533; // 0.7104078658215001
  this.lam0 = -1.34406026074966; // DC capital
  this.phi0 = 0.6787546684457174; // 
  this.viewStatus = {
    drag: false,
    dragPrevPos: null,
    pinchPrevScale: null,
    zoomScale: 300.01, // zoomMin >= zoomScale >= zoomMax
    targetLambdaPhi: null,
    interpolater: null,
    currTileLevel: null,
  };
  this.zoomMin = 0.01;
  this.zoomMax = 15_000_000.01;
  this.maxTileLevel = 22; // tile levels 0 to maxTileLevel
  this.imageProj = null;
  this.debug = false; // "local", "boxred", false

  document.addEventListener('DOMContentLoaded', () => {
    this.getQueryParams(); // check for url params
    this.canvas = document.getElementById('webglCanvas');
    this.resizeCanvas(this.canvas);

    this.imageProj = new RasterAEQD();
    this.imageProj.setScale(this.viewStatus.zoomScale);
    //imageProj is a RasterAEQD
    this.startup(this.imageProj); // sets up this.canvas, webgl, and hammer, and calls init
    this.animation(); // starts animation
  });

  window.addEventListener('resize', () => {
    this.resizeCanvas(this.canvas);
    this.mapView.resizeCanvas(this.canvas);
    this.imageProj.clear(this.canvas);
  });

  this.animation = () => {
    let getNewTiles = false;
    let currTime = new Date().getTime();
    this.setTileLevel();

    let currPos;
    if (this.viewStatus.interpolater != null) { // Interpolater is running
      currPos = this.viewStatus.interpolater.getPos(currTime);
      this.mapView.setProjCenter(currPos.lp.lambda, currPos.lp.phi);
      if (this.viewStatus.interpolater.isFinished()) {
        this.viewStatus.interpolater = null;
        getNewTiles = true;
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
    this.gl = this.canvas.getContext("webgl2");
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
    this.mapView.setProjCenter(this.lam0, this.phi0);

    //Add custom function to MapView
    this.mapView.getURL = function (z, x, y) {
      return `https://api.mapbox.com/v4/mapbox.satellite/${z}/${x}/${y}.png?access_token=${mapbox_access_token}`;
      // return `./images/${z}/${x}/${y}.png`;
    };

    this.setTileLevel();
    this.mapView.requestImagesIfNecessary();
  };

  this.resizeCanvas = (canvas) => {
    let width = canvas.clientWidth,
      height = canvas.clientHeight;
    (canvas.width == width && canvas.height == height) ||
      ((canvas.width = width), (canvas.height = height));
  };

  this.setTileLevel = () => {
    this.viewStatus.currTileLevel = Math.round(Math.log10(this.viewStatus.zoomScale) * 3.0);// Math.floor(this.maxTileLevel * this.viewStatus.zoomScale / this.zoomMax);
    this.viewStatus.currTileLevel = Math.max(Math.min(this.viewStatus.currTileLevel, this.maxTileLevel),0);
    // let consolelamphi = this.mapView.getProjCenter();
    console.log("TileLvl: " + this.viewStatus.currTileLevel,
                " ZoomScl: " + this.viewStatus.zoomScale,
                // " lamphi0: " + consolelamphi.lambda / 0.0174533 + " " + consolelamphi.phi / 0.0174533,
              );
    this.mapView.setTileLevel(this.viewStatus.currTileLevel)
  }

  // Set variables from query parameters in the URL
  // e.g. http://localhost:1234/?zoom=1000&lon=-74.0113949&lat=40.703355
  this.getQueryParams = () => {
    let params = new URLSearchParams(window.location.search);
    let zoomScale = params.get("zoom");
    if (zoomScale) {
      zoomScale = parseFloat(zoomScale);
      if (!isNaN(zoomScale)) {
        this.viewStatus.zoomScale = Math.min(Math.max(this.zoomMin, zoomScale), this.zoomMax);
      }
    }
    let latitude = params.get("lat");
    let longitude = params.get("lon");
    if (latitude && longitude) {
      latitude = parseFloat(latitude);
      longitude = parseFloat(longitude);
      if (!isNaN(latitude) && !isNaN(longitude)) {
        this.lam0 = longitude * 0.0174533; //degrees to radians
        this.phi0 = latitude * 0.0174533; //degrees to radians
      }
    }
    let debug = params.get("debug");
    if (debug) {
      this.debug = debug;
    }
  };

  this.setQueryParams = () => {
    let params = new URLSearchParams(window.location.search);
    params.set("zoomScale", this.viewStatus.zoomScale);
    params.set("lon", (this.lam0 * 180 / Math.PI).toFixed(6)); // radians to degrees
    params.set("lat", (this.phi0 * 180 / Math.PI).toFixed(6)); // radians to degrees
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }

  // //returns pixels 0,0 top left of canvas
  // this.checkAndGetMousePos = (event) => {
  //   let canv_xy = this.canvas.getBoundingClientRect();
  //   let left = event.clientX - canv_xy.left;
  //   let top = event.clientY - canv_xy.top;
  //   if (left < 0 || top < 0 || canv_xy.width < left || canv_xy.height < top) { //offscreen
  //     return null;
  //   }
  //   return [left, top];
  // };

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
    // let canv_xy = this.checkAndGetMousePos(event); //verify on canvas
    // if (canv_xy) {
    if (event.scale < 1.0) {
      this.viewStatus.zoomScale = this.viewStatus.pinchPrevScale * event.scale;
    } else {
      this.viewStatus.zoomScale = this.viewStatus.pinchPrevScale + event.scale - 1.0;
    }
    this.viewStatus.zoomScale = Math.min(Math.max(this.viewStatus.zoomMin, this.viewStatus.zoomScale), this.viewStatus.zoomMax);
    // }
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
    // let canv_xy = this.checkAndGetMousePos(event); //verify on canvas
    // if (canv_xy) {
    if (event.deltaY < 0) {
      this.viewStatus.zoomScale = this.viewStatus.zoomScale * 1.1;
    }
    else {
      this.viewStatus.zoomScale = this.viewStatus.zoomScale / 1.1;
    }
    this.viewStatus.zoomScale = Math.min(Math.max(this.zoomMin, this.viewStatus.zoomScale), this.zoomMax);
    // console.log("wheel.deltaY", event.deltaY, "zoomScale100", this.viewStatus.zoomScale);
    // }
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
