 /**
 * Raster Map Projection v0.0.13  2016-11-13
 * Copyright (C) 2016 T.Seno
 * All rights reserved.
 * @license GPL v3 License (http://www.gnu.org/licenses/gpl.html)
 */
import { ProjMath } from "./ProjMath.js";

/**
 * ラスタタイル情報管理 Raster tile information management
 * @param {number} rootNumX
 * @param {number} rootNumY
 * @param {number} numLevels
 * @constructor
 */
var TileManager = function(tile_opts) {
  this.rootNumX = 2;
  this.rootNumY = 1;
  this.rootTileSizeX = Math.PI;
  this.rootTileSizeY = Math.PI;
  this.numLevels = 1;
  this.inverseY = false;
  this.tileOrigin = [ -Math.PI, -Math.PI/2 ];     // lower left
  //
  if (typeof tile_opts !== 'undefined') {
    if ('rootNumX' in tile_opts) {
      this.rootNumX = tile_opts.rootNumX;
    }
    if ('rootNumY' in tile_opts) {
      this.rootNumY = tile_opts.rootNumY;
    }
    if ('rootTileSizeX' in tile_opts) {
      this.rootTileSizeX = tile_opts.rootTileSizeX;
    }
    if ('tileSizeY' in tile_opts) {
      this.rootTileSizeY = tile_opts.rootTileSizeY;
    }
    if ('numLevels' in tile_opts) {
      this.numLevels = tile_opts.numLevels;
    }
    if ('inverseY' in tile_opts) {
      this.inverseY = tile_opts.inverseY;   //  TODO booleanへの型変換. Type conversion
    }
    if ('tileOrigin' in tile_opts) {
      this.tileOrigin = tile_opts.tileOrigin;   //  TODO Array型チェック!!  Type check
    }
  }
  //
  this.rootSizeX = this.rootNumX * this.rootTileSizeX;
  this.rootSizeY = this.rootNumY * this.rootTileSizeY;
};

TileManager.prototype.getTileX_ = function(numX, lam) {
  return Math.floor( numX * (lam - this.tileOrigin[0]) / this.rootSizeX );
};

TileManager.prototype.getTileY_ = function(numY, phi) {
  var sign = this.inverseY ? -1 : +1;
  return Math.floor( sign * numY * (phi - this.tileOrigin[1]) / this.rootSizeY );
};

TileManager.prototype.getTileNum_ = function(level) {
  var p = Math.round(ProjMath.clamp(level, 0, this.numLevels-1));
  var s = (1 << p); // s = 2^p
  return [ s * this.rootNumX, s * this.rootNumY ];
};


/**
 * getUrl : function(level, ix, iy) -> URL
 */
TileManager.prototype.getTileInfos = function(lamRange, phiRange, level, getUrl) {
  var tileNum = this.getTileNum_(level);
  var numX = tileNum[0];
  var numY = tileNum[1];
  var idxX1 = this.getTileX_(numX, lamRange[0]);
  var idxX2 = this.getTileX_(numX, lamRange[1]);

  var idxY1, idxY2;
  if ( !this.inverseY ) {
    idxY1 = this.getTileY_(numY, phiRange[0]);
    idxY2 = this.getTileY_(numY, phiRange[1]);
  } else {
    idxY1 = this.getTileY_(numY, phiRange[1]);
    idxY2 = this.getTileY_(numY, phiRange[0]);
  }

  var ret = [];

  var iyMin = numY + 1;
  for ( var idxY = idxY1; idxY <= idxY2; ++idxY ) {
    var iy = idxY % numY;   //  正規化 normalization
    if ( iyMin == iy )   break;
    if ( iy < iyMin )    iyMin = iy;

    var ixMin = numX + 1;
    for ( var idxX = idxX1; idxX <= idxX2; ++idxX ) {
      var ix = idxX % numX;   //  正規化 normalization
      if ( ixMin == ix )   break;
      if ( ix < ixMin )   ixMin = ix;

      var str = getUrl(level, ix, iy);
      var x1 = (this.rootSizeX * ix / numX) + this.tileOrigin[0];
      var x2 = (this.rootSizeX * (ix + 1) / numX) + this.tileOrigin[0];

      var y1, y2;
      if ( !this.inverseY ){
        y1 = (this.rootSizeY * iy / numY) + this.tileOrigin[1];
        y2 = (this.rootSizeY * (iy + 1) / numY) + this.tileOrigin[1];
      } else {
        y1 = (-this.rootSizeY * (iy + 1) / numY) + this.tileOrigin[1];
        y2 = (-this.rootSizeY * iy / numY) + this.tileOrigin[1];
      }
      ret.push({
        url: str,
        rect: [x1, y1, x2, y2]
      });
    }
  }
  return ret;
};

export { TileManager };