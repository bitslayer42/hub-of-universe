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
  this.currTileLevel = 0;
  this.canvasSize = { width: null, height: null };
  this.tilesAcross = 0;
  this.tileMaxSize = 0;
  this.tileSize = 256; // tile size in pixels
  this.theLikeHighestLevel = 0; // highest level of tiles
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

TileManager.prototype.subdivideTile = function (tile) {
  let arrTiles = [];
  let x1 = tile.rect[0];
  let y1 = tile.rect[1];
  let x2 = tile.rect[2];
  let y2 = tile.rect[3];
  let xHalf = (x1 + x2) / 2;
  let yHalf = (y1 + y2) / 2;
  let [ix, iy, iz] = [tile.xyz.x, tile.xyz.y, tile.xyz.z];
  //  subdivide tile into 4 tiles
  arrTiles.push({
    "xyz": {
      "x": ix * 2,
      "y": iy * 2,
      "z": iz + 1
    },
    rect: [x1, yHalf, xHalf, y2],
  });
  arrTiles.push({
    "xyz": {
      "x": ix * 2 + 1,
      "y": iy * 2,
      "z": iz + 1
    },
    "rect": [xHalf, yHalf, x2, y2],
  });
  arrTiles.push({
    "xyz": {
      "x": ix * 2,
      "y": iy * 2 + 1,
      "z": iz + 1
    },
    "rect": [x1, y1, xHalf, yHalf],
  });
  arrTiles.push({
    "xyz": {
      "x": ix * 2 + 1,
      "y": iy * 2 + 1,
      "z": iz + 1
    },
    "rect": [xHalf, y1, x2, yHalf],
  });
  // tile.children = arrTiles;
  return arrTiles;
}

TileManager.prototype.getRadius = function (kidtile) {
  let tileMidLam = (kidtile.rect[0] + kidtile.rect[2]) / 2;
  let tileMidPhi = (kidtile.rect[1] + kidtile.rect[3]) / 2;
  const atanSinhPi = 1.48442222;
  let webMercPhi = Math.atan(Math.sinh(tileMidPhi * Math.PI / atanSinhPi));
  let lamphi0 = { lambda: this.imageProj.projection.lam0, phi: this.imageProj.projection.phi0 };
  let lamphiP = { lambda: tileMidLam, phi: webMercPhi }
  let radius = ProjMath.sphericalDistance(
    lamphi0,
    lamphiP,
  );
  let fisheyeR = Math.log(1 + this.imageProj.projection.zoomScale * radius) /
    Math.log(1 + this.imageProj.projection.zoomScale);
  let adjForLat = Math.cos(tileMidPhi);
  fisheyeR = fisheyeR / adjForLat;
  return fisheyeR;
}

TileManager.prototype.getTileDiagonal = function (kidtile) {
  let x1 = kidtile.rect[0];
  let y1 = kidtile.rect[1];
  let x2 = kidtile.rect[2];
  let y2 = kidtile.rect[3];
  let botleft1 = this.imageProj.projection.forward(x1, y1);
  let topleft2 = this.imageProj.projection.forward(x1, y2);
  let topright3 = this.imageProj.projection.forward(x2, y2);
  let botright4 = this.imageProj.projection.forward(x2, y1);
  // Use smaller of diagonals
  let diag1 = Math.sqrt(
    Math.pow(botleft1.x - topright3.x, 2) +
    Math.pow(botleft1.y - topright3.y, 2)
  );
  let diag2 = Math.sqrt(
    Math.pow(topleft2.x - botright4.x, 2) +
    Math.pow(topleft2.y - botright4.y, 2)
  );
  let diagonal = Math.min(diag1, diag2);
  return diagonal;
}

TileManager.prototype.zoomInTiles = function (tile) {
  let retTiles = [];
  retTiles.push(tile);
  let kidtiles = this.subdivideTile(tile);
  for (const kidtile of kidtiles) {
    let radius = this.getRadius(kidtile); // distance to center of map from this tile
    let diagonal = this.getTileDiagonal(kidtile); // diagonal size of tile in 2pi's
    let radiusOK = radius < Math.PI * 2.0 / kidtile.xyz.z;
    let diagonalOK = diagonal > this.tileMaxSize || kidtile.xyz.z <= 1;
    let curLevelOK = tile.xyz.z <= this.currTileLevel;
    // console.log("tile: ", kidtile.xyz, "rad: ", radiusOK, radius, Math.PI / kidtile.xyz.z, "diag: ", diagonalOK, "maxlev: ", curLevelOK, (radiusOK && diagonalOK && curLevelOK) ? "" : "--NO");
    if (radiusOK && diagonalOK && curLevelOK) {
      if(kidtile.xyz.z>this.theLikeHighestLevel) {this.theLikeHighestLevel = kidtile.xyz.z}
      retTiles.push(this.zoomInTiles(kidtile));
    }
  }
  return retTiles;
};

TileManager.prototype.getTileInfos = function (currTileLevel, getUrl) {
  this.currTileLevel = currTileLevel;
  this.theLikeHighestLevel = 1;
  let firstTile = {
    "rect": [
      -Math.PI,
      -Math.PI / 2.0,
      Math.PI,
      Math.PI / 2.0
    ],
    "xyz": {
      "x": 0,
      "y": 0,
      "z": 0
    },
  };
  let tileTree = this.zoomInTiles(firstTile);
  let tileInfos = tileTree.flat(Infinity); // trees are arrays of arrays... of objects; flatten to array of objects
  for (const tile of tileInfos) {
    //  set url
    let str = getUrl(tile.xyz.z, tile.xyz.x, tile.xyz.y);
    tile.url = str;
  }
  console.log("theLikeHighestLevel: ", this.theLikeHighestLevel);
  return tileInfos;
};

export { TileManager };