 /**
 * Raster Map Projection v0.0.13  2016-11-13
 * Copyright (C) 2016 T.Seno
 * All rights reserved.
 * @license GPL v3 License (http://www.gnu.org/licenses/gpl.html)
 */

import { ViewWindowManager } from "./lib/ViewWindowManager.js";
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
var MapView = function(gl, imgProj, canvasSize, tile_opts, cache_opts) {
  this.gl = gl;
  this.imageProj = imgProj;

  var viewWindowOpts = {
    // not used
  };
  var rangeRect = this.imageProj.projection.getRange();
  this.viewWindowManager_ = new ViewWindowManager(rangeRect, canvasSize, viewWindowOpts);
  //
  this.tileManager = new TileManager(tile_opts, this.imageProj);
  this.prevTileInfos_ = null;
  this.prevWindow_ = null;
  //
  this.imageCache = new ImageCache(cache_opts);
  var self = this;
  this.imageCache.createTexture = function(img) {
    return self.createTexture(img);
  };
  //
  this.centerIcon_ = null;
  this.centerIconSize_ = null;  //  iconSize: { width:, height: } [pixel]
  //
  this.graticuleInterval = 0;   //  (default 20) If it is 0 or less do not draw latitude and longitude lines 0以下の場合は緯度経度線を描画しない
  this.getURL = null;
  this.calculateLevel = null;
  this.currTileLevel = 0;
};

MapView.prototype.clearTileInfoCache_ = function() {
  this.prevWindow_ = null;
  this.prevTileInfos_ = null;
};

MapView.prototype.setCenterIcon = function(iconTexture, size) {
  this.centerIcon_ = iconTexture;
  this.centerIconSize_ = size;
};

MapView.prototype.setProjCenter = function(lam, phi) {
  this.clearTileInfoCache_();
  this.imageProj.setProjCenter(lam, phi);
};

MapView.prototype.getProjCenter = function() {
  return this.imageProj.projection.getProjCenter();
};

MapView.prototype.getViewRect = function() {
  return this.viewWindowManager_.getViewRect();
};

MapView.prototype.setWindow = function(x1, y1, x2, y2) {
  this.clearTileInfoCache_();
  this.viewWindowManager_.setViewWindow(x1, y1, x2, y2);
};

MapView.prototype.moveWindow = function(dx, dy) {
  this.viewWindowManager_.moveWindow(dx, dy);
};

MapView.prototype.setTileLevel = function(currTileLevel) {
  this.currTileLevel = currTileLevel;
};

// MapView.prototype.getViewCenterPoint = function() {
//   return this.viewWindowManager_.getViewWindowCenter();
// };

MapView.prototype.setViewCenterPoint = function(cx, cy) {
  this.viewWindowManager_.setViewWindowCenter(cx, cy);
};


MapView.prototype.getLambdaPhiPointFromWindow = function(x, y) {
  var viewPos = this.viewWindowManager_.getViewPointFromWindow(x, y);
  var lam_phi = this.imageProj.projection.inverse(viewPos[0], viewPos[1]);
  return lam_phi;
}; 


MapView.prototype.resetImages = function() {
  this.imageCache.clearOngoingImageLoads();
};

// Called from init
MapView.prototype.requestImagesIfNecessary = function() {
  if ( this.getURL == null )   return -1;
  var tileInfos = this.getTileInfos_();
  var count = this.requestImages_(tileInfos);
  return count;
};

// Called from animation
MapView.prototype.render = function() {
  if ( this.getURL == null )   return;
  var tileInfos = this.getTileInfos_();
  this.requestImages_(tileInfos);
  this.render_(tileInfos);
};

//  TODO この実装の詳細は別の場所にあるべきか Should this implementation's detail be in a different location?
MapView.prototype.createTexture = function(img) {
  var tex = this.gl.createTexture();
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


MapView.prototype.getTileInfos_ = function() {
  var window = this.viewWindowManager_.getViewWindow();
  if ( this.prevTileInfos_ != null && this.prevWindow_ != null ) {
    if (window[0] == this.prevWindow_[0] && window[1] == this.prevWindow_[1] &&
      window[2] == this.prevWindow_[2] && window[3] == this.prevWindow_[3]) {
        return this.prevTileInfos_;  //  TODO clone?
    }
    this.prevTileInfos_ = null;
    this.prevWindow_ = null;
  } 
  var dataRect = this.imageProj.projection.inverseBoundingBox(window[0], window[1], window[2], window[3]);
  var tileInfos = this.tileManager.getTileInfos(dataRect.lambda, dataRect.phi, this.currTileLevel, this.getURL);
  this.prevWindow_ = window;
  this.prevTileInfos_ = tileInfos;
  return tileInfos;
};


MapView.prototype.requestImages_ = function(tileInfos) {
  var count = 0;
  for (var i = 0; i < tileInfos.length; ++i ) {
    if ( this.imageCache.loadImageIfAbsent(tileInfos[i].url, tileInfos[i].rect) ) {
      ++count;
    }
  }
  return count;
};


MapView.prototype.render_ = function(tileInfos) {
  this.imageProj.clear(this.viewWindowManager_.canvasSize);
  var targetTextures = [];
  for (var i = 0; i < tileInfos.length; ++i ) {
    var info = tileInfos[i];
    var tex = this.imageCache.getTexture(info.url);
    if ( tex ) {
      targetTextures.push(tex);
    }
  }

  var texCoords = this.viewWindowManager_.getNormalizedRectAsTriangleStrip();
  this.imageProj.prepareRender(texCoords, this.viewWindowManager_.rect);
  if ( 0 < targetTextures.length ) {
    this.imageProj.renderTextures(targetTextures);
  }
  // if ( 0 < this.graticuleInterval ) {
  //   this.imageProj.renderGraticule(this.viewWindowManager_.rect, this.graticuleInterval);
  // }
  // //
  // if ( this.centerIcon_ ) {
  //   var iconSize = this.viewWindowManager_.getNormalizedSize(this.centerIconSize_);
  //   this.imageProj.prepareRender(texCoords, this.viewWindowManager_.rect);
  //   this.imageProj.renderOverlays(this.centerIcon_, iconSize);
  // }
};


/* -------------------------------------------------------------------------- */
export { MapView };
