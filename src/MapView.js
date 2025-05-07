/**
* Raster Map Projection v0.0.13  2016-11-13
* Copyright (C) 2016 T.Seno
* All rights reserved.
* @license GPL v3 License (http://www.gnu.org/licenses/gpl.html)
*/

import { TileManager } from "./lib/TileManager.js";
import { ImageCache } from "./lib/ImageCache.js";

/* ------------------------------------------------------------ */
/**
 * Map View
 * @param {object} gl
 * @param {object} RasterAEQD or RasterProjLAEA
 * @param {number} ??
 * @constructor
 */
let MapView = function (gl, imgProj, canvasSize, tile_opts, cache_opts) {
  this.gl = gl;
  this.imageProj = imgProj;

  this.canvasSize = canvasSize;
  //
  this.tileManager = new TileManager(tile_opts, this.imageProj);
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
  this.getURL = null;
  this.calculateLevel = null;
  this.currTileLevel = 0;
  this.prevTileLevel = null;
};

MapView.prototype.clearTileInfoCache_ = function () {
  this.prevWindow_ = null;
  this.prevTileInfos_ = null;
};

MapView.prototype.setProjCenter = function (lam, phi) {
  this.clearTileInfoCache_();
  this.imageProj.setProjCenter(lam, phi);
};

MapView.prototype.getProjCenter = function () {
  return this.imageProj.projection.getProjCenter();
};

MapView.prototype.moveWindow = function (dx, dy) {
  console.log("MapView.prototype.moveWindow");
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
  return [x, y]; // pi's
};

MapView.prototype.getLambdaPhiPointFromWindow = function (x, y) {
  let viewPos = this.getViewPointFromWindow(x, y);
  let lam_phi = this.imageProj.projection.inverse(viewPos[0], viewPos[1]);
  return lam_phi;
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
  console.log("MapView.prototype.getTileInfos_");
  this.tileInfos = this.tileManager.getTileInfos(this.currTileLevel, this.getURL);
  console.log("this.tileInfos.length: ", this.tileInfos.length);
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
  this.imageProj.clear(this.canvasSize);
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
  this.imageProj.prepareRender(texCoords, [-Math.PI, -Math.PI, Math.PI, Math.PI]);
  if (0 < targetTextures.length) {
    this.imageProj.renderTextures(targetTextures);
  }
};


/* -------------------------------------------------------------------------- */
export { MapView };
