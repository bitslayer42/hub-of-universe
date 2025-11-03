let TileManager = function (tile_opts, rasterProj) {
  this.rasterProj = rasterProj;
  // this.canvasSize = { width: null, height: null };
  // this.tilesAcross = 0;
  // // this.tileMaxSize = 0;
  this.tileSize = 256; // tile size in pixels
  this.centerQuadkey = null; // quadkey of tile at center of map
};

TileManager.prototype.resizeCanvas = function (canvasSize) {
}

TileManager.prototype.getCenterTileInfo = function (lam0, phi0, level) {
  // Get tile at center of map
  let sinPhi0 = Math.sin(phi0);
  let pixelX = ((lam0 + Math.PI) / (2 * Math.PI)) * this.tileSize * Math.pow(2, level);
  let pixelY = (0.5 - Math.log((1 + sinPhi0) / (1 - sinPhi0)) / (4 * Math.PI)) * this.tileSize * Math.pow(2, level);
  let tileX = Math.floor(pixelX / this.tileSize);
  let tileY = Math.floor(pixelY / this.tileSize);
  this.centerQuadkey = this.tileXYToQuadkey(tileX, tileY, level);
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

TileManager.prototype.getNSWEtiles = function (tile, tileList = [N, S, W, E, NE, NW, SE, SW]) {
  // Get the tiles surrounding the given tile that are specified by the parameter tileList
  // which is an array of strings which can include: [N, S, W, E, NE, NW, SE, SW]
  let N = 0, NE = 1, E = 2, SE = 3, S = 4, SW = 5, W = 6, NW = 7;
  let tiles = [];
  let { x, y, z } = tile.xyz;
  let maxZ = Math.pow(2, z) - 1; // max tile index at this zoom level

  if (tileList.length === 0) {
    return tiles; //  no tiles to return
  }
  if (tileList.includes(N)) {
    if (y > 0) {
      tiles.push({ "xyz": { "x": x, "y": y - 1, "z": z }, });
    }
  }
  if (tileList.includes(S)) {
    if (y < maxZ) {
      tiles.push({ "xyz": { "x": x, "y": y + 1, "z": z }, });
    }
  }
  if (tileList.includes(W)) {
    tiles.push({ "xyz": { "x": (x == 0 ? maxZ : x - 1), "y": y, "z": z }, });
  }
  if (tileList.includes(E)) {
    tiles.push({ "xyz": { "x": (x == maxZ ? 0 : x + 1), "y": y, "z": z }, });
  }
  if (tileList.includes(NE)) {
    if (y > 0) {
      tiles.push({ "xyz": { "x": (x == maxZ ? 0 : x + 1), "y": y - 1, "z": z }, });
    }
  }
  if (tileList.includes(NW)) {
    if (y > 0) {
      tiles.push({ "xyz": { "x": (x == 0 ? maxZ : x - 1), "y": y - 1, "z": z }, });
    }
  }
  if (tileList.includes(SE)) {
    if (y < maxZ) {
      tiles.push({ "xyz": { "x": (x == maxZ ? 0 : x + 1), "y": y + 1, "z": z }, });
    }
  }
  if (tileList.includes(SW)) {
    if (y < maxZ) {
      tiles.push({ "xyz": { "x": (x == 0 ? maxZ : x - 1), "y": y + 1, "z": z }, });
    }
  }
  return tiles;
}

TileManager.prototype.getAdjacentTiles = function (currTile) {
  let tileInfos = [];
  let NSWEtiles = [];
  let N = 0, NE = 1, E = 2, SE = 3, S = 4, SW = 5, W = 6, NW = 7;

  let quadrant = currTile.quadkey.slice(-1);
  // add three tiles in the current quadrant
  if (quadrant === '0') {
    NSWEtiles = this.getNSWEtiles(currTile, [N, W, NW]);
  }
  else if (quadrant === '1') {
    NSWEtiles = this.getNSWEtiles(currTile, [N, E, NE]);
  }
  else if (quadrant === '2') {
    NSWEtiles = this.getNSWEtiles(currTile, [S, W, SW]);
  }
  else if (quadrant === '3') {
    NSWEtiles = this.getNSWEtiles(currTile, [S, E, SE]);
  }
  tileInfos.push(...NSWEtiles);

  return tileInfos;
}

TileManager.prototype.pushLevelOneTiles = function (tileInfos) {
  //  push all four level one tiles to the tileInfos array
  let levelOneTiles = [
    { "xyz": { "x": 0, "y": 0, "z": 1 }, "quadkey": "0" },
    { "xyz": { "x": 1, "y": 0, "z": 1 }, "quadkey": "1" },
    { "xyz": { "x": 0, "y": 1, "z": 1 }, "quadkey": "2" },
    { "xyz": { "x": 1, "y": 1, "z": 1 }, "quadkey": "3" }
  ];
  tileInfos.push(...levelOneTiles);
}

TileManager.prototype.getTileInfos = function (lam0, phi0, currTileLevel, getUrl) {
  // console.log("getTileInfos", lam0, phi0, currTileLevel);
  let tileInfos = [];
  let prevTile = null;
  this.getCenterTileInfo(lam0, phi0, currTileLevel);
  for (let level = currTileLevel; level >= 2; level--) {
    let currTileQuadkey;
    if (prevTile ){
      currTileQuadkey = prevTile.quadkey.slice(0, -1);
    } else { // first tile
      currTileQuadkey = this.centerQuadkey;
    }
    let currTileXYZ = quadkeyToTileXY(currTileQuadkey);
    let currTile = {
      "xyz": currTileXYZ, "quadkey": currTileQuadkey,
    };
    tileInfos.push(currTile);
    let nextAdjacentTiles = this.getAdjacentTiles(currTile);
    tileInfos.push(...nextAdjacentTiles);
    prevTile = currTile;
  }
  this.pushLevelOneTiles(tileInfos);

  for (const tile of tileInfos) {
    tile.rect = this.getRectFromXYZ(tile);
    tile.url = getUrl(tile.xyz.z, tile.xyz.x, tile.xyz.y);
  }
  return tileInfos.reverse();

};

export { TileManager };
