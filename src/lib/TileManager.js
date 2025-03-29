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
 * @param {number} ??
 * @constructor
 */
var TileManager = function (tile_opts, imgProj) {
  this.rootNumX = 2;
  this.rootNumY = 1;
  this.rootTileSizeX = Math.PI;
  this.rootTileSizeY = Math.PI;
  this.maxTileLevel = 1;
  this.inverseY = false;
  this.tileOrigin = [-Math.PI, -Math.PI / 2];     // lower left
  this.imageProj = imgProj;
  this.getUrl = null;
  this.currTileLevel = 0;
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
    if ('maxTileLevel' in tile_opts) {
      this.maxTileLevel = tile_opts.maxTileLevel;
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

TileManager.prototype.getTileX_ = function (numX, lam) {
  return Math.floor(numX * (lam - this.tileOrigin[0]) / this.rootSizeX);
};

TileManager.prototype.getTileY_ = function (numY, phi) {
  var sign = this.inverseY ? -1 : +1;
  return Math.floor(sign * numY * (phi - this.tileOrigin[1]) / this.rootSizeY);
};

TileManager.prototype.subdivideTile = function (tile) {
  var arrTiles = [];
  var x1 = tile.rect[0];
  var y1 = tile.rect[1];
  var x2 = tile.rect[2];
  var y2 = tile.rect[3];
  var xMid = (x1 + x2) / 2;
  var yMid = (y1 + y2) / 2;
  var [ix, iy, iz] = [tile.xyz.x, tile.xyz.y, tile.xyz.z];
  //  subdivide tile into 4 tiles
  arrTiles.push({
    xyz: {x: ix * 2, y: iy * 2, z: iz + 1},
    rect: [x1, y1, xMid, yMid],
    url: this.getUrl(iz + 1, ix * 2, iy * 2)
  });
  arrTiles.push({
    xyz: {x: ix * 2 + 1, y: iy * 2, z: iz + 1},
    rect: [xMid, y1, x2, yMid],
    url: this.getUrl(iz + 1, ix * 2 + 1, iy * 2)
  });
  arrTiles.push({
    xyz: {x: ix * 2, y: iy * 2 + 1, z: iz + 1},
    rect: [x1, yMid, xMid, y2],
    url: this.getUrl(iz + 1, ix * 2, iy * 2 + 1)
  });
  arrTiles.push({
    xyz: {x: ix * 2 + 1, y: iy * 2 + 1, z: iz + 1},
    rect: [xMid, yMid, x2, y2],
    url: this.getUrl(iz + 1, ix * 2 + 1, iy * 2 + 1)
  });

  tile.children = arrTiles;
  return tile;
}

// 
TileManager.prototype.zoomInTiles = function (tileInfos) { 
  let retTiles = [];
  for (const tile of tileInfos) {
    let tileCenterX = (tile.rect[0] + tile.rect[2]) / 2;
    let tileCenterY = (tile.rect[1] + tile.rect[3]) / 2;
    console.log("tileCenter", tileCenterX, tileCenterY);
    let lambdaPhi = this.imageProj.projection.inverse(tileCenterX, tileCenterY);
    // let projCenter = this.imageProj.projection.getProjCenter();
    console.assert(lambdaPhi !== null, [tileCenterX, tileCenterY]);
    // let radius = ProjMath.sphericalDistance(projCenter, lambdaPhi);
    let radius = Math.sqrt(lambdaPhi.lambda * lambdaPhi.lambda + lambdaPhi.phi * lambdaPhi.phi);

    if (radius > Math.PI / (tile.xyz.z + 2) && tile.xyz.z < this.currTileLevel) { //// should be < ???!!!!!!!!!!!!!!!!!!
      let tilewkids = this.subdivideTile(tile);
        retTiles.push(this.zoomInTiles(tilewkids.children));
    } else {
      retTiles.push(tile);
    }
  };
      console.log("zoom", retTiles.map(t=>t.xyz?`${t.xyz.x}-${t.xyz.y}-${t.xyz.z}`:t), this.currTileLevel, new Date().getTime());
  return retTiles;
};

/**
 * getUrl : function(level, ix, iy) -> URL
 */
TileManager.prototype.getTileInfos = function (lamRange, phiRange, currTileLevel, getUrl) {
  this.currTileLevel = currTileLevel;
  this.getUrl = getUrl;
  var startLevel = 0;
  var tileNum = [this.rootNumX, this.rootNumY]; // this.getTileNum_(startLevel);
  var numX = tileNum[0];
  var numY = tileNum[1];
  var idxX1 = this.getTileX_(numX, lamRange[0]);
  var idxX2 = this.getTileX_(numX, lamRange[1]);

  var idxY1, idxY2;
  if (!this.inverseY) {
    idxY1 = this.getTileY_(numY, phiRange[0]);
    idxY2 = this.getTileY_(numY, phiRange[1]);
  } else {
    idxY1 = this.getTileY_(numY, phiRange[1]);
    idxY2 = this.getTileY_(numY, phiRange[0]);
  }

  var tileInfos = [];

  var iyMin = numY + 1;
  for (var idxY = idxY1; idxY <= idxY2; ++idxY) {
    var iy = idxY % numY;   //  正規化 normalization
    if (iyMin == iy) break;
    if (iy < iyMin) iyMin = iy;

    var ixMin = numX + 1;
    for (var idxX = idxX1; idxX <= idxX2; ++idxX) {
      var ix = idxX % numX;   //  正規化 normalization
      if (ixMin == ix) break;
      if (ix < ixMin) ixMin = ix;

      var str = this.getUrl(startLevel, ix, iy);
      var x1 = (this.rootSizeX * ix / numX) + this.tileOrigin[0];
      var x2 = (this.rootSizeX * (ix + 1) / numX) + this.tileOrigin[0];

      var y1, y2;
      if (!this.inverseY) {
        y1 = (this.rootSizeY * iy / numY) + this.tileOrigin[1];
        y2 = (this.rootSizeY * (iy + 1) / numY) + this.tileOrigin[1];
      } else {
        y1 = (-this.rootSizeY * (iy + 1) / numY) + this.tileOrigin[1];
        y2 = (-this.rootSizeY * iy / numY) + this.tileOrigin[1];
      }
      tileInfos.push({
        url: str,
        rect: [x1, y1, x2, y2],
        xyz: {x:ix, y:iy, z:startLevel},
      });
    }
  }
  var tileTree = tileInfos; // this.zoomInTiles(tileInfos, currTileLevel);
  let arrTiles = tileTree.flat(Infinity); // trees are arrays of arrays... of objects; flatten to array of objects
  return arrTiles;
};




export { TileManager };