
// Quadkey example
// https://docs.microsoft.com/en-us/bingmaps/articles/bing-maps-tile-system

// QuadKey zoom: What if zoomInTiles did the subdivision on the pre-projected tiles...
// 1) create array of levels maxTileLevel (+ 2?) to 0
// 2) for each level, create array of tiles based on where the center is two levels below

// Noctant
// +--+--+--+--+
// |NW|  N  |NE|
// +--+--+--+--+
// |  |     |  |
// + W+  C  + E+
// |  |     |  |
// +--+--+--+--+
// |SW|  S  |SE|
// +--+--+--+--+

// For corners, 4 tiles
//  ..
//  ..

// For center, 9 or 5 tiles
//  ...
//  ...
//  ...
//
//   .
//  ...
//   .

// For edges, 2 or 6 tiles
//  ..

//  ...
//  ...


let longitude = -74.0126; // -82.5 // 
let latitude = 40.7052; // 35.3 // 
let level = 12; // tile levels 0 to maxTileLevel
let tileSize = 256; // size of tile in pixels

function getTileXY(longitude, latitude, level) {
  // Convert longitude and latitude to pixel coordinates
  let sinLatitude = Math.sin(latitude * Math.PI / 180);
  let pixelX = ((longitude + 180) / 360) * tileSize * Math.pow(2, level);
  let pixelY = (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * tileSize * Math.pow(2, level);
  let tileX = Math.floor(pixelX / tileSize);
  let tileY = Math.floor(pixelY / tileSize);
  console.log("level", level, "tileSize", tileSize, "pixelX", pixelX, "pixelY", pixelY, "tileX", tileX, "tileY", tileY);
  return {tileX, tileY};
}

function tileXYToQuadkey(tileX, tileY, level) {
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

let {tileX, tileY} = getTileXY(longitude, latitude, level);
let quadKey = tileXYToQuadkey(tileX, tileY, level)
console.log("quadKey", quadKey);
const tileXY = quadkeyToTileXY(quadKey);
console.log("tileXY", tileXY);
console.log(`https://api.mapbox.com/v4/mapbox.satellite/${tileXY.z}/${tileXY.x}/${tileXY.y}.png?access_token=pk.eyJ1IjoiYml0c2xheWVyNDIiLCJhIjoiY205MXh4c2ZjMDY5czJrcHcwZTM4NHhiZyJ9.mMYRfw9tewpnBYmKmXXBMw`);

/*
function interleaveBits(x, y) {
  let result = 0;
  for (let i = 0; i < 16; i++) {
    result |= (x & (1 << i)) << i;
    result |= (y & (1 << i)) << (i + 1);
  }
  return result >>> 0;
}
let quadKey2 = interleaveBits(tileX, tileY).toString(4).padStart(level, '0'); // interleave bits of tileX and tileY
console.log("quadKey2", quadKey2);
*/