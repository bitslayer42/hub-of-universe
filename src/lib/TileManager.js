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
  var xHalf = (x1 + x2) / 2;
  var yHalf = (y1 + y2) / 2;
  var [ix, iy, iz] = [tile.xyz.x, tile.xyz.y, tile.xyz.z];
  //  subdivide tile into 4 tiles
  arrTiles.push({
    "url": "",
    "xyz": {
      "x": ix * 2,
      "y": iy * 2,
      "z": iz + 1
    },
    "rect": [x1, yHalf, xHalf, y2],
    "mid": {
      "lam": (x1 + xHalf) / 2,
      "phi": (yHalf + y2) / 2
    }
  });
  arrTiles.push({
    "url": "",
    "xyz": {
      "x": ix * 2 + 1,
      "y": iy * 2,
      "z": iz + 1
    },
    "rect": [xHalf, yHalf, x2, y2],
    "mid": {
      "lam": (xHalf + x2) / 2,
      "phi": (yHalf + y2) / 2
    }
  });
  arrTiles.push({
    "url": "",
    "xyz": {
      "x": ix * 2,
      "y": iy * 2 + 1,
      "z": iz + 1
    },
    "rect": [x1, y1, xHalf, yHalf],
    "mid": {
      "lam": (x1 + xHalf) / 2,
      "phi": (y1 + yHalf) / 2
    },
  });
  arrTiles.push({
    "url": "",
    "xyz": {
      "x": ix * 2 + 1,
      "y": iy * 2 + 1,
      "z": iz + 1
    },
    "rect": [xHalf, y1, x2, yHalf],
    "mid": {
      "lam": (xHalf + x2) / 2,
      "phi": (y1 + yHalf) / 2
    }
  });
  //  set url
  for (const tile of arrTiles) {
    var str = this.getUrl(tile.xyz.z, tile.xyz.x, tile.xyz.y);
    tile.url = str;
  }
  tile.children = arrTiles;
  return tile;
}

// 
TileManager.prototype.zoomInTiles = function (tileInfos) {
  for (const tile of tileInfos) {
    let kidtiles = this.subdivideTile(tile);
    for (const kidtile of kidtiles.children) {
      let xy = this.imageProj.projection.forward(kidtile.mid.lam, kidtile.mid.phi);
      let radius = Math.sqrt(xy.x * xy.x + xy.y * xy.y);

      if (radius < Math.PI / (tile.xyz.z + 0) && tile.xyz.z < this.currTileLevel) {
        tileInfos.push(kidtile);
      }
    }
  };
  return tileInfos;
};

/**
 * getUrl : function(level, ix, iy) -> URL
 */
TileManager.prototype.getTileInfos = function (lamRange, phiRange, currTileLevel, getUrl) {
  this.currTileLevel = currTileLevel;
  this.getUrl = getUrl;
  var firstTile = {
      "url": this.getUrl(0,0,0),
      "rect": [
        lamRange[0],
        phiRange[0],
        lamRange[1],
        phiRange[1]
      ],
      "xyz": {
        "x": 0,
        "y": 0,
        "z": 0
      },
      "mid": {
        "lam": 0,
        "phi": 0
      }
    };
  var tileTree = this.zoomInTiles([firstTile]);
  let tileInfos = tileTree.flat(Infinity); // trees are arrays of arrays... of objects; flatten to array of objects
  console.log(tileInfos.length);
  return tileInfos;
};




export { TileManager };