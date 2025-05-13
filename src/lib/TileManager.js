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
  //
  if (typeof tile_opts !== 'undefined') {
    if ('canvasSize' in tile_opts) {
      this.canvasSize = tile_opts.canvasSize;
      this.tilesAcross = this.canvasSize.width / this.tileSize; // how many tiles fill the canvas
      this.tileMaxSize = 2.0 * Math.PI / this.tilesAcross;
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

TileManager.prototype.zoomInTiles = function (tile) {
  let retTiles = [];
  retTiles.push(tile);
  // console.log("tile: ", tile.xyz, Math.random()); // <==========
  let kidtiles = this.subdivideTile(tile);
  for (const kidtile of kidtiles) {

    let tileMidLam = (kidtile.rect[0] + kidtile.rect[2]) / 2;
    let tileMidPhi = (kidtile.rect[1] + kidtile.rect[3]) / 2;
    const atanSinhPi = 1.48442222;
    let webMercPhi = Math.atan(Math.sinh(tileMidPhi * Math.PI / atanSinhPi));
    // let xy = this.imageProj.projection.forward(tileMidLam, tileMidPhi);
    // let radius = Math.sqrt(xy.x * xy.x + xy.y * xy.y);
    let lamphi0 = { lambda: this.imageProj.projection.lam0, phi: this.imageProj.projection.phi0 };
    let lamphiP = { lambda: tileMidLam, phi: webMercPhi }
    let radius2 = ProjMath.sphericalDistance(
      lamphi0,
      lamphiP,
    );

            // function toDeg(radians) {return Math.round(radians * (180 / Math.PI));}
            // console.log("radius2: ", String(toDeg(radius2)).padStart(4, '0'), "%", kidtile.xyz,
            // toDeg(lamphi0.lambda), toDeg(lamphi0.phi), toDeg(lamphiP.lambda), toDeg(lamphiP.phi)); // <==========
    
    let fisheyeR = Math.log(1 + this.imageProj.projection.zoomScale * radius2) / Math.log(1 + this.imageProj.projection.zoomScale);
    if (fisheyeR < Math.PI / (kidtile.xyz.z) && tile.xyz.z <= this.currTileLevel) {
      retTiles.push(this.zoomInTiles(kidtile));
    }
  }
  return retTiles;
};

TileManager.prototype.getTileInfos = function (currTileLevel, getUrl) {
  this.currTileLevel = currTileLevel;
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
  return tileInfos;
};

export { TileManager };