// https://alastaira.wordpress.com/2011/01/23/the-google-maps-bing-maps-spherical-mercator-projection/
// Reproject the coordinates to the Spherical Mercator projection (from EPSG:4326 to EPSG:3857): 
// https://epsg.io/3857
// https://stackoverflow.com/questions/37523872/converting-coordinates-from-epsg-3857-to-4326

function WGS84toGoogleBing(lon, lat) {
  let x = lon * 20037508.34 / 180;
  let y = Math.Log(Math.Tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
  y = y * 20037508.34 / 180;
  return {x, y};
}

function GoogleBingtoWGS84Mercator (x, y) {
  let lon = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;

  lat = 180/Math.PI * (2 * Math.Atan(Math.Exp(lat * Math.PI / 180)) - Math.PI / 2);
  return {lon, lat};
}

function webMercToMerc(phi_in,lam_in) {
  let lam = lam_in;
  let phi = Math.log(Math.tan((90 + phi_in) * Math.PI / 360)) / (Math.PI / 180);
  return {phiout: phi,lamout: lam};
}

function mercToWebMerc (phi_in,lam_in) {
  let lam = lam_in;
  let phi = 180/Math.PI * (2 * Math.atan(Math.exp(phi_in * Math.PI / 180)) - Math.PI / 2);
  return {phiout: phi,lamout: lam};
}

let lat = 90.0;
// let lat = 35.3153846;x
let lon = -82.491435;
let phi_in = lat * 0.0174533;
let lam_in = lon * 0.0174533;
console.log({phi_in, lam_in});
 // high latitudes are more different, near the equator they are closer
console.log(webMercToMerc(phi_in,lam_in));

console.log(mercToWebMerc(phi_in,lam_in));

console.log(Math.PI / 2.0)

// -180 to 180 longitude, and from -85.0511 to 85.0511 latitude
// BOUNDS: Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34)

// https://en.wikipedia.org/wiki/Web_Mercator_projection

// The above equations expressed in a format for WolframAlpha
// plot y = log(tan((90 + x) * pi / 360)) / (pi / 180),x=-90..90  (correct range?)
// plot y =  180/pi * (2 * atan(exp(x * pi / 180)) - pi / 2),x=-90..90 

phi = log(tan((90.0 + phi) * pi / 360.0)) / (pi / 180.0)
phi =  180.0/pi * (2.0 * atan(exp(phi * pi / 180.0)) - pi / 2.0)