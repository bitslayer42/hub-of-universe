 /**
 * Raster Map Projection v0.0.13  2016-11-13
 * Copyright (C) 2016 T.Seno
 * All rights reserved.
 * @license GPL v3 License (http://www.gnu.org/licenses/gpl.html)
 */
/* ------------------------------------------------------------ */

/**
 * 直交座標系間の変換 Conversion between orthogonal coordinate systems 
 * @param {Array.<number>} src_coord_rect
 * @param {Array.<number>} dst_coord_rect
 * @constructor
 */
var CoordTransform = function(src_coord_rect, dst_coord_rect) {
  this.src_x1_ = src_coord_rect[0];
  this.src_y1_ = src_coord_rect[1];
  this.src_x2_ = src_coord_rect[2];
  this.src_y2_ = src_coord_rect[3];
  //
  this.dst_x1_ = dst_coord_rect[0];
  this.dst_y1_ = dst_coord_rect[1];
  this.dst_x2_ = dst_coord_rect[2];
  this.dst_y2_ = dst_coord_rect[3];
  //
  this.scaleX_ = (dst_coord_rect[2] - dst_coord_rect[0]) / (src_coord_rect[2] - src_coord_rect[0]);
  this.scaleY_ = (dst_coord_rect[3] - dst_coord_rect[1]) / (src_coord_rect[3] - src_coord_rect[1]);
};

// CoordTransform.prototype.scaleX = function() {
//   return this.scaleX_;
// };

// CoordTransform.prototype.scaleY = function() {
//   return this.scaleY_;
// };

CoordTransform.prototype.forwardPoint = function(src_pos) {
  var x = this.dst_x1_ + (src_pos[0] - this.src_x1_) * this.scaleX_;
  var y = this.dst_y1_ + (src_pos[1] - this.src_y1_) * this.scaleY_;
  return [x, y];
};


// CoordTransform.prototype.forwardRect = function(src_rect) {
//   var pt1 = this.forwardPoint([src_rect[0], src_rect[1]]);
//   var pt2 = this.forwardPoint([src_rect[2], src_rect[3]]);
//   return [pt1[0], pt1[1], pt2[0], pt2[1]];
// };


/* ------------------------------------------------------------ */

var ViewWindowManager = function(viewRect, canvasSize, opts) {
  this.canvasSize = { width: canvasSize.width, height: canvasSize.height };  //  TODO assert?
  //
  this.viewRect_ = viewRect;   // 投影後の全体領域, projに依存する定数 Constant depending on the entire region after projection 
  //
  this.rect = this.getViewRect();
};

// ViewWindowManager.prototype.setCanvasSize = function(canvasWidth, canvasHeight) {
//   this.canvasSize.width = canvasWidth;
//   this.canvasSize.height = canvasHeight;
// };

// ViewWindowManager.prototype.getCanvasSize = function() {
//   return { width: this.canvasSize.width, height: this.canvasSize.height };  //  copy
// };

ViewWindowManager.prototype.getViewRect = function() {
  return this.viewRect_.slice(0);  //  投影後の全体領域 Absolute area after projection
};

ViewWindowManager.prototype.setViewWindow = function(x1, y1, x2, y2) {
  this.rect = [x1, y1, x2, y2];
};

ViewWindowManager.prototype.getViewWindow = function() {
  return this.rect.slice(0);   //  copy
};

ViewWindowManager.prototype.setViewWindowCenter = function(cx, cy) {
  var w = (this.rect[2] - this.rect[0]) / 2;
  var h = (this.rect[3] - this.rect[1]) / 2;
  this.rect = [ cx-w, cy-h, cx+w, cy+h ];
};

// ViewWindowManager.prototype.getViewWindowCenter = function() {
//   var x = (this.rect[2] + this.rect[0]) / 2;
//   var y = (this.rect[3] + this.rect[1]) / 2;
//   return [x, y];
// };

ViewWindowManager.prototype.moveWindow = function(dx, dy) {    //THIS WILL GO AWAY
  var tx = - dx * (this.rect[2] - this.rect[0]) / this.canvasSize.width;
  var ty = dy * (this.rect[3] - this.rect[1]) / this.canvasSize.height;  //  画面座標の上下は逆 Upside down of screen coordinates
  var x1 = this.rect[0] + tx;
  var y1 = this.rect[1] + ty;
  var x2 = this.rect[2] + tx;
  var y2 = this.rect[3] + ty;
  this.rect = [ x1, y1, x2, y2 ];
};

// ViewWindowManager.prototype.zoomWindow = function(dz) {
//   //  画面上でのY方向の長さをdzピクセル分だけ絞り込んだ部分の領域に拡大表示する。
//   //  X方向はそれに合わせて等縮尺で拡大する。
//   //. Zoom in the Y direction length on the screen to the area of ​​the portion that is narrowed down by dz pixels
//   //  The X direction is enlarged on an equal scale correspondingly.
//   var s = (this.canvasSize.height - dz) / this.canvasSize.height;
//   var w = s * (this.rect[2] - this.rect[0]) / 2;
//   var h = s * (this.rect[3] - this.rect[1]) / 2;
//   var cx = (this.rect[2] + this.rect[0]) / 2;
//   var cy = (this.rect[3] + this.rect[1]) / 2;

//   this.rect = [ cx-w, cy-h, cx+w, cy+h ];
// };

ViewWindowManager.prototype.getViewPointFromWindow = function(x, y) {
  var trans = new CoordTransform([0, this.canvasSize.height, this.canvasSize.width, 0], this.rect);
  return trans.forwardPoint([x, y]);
};

// ViewWindowManager.prototype.getNormalizedSize = function(size) {
//   return { width: size.width / this.canvasSize.width, height: size.height / this.canvasSize.height };
// };

/**
 * 
 Get the rectangle of Canvas normalized so that the long side is 1.
 長辺を1となるように正規化されたCanvasの矩形を取得する。
 * TRIANGLE_STRIP
 Make it a point sequence of the form
 の形式の点列とする。
 */
ViewWindowManager.prototype.getNormalizedRectAsTriangleStrip = function() {
  var sx = 0.5;
  var sy = 0.5;
  if ( this.canvasSize.width < this.canvasSize.width ) {
    sy = 0.5 * this.canvasSize.height / this.canvasSize.width;
  } else if ( this.canvasSize.width < this.canvasSize.height ) {
    sx = 0.5 * this.canvasSize.width / this.canvasSize.height;
  }
  return new Float32Array([
    0.5-sx, 0.5-sy,   // left top
    0.5-sx, 0.5+sy,   // left bottom
    0.5+sx, 0.5-sy,   // right top
    0.5+sx, 0.5+sy    // right bottom
  ]);
};

export { ViewWindowManager };