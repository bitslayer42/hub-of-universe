/**
* Raster Map Projection v0.0.13  2016-11-13
* Copyright (C) 2016 T.Seno
* All rights reserved.
* @license GPL v3 License (http://www.gnu.org/licenses/gpl.html)
*/
import { ProjMath } from "./ProjMath.js";
``
let TileManager = function (tile_opts, imgProj) {
  this.imageProj = imgProj;
  this.canvasSize = { width: null, height: null };
  this.tilesAcross = 0;
  this.tileMaxSize = 0;
  this.tileSize = 256; // tile size in pixels
  //
  if (typeof tile_opts !== 'undefined') {
    if ('canvasSize' in tile_opts) {
      this.canvasSize = tile_opts.canvasSize;
      this.tilesAcross = this.canvasSize.width / this.tileSize; // how many tiles fill the canvas
      this.tileMaxSize = 2.0 * Math.PI / this.tilesAcross; // size of a tile in "2pi's"
    }
  }
};

TileManager.prototype.resizeCanvas = function (canvasSize) {
  this.canvasSize = canvasSize;
  this.tilesAcross = this.canvasSize.width / this.tileSize; // how many tiles fill the canvas
  this.tileMaxSize = 2.0 * Math.PI / this.tilesAcross;
}

TileManager.prototype.getTileXY = function (longitude, latitude, level) {
  // Convert longitude and latitude to pixel coordinates
  let sinLatitude = Math.sin(latitude * Math.PI / 180);
  let pixelX = ((longitude + 180) / 360) * this.tileSize * Math.pow(2, level);
  let pixelY = (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * this.tileSize * Math.pow(2, level);
  let tileX = Math.floor(pixelX / this.tileSize);
  let tileY = Math.floor(pixelY / this.tileSize);
  return { tileX, tileY };
}

TileManager.prototype.tileXYToQuadkey = function (tileX, tileY, level) {
  let quadkey = '';
  for (let i = level; i > 0; i--) {
    let digit = 0;
    const mask = 1 << (i - 1);
    if ((tileX & mask) !== 0) {
      digit |= 1;
    }
    if ((tileY & mask) !== 0) {
      digit |= 2;
    }
    quadkey += digit.toString();
  }
  return quadkey;
}

function quadkeyToTileXY(quadkey) {
  let x = 0;
  let y = 0;
  const z = quadkey.length;
  for (let i = z; i > 0; i--) {
    const mask = 1 << (i - 1);
    const digit = parseInt(quadkey.charAt(z - i));
    if (digit & 1) {
      x |= mask;
    }
    if (digit & 2) {
      y |= mask;
    }
  }
  return { x: x, y: y, z: z };
}

TileManager.prototype.getRectFromXYZ = function (tile) {
  //  get the tile rect from tile xyz
  let baseX = -Math.PI;
  let baseY = Math.PI / 2.0;
  let baseWidth = Math.PI * 2.0;
  let baseHeight = Math.PI;
  let tileWidth = baseWidth / Math.pow(2, tile.xyz.z);
  let tileHeight = baseHeight / Math.pow(2, tile.xyz.z);
  let x1 = baseX + tile.xyz.x * tileWidth;
  let y2 = baseY - tile.xyz.y * tileHeight;
  let x2 = baseX + (tile.xyz.x + 1) * tileWidth;
  let y1 = baseY - (tile.xyz.y + 1) * tileHeight;

  return [x1, y1, x2, y2];
}

TileManager.prototype.getNSWEtiles = function (tile) {
  //  get the four tiles to the north, south, west and east of the given tile
  let tiles = [];
  let { x, y, z } = tile.xyz;
  //  north
  if (y > 0) {
    tiles.push({
      "xyz": { "x": x, "y": y - 1, "z": z },
      "quadkey": this.tileXYToQuadkey(x, y - 1, z)
    });
  }
  //  south
  if (y < Math.pow(2, z) - 1) {
    tiles.push({
      "xyz": { "x": x, "y": y + 1, "z": z },
      "quadkey": this.tileXYToQuadkey(x, y + 1, z)
    });
  }
  //  west
  if (x > 0) {
    tiles.push({
      "xyz": { "x": x - 1, "y": y, "z": z },
      "quadkey": this.tileXYToQuadkey(x - 1, y, z)
    });
  } else {
    //  if we are at the left edge, we can wrap around to the right edge
    tiles.push({
      "xyz": { "x": Math.pow(2, z) - 1, "y": y, "z": z },
      "quadkey": this.tileXYToQuadkey(Math.pow(2, z) - 1, y, z)
    });
  }
  //  east
  if (x < Math.pow(2, z) - 1) {
    tiles.push({
      "xyz": { "x": x + 1, "y": y, "z": z },
      "quadkey": this.tileXYToQuadkey(x + 1, y, z)
    });
  } else {
    //  if we are at the right edge, we can wrap around to the left edge
    tiles.push({
      "xyz": { "x": 0, "y": y, "z": z },
      "quadkey": this.tileXYToQuadkey(0, y, z)
    });
  }
  return tiles;
}

TileManager.prototype.getFirstTile = function (lam0, phi0, currTileLevel) {
  let latitude = phi0 * 180 / Math.PI;
  let longitude = lam0 * 180 / Math.PI;
  let { tileX, tileY } = this.getTileXY(longitude, latitude, currTileLevel);
  return {
    "xyz": {
      "x": tileX,
      "y": tileY,
      "z": currTileLevel
    },
    "quadkey": this.tileXYToQuadkey(tileX, tileY, currTileLevel),
  }
}

TileManager.prototype.getTileInfos = function (lam0, phi0, currTileLevel, getUrl) {
  let tileInfos = [];

  //  get the first tile
  let currTile = this.getFirstTile(lam0, phi0, currTileLevel);
  tileInfos.push(currTile);
  let NSWEtiles = this.getNSWEtiles(currTile);
  tileInfos.push(...NSWEtiles);
  //  get the other tiles
  for (let level = currTileLevel-1; level >= 0; level--) {
    let nextTileQuadkey = currTile.quadkey.slice(0,-1);
    let nextTileXYZ = quadkeyToTileXY(nextTileQuadkey);
    let nextTile = {
      "xyz": nextTileXYZ,
      "quadkey": nextTileQuadkey,
    };
    tileInfos.push(nextTile);
    let nextNSWEtiles = this.getNSWEtiles(nextTile);
    tileInfos.push(...nextNSWEtiles);
    currTile = nextTile;
  }

  for (const tile of tileInfos) {
    tile.rect = this.getRectFromXYZ(tile);
    tile.url = getUrl(tile.xyz.z, tile.xyz.x, tile.xyz.y);
  }
  return tileInfos.reverse();
};

export { TileManager };