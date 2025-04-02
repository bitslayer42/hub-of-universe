

let zoomScale = 30.0;

function fwd_fisheye([x, y]) { 
//   [x, y] = [x / Math.PI, y / Math.PI];
  let rho = Math.sqrt(x*x + y*y);
  let theta = Math.atan2(y, x);
  let fisheyeR = Math.log(1 + zoomScale * rho) / Math.log(1 + zoomScale); // * Math.sin(Math.acos(rho));
  return [ Math.cos(theta) * fisheyeR, Math.sin(theta) * fisheyeR ];
}


function inv_fisheye([x, y]) { 
//   [x, y] = [x / Math.PI, y / Math.PI];
  let rho = Math.sqrt(x*x + y*y);
  let theta = Math.atan2(y, x);
  let fisheyeR = (Math.exp(rho * Math.log(1.0 + zoomScale)) - 1.0) / zoomScale;
  return [ Math.cos(theta) * fisheyeR, Math.sin(theta) * fisheyeR ];
}

// x and y between -1 and 1 ( in program it is between -pi and pi)
zoomScale = 1;
console.log(inv_fisheye(fwd_fisheye([0.2, -0.1])));
zoomScale = 10;
console.log(inv_fisheye(fwd_fisheye([0.2, -0.1])));
zoomScale = 20;
console.log(inv_fisheye(fwd_fisheye([0.2, -0.1])));
zoomScale = 30;
console.log(inv_fisheye(fwd_fisheye([0.2, -0.1])));

zoomScale = 1;
console.log(fwd_fisheye(inv_fisheye([0.2, -0.1])));
zoomScale = 10;
console.log(fwd_fisheye(inv_fisheye([0.2, -0.1])));
zoomScale = 20;
console.log(fwd_fisheye(inv_fisheye([0.2, -0.1])));
zoomScale = 30;
console.log(fwd_fisheye(inv_fisheye([0.2, -0.1])));

