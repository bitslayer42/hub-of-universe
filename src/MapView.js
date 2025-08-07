import { TileManager } from "./mod/TileManager.js";
import { ImageCache } from "./mod/ImageCache.js";

let MapView = function (gl, imgProj, canvasSize, tile_opts, cache_opts) {
  this.gl = gl;
  this.rasterProj = imgProj;

  this.canvasSize = canvasSize;
  //
  this.tileManager = new TileManager(tile_opts, this.rasterProj);
  this.prevTileInfos_ = null;
  this.prevWindow_ = null;
  //
  this.imageCache = new ImageCache(cache_opts);
  let self = this;
  this.imageCache.createTexture = function (img) {
    return self.createTexture(img);
  };
  //
  this.tileInfos = null;
  this.centerOffset = null;
  this.getURL = null;
  this.calculateLevel = null;
  this.currTileLevel = 0;
  // this.prevTileLevel = null;
  this.lam0 = 0;
  this.phi0 = 0;
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
  this.tileManager.resizeCanvas(this.canvasSize);
}

MapView.prototype.setTileLevel = function (currTileLevel) {
  this.currTileLevel = currTileLevel;
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
MapView.prototype.requestImagesIfNecessary = function () {
  if (this.getURL == null) return -1;
  this.getTileInfos_();
  let count = this.requestImages_(this.tileInfos);
  return count;
};

// Called from animation
MapView.prototype.render = function (getNewTiles) {
  if (this.getURL == null) return;
  if (getNewTiles) {
    this.getTileInfos_();
    this.requestImages_(this.tileInfos);
  }
  this.render_(this.tileInfos);
}

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


MapView.prototype.getTileInfos_ = function () {
  let { tileArray, centerOffset } = this.tileManager.getTileInfos(this.lam0, this.phi0, this.currTileLevel, this.getURL);
  this.tileInfos = tileArray;
  this.centerOffset = centerOffset;
};


MapView.prototype.requestImages_ = function () {
  let count = 0;
  for (let i = 0; i < this.tileInfos.length; ++i) {
    if (this.imageCache.loadImageIfAbsent(this.tileInfos[i].url, this.tileInfos[i].rect)) {
      ++count;
    }
  }
  return count;
};


MapView.prototype.render_ = function () {
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
    this.rasterProj.renderTextures(targetTextures, this.centerOffset);
  }
};


/* -------------------------------------------------------------------------- */
export { MapView };
