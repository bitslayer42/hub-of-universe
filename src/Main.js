import { Interpolater } from "./mod/Interpolater.js";
import { MapView } from "./MapView.js";
import { RasterProj } from './RasterProj.js';
import 'hammerjs';

let Main = function () {
  let mapbox_access_token = import.meta.env.VITE_MAPBOX_KEY;
  let google_access_token = import.meta.env.VITE_GOOGLE_KEY;
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
    zoomScale: 3e+2, // zoomMin >= zoomScale >= zoomMax
    targetLambdaPhi: null,
    interpolater: null,
    currTileLevel: null,

  };
  this.layerSelect = document.querySelector('#layer');
  this.selectedLayer = this.layerSelect.value;
  this.googleSessions = [];


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
  this.animationFramesInit = 80; // number of frames to animate before stopping
  this.animationFrames = this.animationFramesInit;

  document.addEventListener('DOMContentLoaded', async () => {
    this.getQueryParams(); // check for url params
    this.canvas = document.querySelector('#webglCanvas');
    this.resizeCanvas(this.canvas);

    this.rasterProj = new RasterProj();
    this.rasterProj.setScale(this.viewStatus.zoomScale);
    await this.startup(this.rasterProj); // sets up this.canvas, webgl, and hammer, and calls init
    this.animation(); // starts animation
  });

  window.addEventListener('resize', () => {
    this.resizeCanvas(this.canvas);
    this.mapView.resizeCanvas(this.canvas);
    this.rasterProj.clear(this.canvas);
  });

  this.animation = () => {
    if (!this.mapView) return;
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
    console.log("Animation frames left: " + this.animationFrames);
    if (this.animationFrames > 0) {
      this.requestId = requestAnimationFrame(this.animation);
    } else {
      console.log("Animation finished.");
      this.animationFrames = this.animationFramesInit; // reset for next time
      this.mapView.render(true);
      this.setQueryParams();
    }
  };

  this.startup = async (rasterProj) => {
    this.gl = this.canvas.getContext("webgl2");
    if (!this.gl) {
      return void alert("Failed to setup WebGL.");
    }
    this.canvas.addEventListener("webglcontextlost", this.handleContextLost, false);
    this.canvas.addEventListener("webglcontextrestored", this.handleContextRestored, false);
    this.layerSelect.addEventListener('change', this.handleLayerChange.bind(this), false);

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

    this.googleSessions = await this.getSessions();
    await this.init(rasterProj);
  };

  this.init = async (rasterProj) => {
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

    await this.setLayer();

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
    // console.log("TileLvl: " + this.viewStatus.currTileLevel," + ZoomScl: " + this.viewStatus.zoomScale);
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

  this.getSessions = async () => { // Get Google Maps Tile API sessions for satellite, roadmap, terrain
    const language = navigator.language || "en-US";
    const locale = new Intl.Locale(language);
    const region = locale.region || "US";
    let google_body = {
      "language": language,
      "region": region,
    };

    google_body.layerTypes = ["layerRoadmap"];
    google_body.styles = [ // only used for roadmap
      {
        "featureType": "all",
        elementType: "labels.text",
        "stylers": [
          { "visibility": "off" }
        ]
      },
      {
        "featureType": "road",
        "elementType": "labels.text",
        "stylers": [
          { "visibility": "on" }
        ]
      }
    ];
    let mapTypes = ["satellite", "roadmap", "terrain"];
    let sessionKeys = [];
    for (let type of mapTypes) {
      google_body.mapType = type;
      // fetch session for each type
      const google_api_session = await fetch(`https://tile.googleapis.com/v1/createSession?key=${google_access_token}`, {
        method: "POST",
        body: JSON.stringify(google_body),
        headers: {
          "Content-Type": "application/json",
        }
      })
        .then(response => response.text())
        .catch(error => {
          console.error('Error fetching Google Maps Tile Session:', error);
        });
      const google_api_session_json = JSON.parse(google_api_session);
      sessionKeys.push(google_api_session_json.session);
    };
    return (sessionKeys);
  };

  this.setLayer = async () => { // which map layer to use
    let sessionKey = null;
    let layerSelect = document.querySelector('.attribution');
    if (this.selectedLayer === "mapbox_satellite") {
      layerSelect.innerHTML = `© <a href="https://www.mapbox.com/about/maps">Mapbox</a> 
        © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>
        © <a href="https://www.maxar.com/">Maxar</a>
        <strong><a href="https://apps.mapbox.com/feedback/" target="_blank">Improve this map</a></strong>`;

      this.mapView.getURL = function (z, x, y) { //Add custom function to MapView
        return `https://api.mapbox.com/v4/mapbox.satellite/${z}/${x}/${y}.png?access_token=${mapbox_access_token}`;
      }
    } else if (this.selectedLayer.slice(0, 6) === "google") {
      layerSelect.innerHTML = `Map data @2025 Google`;

      if (this.selectedLayer === "google_satellite") {
        sessionKey = this.googleSessions[0];
      } else if (this.selectedLayer === "google_roadmap") {
        sessionKey = this.googleSessions[1];
      } else if (this.selectedLayer === "google_terrain") {
        sessionKey = this.googleSessions[2];
      }

      this.mapView.getURL = function (z, x, y) { //Add custom function to MapView
        return `https://tile.googleapis.com/v1/2dtiles/${z}/${x}/${y}?session=${sessionKey}&key=${google_access_token}`;
      }
    }

  };

  this.setQueryParams = () => {
    let params = new URLSearchParams(window.location.search);
    params.set("zoom", this.viewStatus.zoomScale.toFixed(2)); // zoomScale
    params.set("lon", (this.viewStatus.lam0 * 180 / Math.PI).toFixed(6)); // radians to degrees
    params.set("lat", (this.viewStatus.phi0 * 180 / Math.PI).toFixed(6)); // radians to degrees
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
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

  this.handleLayerChange = async (event) => {
    this.selectedLayer = event.target.value;
    await this.setLayer();
    await this.init(this.rasterProj);
    this.animation();
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
      // case "ArrowUp":
      //   console.log("ArrowUp");
      //   this.lat0 += this.getPanRate(this.viewStatus.zoomScale);
      //   break;
      // case "ArrowDown":
      //   this.lat0 -= this.getPanRate(this.viewStatus.zoomScale);
      //   break;
      // case "ArrowLeft":
      //   this.lon0 -= this.getPanRate(this.viewStatus.zoomScale);
      //   break;
      // case "ArrowRight":
      //   this.lon0 += this.getPanRate(this.viewStatus.zoomScale);
      //   break;
      default:
        break;
    }
    this.viewStatus.zoomScale = Math.min(Math.max(this.zoomMin, this.viewStatus.zoomScale), this.zoomMax);
    cancelAnimationFrame(this.requestId);
    this.requestId = requestAnimationFrame(this.animation);
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
    }
  };

  this.handleContextLost = (event) => {
    event.preventDefault();
    cancelAnimationFrame(this.requestId), this.mapView.resetImages();
  };

  this.handleContextRestored = (event) => {
    this.init(this.rasterProj), (this.requestId = requestAnimationFrame(animation));
  };

};

new Main();

///////////////////////////////////////////////////////////////////
export { Main };
