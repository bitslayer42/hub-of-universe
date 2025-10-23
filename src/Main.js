import { Interpolater } from "./mod/Interpolater.js";
import { MapView } from "./MapView.js";
import { RasterProj } from './RasterProj.js';
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
  this.viewStatus = {
    drag: false,
    dragPrevPos: null, // canvas x y from upper left corner
    pinchPrevScale: null,
    zoomScale: 3e+6, // zoomMin >= zoomScale >= zoomMax
    targetLambdaPhi: null,
    interpolater: null,
    currTileLevel: null,

  };

  var locations = [ // lat, log * 0.0174533
    [-1.29174307860817, 0.7104078658215001], // Fraunces Tavern NYC -74.0113949 40.703355
    [-1.34406026074966, 0.6787546684457174], // DC capitol -77.009003 38.889931
    [-1.24019010226, 0.73929973401], // Beantown  -71.0576282 42.3587364
    [-1.40412724747, 0.43790456061],   // Key Largo -80.4505307 25.0900724
    [-0.00142463433, 0.89850833693], // London  -0.0816255 51.4807135
    [0.0, 0.0], // null island 
    [-0.785017, 1.15794], //greenland white
    [-2.066469, 0.591122], //venice beach la ca -118.4754411 33.9862641
    [-1.4407952048317003, 0.6212504054863001], // hub of universe
  ];
  // Center of map: lam0 longitude, phi0 latitude in radians -82.551449,35.595011
  var locat = 8;
  [this.viewStatus.lam0, this.viewStatus.phi0] = locations[locat];

  this.zoomMin = 0.01;
  this.zoomMax = 3e+6;
  this.maxTileLevel = 22; // tile levels 0 to maxTileLevel
  this.ringRadius = 0.00001; // radius of flat center disk in radians // 0.00001

  this.rasterProj = null;
  this.debug = false; // "local", "red", false
  this.animationFrames = 80; // number of frames to animate before stopping

  document.addEventListener('DOMContentLoaded', () => {
    this.getQueryParams(); // check for url params
    this.canvas = document.getElementById('webglCanvas');
    this.resizeCanvas(this.canvas);

    this.rasterProj = new RasterProj();
    this.rasterProj.setScale(this.viewStatus.zoomScale);
    this.startup(this.rasterProj); // sets up this.canvas, webgl, and hammer, and calls init
    this.animation(); // starts animation
  });

  window.addEventListener('resize', () => {
    this.resizeCanvas(this.canvas);
    this.mapView.resizeCanvas(this.canvas);
    this.rasterProj.clear(this.canvas);
  });

  this.animation = () => {
    let getNewTiles = false;
    let currTime = new Date().getTime();
    this.setTileLevel();

    let currPos;
    if (this.viewStatus.interpolater != null) { // Interpolater is running
      currPos = this.viewStatus.interpolater.getPos(currTime);
      this.mapView.setProjCenter(currPos.lp.lambda, currPos.lp.phi);
      if (this.viewStatus.interpolater.isFinished()) { // Interpolater finished
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
      this.rasterProj.setScale(this.viewStatus.zoomScale);
      this.rasterProj.setFlatRatio(this.ringRadius);
      this.prevScale = this.viewStatus.zoomScale;
      getNewTiles = true;
    }
    this.mapView.render(getNewTiles);
    this.animationFrames--;
    // console.log("Animation frames left: " + this.animationFrames);
    if (this.animationFrames > 0) {
      this.requestId = requestAnimationFrame(this.animation);
    } else {
      // console.log("Animation finished.");
      this.animationFrames = 80; // reset for next time
      this.mapView.render(true);
    }
  };

  this.startup = (rasterProj) => {
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
    mc.on("pan", this.handlePan);
    mc.on("panstart", this.handlePanStart);
    mc.on("panend pancancel", this.handlePanEnd);
    mc.on("tap", this.handleDoubleTap);

    window.WheelEvent && document.addEventListener("wheel", this.handleWheel, false);

    document.addEventListener('keydown', this.handleKeydown);

    this.init(rasterProj);
  };

  this.init = (rasterProj) => {
    let canvasInfo = this.canvas.getBoundingClientRect(); //read-only left, top, right, bottom, x, y, width, height properties of this.canvas
    let canvasSize = {
      width: canvasInfo.width,
      height: canvasInfo.height,
    };
    let tile_opts = {
      canvasSize: canvasSize,
    };
    let cache_opts = {
      num: 100,
      crossOrigin: false,
      debug: this.debug,
    };

    rasterProj.init(this.gl);
    this.mapView = new MapView(this.gl, rasterProj, canvasSize, tile_opts, cache_opts);
    this.mapView.setProjCenter(this.viewStatus.lam0, this.viewStatus.phi0);

    //Add custom function to MapView
    this.mapView.getURL = function (z, x, y) {
      return `https://api.mapbox.com/v4/mapbox.satellite/${z}/${x}/${y}.png?access_token=${mapbox_access_token}`;
    };

    this.setTileLevel();
    this.mapView.requestImagesIfNecessary();
  };

  this.resizeCanvas = (canvas) => {
    let width = canvas.clientWidth,
      height = canvas.clientHeight;
    (canvas.width == width && canvas.height == height) ||
      ((canvas.width = width), (canvas.height = height));
    cancelAnimationFrame(this.requestId);
    this.requestId = requestAnimationFrame(this.animation);
    // console.log("Canvas resized to: " + width + " x " + height);
  };

  this.setTileLevel = () => {
    this.viewStatus.currTileLevel = Math.round(Math.log10(this.viewStatus.zoomScale) * 3.0);// Math.floor(this.maxTileLevel * this.viewStatus.zoomScale / this.zoomMax);
    this.viewStatus.currTileLevel = Math.max(Math.min(this.viewStatus.currTileLevel, this.maxTileLevel), 0);
    // let consolelamphi = this.mapView.getProjCenter();
    // console.log("TileLvl: " + this.viewStatus.currTileLevel,
    //   " ZoomScl: " + this.viewStatus.zoomScale,
    //   // " latlon0: " + consolelamphi.lambda / 0.0174533 + " " + consolelamphi.phi / 0.0174533,
    // );
    this.mapView.setTileLevel(this.viewStatus.currTileLevel);
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
        this.viewStatus.lam0 = longitude * 0.0174533; //degrees to radians
        this.viewStatus.phi0 = latitude * 0.0174533; //degrees to radians
      }
    }
    let local = params.get("local");
    if (local == "") {
      this.debug = "local";
    }
    let red = params.get("red");
    if (red == "") {
      this.debug = "red";
    }
  };

  this.setQueryParams = () => {
    this.savelocCheckbox = document.getElementById('saveloc');

    if (this.savelocCheckbox.checked) {
      let params = new URLSearchParams(window.location.search);
      params.set("zoom", this.viewStatus.zoomScale.toFixed(2)); // zoomScale
      params.set("lon", (this.viewStatus.lam0 * 180 / Math.PI).toFixed(6)); // radians to degrees
      params.set("lat", (this.viewStatus.phi0 * 180 / Math.PI).toFixed(6)); // radians to degrees
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }
  }

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

  this.handleKeydown = (event) => {
    // console.log("Key pressed: " + event.key);
      switch (event.key) {
        case '=':
        case '+':
          // zoom in
          this.viewStatus.zoomScale = this.viewStatus.zoomScale * 1.1;
          break;
        case '-':
        case '_':
          // zoom out
          this.viewStatus.zoomScale = this.viewStatus.zoomScale / 1.1;
          break;

        case "ArrowUp":
          console.log("Up arrow pressed!");
          // Add your logic for the Up arrow here
          break;
        case "ArrowDown":
          console.log("Down arrow pressed!");
          // Add your logic for the Down arrow here
          break;
        case "ArrowLeft":
          console.log("Left arrow pressed!");
          // Add your logic for the Left arrow here
          break;
        case "ArrowRight":
          console.log("Right arrow pressed!");
          // Add your logic for the Right arrow here
          break;
        default:
      // Handle other keys or do nothing
      break;
  }
    this.viewStatus.zoomScale = Math.min(Math.max(this.zoomMin, this.viewStatus.zoomScale), this.zoomMax);
    cancelAnimationFrame(this.requestId);
    this.requestId = requestAnimationFrame(this.animation);
    this.setQueryParams();
  }

  this.handleWheel = (event) => {
    if (event.deltaY < 0) {
      this.viewStatus.zoomScale = this.viewStatus.zoomScale * 1.1;
    }
    else {
      this.viewStatus.zoomScale = this.viewStatus.zoomScale / 1.1;
    }
    this.viewStatus.zoomScale = Math.min(Math.max(this.zoomMin, this.viewStatus.zoomScale), this.zoomMax);
    cancelAnimationFrame(this.requestId);
    this.requestId = requestAnimationFrame(this.animation);
    this.setQueryParams();
  };

  this.handlePinch = (event) => {
    if (event.scale > 1.0) {
      this.viewStatus.zoomScale = this.viewStatus.zoomScale * 1.05;
    }
    else {
      this.viewStatus.zoomScale = this.viewStatus.zoomScale / 1.05;
    }
    this.viewStatus.zoomScale = Math.min(Math.max(this.zoomMin, this.viewStatus.zoomScale), this.zoomMax);
    cancelAnimationFrame(this.requestId);
    this.requestId = requestAnimationFrame(this.animation);
    this.setQueryParams();
  };

  this.getPanRate = (zoomScale) => {
    // how far should we pan given current zoom level?
    if (zoomScale < 1) {
      return 100;
    } else if (zoomScale < 10) {
      return 300;
    } else if (zoomScale < 100) {
      return 500;
    } else if (zoomScale < 1000) {
      return 1000;
    } else if (zoomScale < 10000) {
      return 10000;
    } else if (zoomScale < 100000) {
      return 50000;
    } else {
      return zoomScale;
    }
  }

  this.handlePan = (event) => {
    if (this.viewStatus.drag) {
      let canv_xy = this.checkAndGetGesturePos(event);
      if (null != canv_xy) {
        if (this.viewStatus.dragPrevPos) {
          event.preventDefault();
          let deltaPanRate = this.getPanRate(this.viewStatus.zoomScale);
          let deltaX = (canv_xy[0] - this.viewStatus.dragPrevPos[0]) / deltaPanRate;
          let deltaY = (canv_xy[1] - this.viewStatus.dragPrevPos[1]) / deltaPanRate;
          let curr_lam_phi = this.mapView.getProjCenter();
          let newLam0 = curr_lam_phi.lambda - deltaX;
          let newPhi0 = Math.max(Math.min(curr_lam_phi.phi + deltaY, Math.PI / 2.0), -Math.PI / 2.0); // limit phi to -90 to 90 degrees
          this.mapView.setProjCenter(newLam0, newPhi0);
        }
        this.viewStatus.dragPrevPos = canv_xy;
      }
    }
  }

  this.handlePanStart = (event) => {
    this.viewStatus.drag = true;
    let canv_xy = this.checkAndGetGesturePos(event); // get canvas x y from upper left corner
    if (canv_xy) {
      event.preventDefault();
      this.viewStatus.dragPrevPos = canv_xy;
      this.requestId = requestAnimationFrame(this.animation);
    };
  };

  this.handlePanEnd = (event) => {
    this.viewStatus.drag = false;
    this.viewStatus.dragPrevPos = null;
    this.mapView.render(true); // render to get new tiles if necessary
    this.setQueryParams();
  };

  this.handleDoubleTap = (event) => {
    let canv_xy = this.checkAndGetGesturePos(event);
    if (canv_xy) {
      event.preventDefault();
      let lam_phi = this.mapView.getLambdaPhiPointFromWindow(canv_xy[0], canv_xy[1]);
      this.viewStatus.lam0 = lam_phi.lambda;
      this.viewStatus.phi0 = lam_phi.phi;
      this.viewStatus.targetLambdaPhi = lam_phi; // set target lambda, phi for interpolater
      this.requestId = requestAnimationFrame(this.animation);
      this.setQueryParams();
    }
  };

  this.handleContextLost = (event) => {
    event.preventDefault();
    cancelAnimationFrame(this.requestId), this.mapView.resetImages();
  };

  this.handleContextRestored = (event) => {
    init(), (this.requestId = requestAnimationFrame(animation));
  };

};

new Main();

///////////////////////////////////////////////////////////////////
export { Main };
