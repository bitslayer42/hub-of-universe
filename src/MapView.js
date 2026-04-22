import { TileManager } from "./mod/TileManager.js";
import { ImageCache, LRUCache } from "./mod/ImageCache.js";
import { Cities } from "./Cities.js";

let MapView = function (gl, imgProj, canvasSize, tile_opts, cache_opts) {
  this.gl = gl;
  this.rasterProj = imgProj;

  this.canvasSize = canvasSize;
  //
  this.tileManager = new TileManager(tile_opts);
  this.prevTileInfos_ = null;
  this.prevWindow_ = null;
  //
  this.imageCache = new ImageCache(cache_opts);
  //
  let self = this;
  this.imageCache.createTexture = function (img) {
    return self.createTexture(img);
  };
  //
  this.tileInfos = null;
  this.getURL = null;
  this.calculateLevel = null;
  this.currTileLevel = 0;
  // this.prevTileLevel = null;
  this.lam0 = 0;
  this.phi0 = 0;
  this.lat0 = 0;
  this.lon0 = 0;

  // this.cityList = []; // list of cities in current view
  // this.cityDiv = document.getElementById('citydiv');
  // this.cityCache = new LRUCache(1000);
  // this.cityFontColor = "black";
  this.cities = new Cities(this, LRUCache);
};

MapView.prototype.clearTileInfoCache_ = function () {
  this.prevWindow_ = null;
  this.prevTileInfos_ = null;
};

MapView.prototype.setProjCenter = function (lam, phi) {
  this.lam0 = lam;
  this.phi0 = phi;
  this.clearTileInfoCache_();
  this.rasterProj.setProjCenter(lam, phi);
};

MapView.prototype.getProjCenter = function () {
  return this.rasterProj.projection.getProjCenter();
};

MapView.prototype.resizeCanvas = function (canvas) {
  this.canvasSize.width = canvas.width;
  this.canvasSize.height = canvas.height;
}

MapView.prototype.setTileLevel = function (currTileLevel) {
  this.currTileLevel = currTileLevel;
};

MapView.prototype.setCityFontColor = function (color) {
  this.cities.cityFontColor = color;
};

MapView.prototype.getViewPointFromWindow = function (canvX, canvY) {
  let scaleX_ = (Math.PI * 2) / this.canvasSize.width; // convert pixel to pi
  let scaleY_ = (Math.PI * 2) / -this.canvasSize.height;
  let x = -Math.PI + canvX * scaleX_;
  let y = -Math.PI + (canvY - this.canvasSize.height) * scaleY_;
  return [x, y]; //radians
};

MapView.prototype.getLambdaPhiPointFromWindow = function (x, y) { // canvas x y pixel coordinates
  let viewPos = this.getViewPointFromWindow(x, y);
  let lam_phi = this.rasterProj.projection.inverse(viewPos[0], viewPos[1]);
  return lam_phi; // projected lambda, phi
};


MapView.prototype.resetImages = function () {
  this.imageCache.clearOngoingImageLoads();
};

// Called from init
MapView.prototype.requestImagesIfNecessary = async function () {
  if (this.getURL == null) return -1;
  this.getTileInfos_("init");
  let count = await this.requestImages_("init");
  return count;
};

// Called from animation
MapView.prototype.render = async function (fetchNewAssets, showCities) {
  if (this.getURL == null) return;
  if (fetchNewAssets) {
    this.getTileInfos_();
    await this.requestImages_();
  }
  await this.render_();
  if (showCities) {

    await this.cities.showCities(this, fetchNewAssets);
  } else {
    this.cities.clearCities();
  }
};

MapView.prototype.getTileInfos_ = function () {
  this.tileInfos = this.tileManager.getTileInfos(this.lam0, this.phi0, this.currTileLevel, this.getURL);
  // this.tileInfos = tileArray;
};

MapView.prototype.requestImages_ = async function () {
  for (let i = 0; i < this.tileInfos.length; ++i) {
    await this.imageCache.loadImageIfAbsent(this.tileInfos[i].url, this.tileInfos[i].rect);
  }
};

MapView.prototype.render_ = async function () {
  this.rasterProj.clear(this.canvasSize);
  let targetTextures = [];
  for (let i = 0; i < this.tileInfos.length; ++i) {
    let info = this.tileInfos[i];
    let tex = this.imageCache.getTexture(info.url);
    if (tex) {
      targetTextures.push(tex);
    }
  }

  let texCoords = new Float32Array([
    0.0, 0.0,   // left top
    0.0, 1.0,   // left bottom
    1.0, 0.0,   // right top
    1.0, 1.0    // right bottom
  ]);
  this.rasterProj.prepareRender(texCoords, [-Math.PI, -Math.PI, Math.PI, Math.PI]);
  if (0 < targetTextures.length) {
    this.rasterProj.renderTextures(targetTextures);
  }
};

//  TODO この実装の詳細は別の場所にあるべきか Should this implementation's detail be in a different location?
MapView.prototype.createTexture = function (img) {
  let tex = this.gl.createTexture();
  this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
  this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

  this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);

  this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  return tex;
};

/* -------------------------------------------------------------------------- */
export { MapView };
