/**
 * Raster Map Projection v0.0.13  2016-11-13
 * Copyright (C) 2016 T.Seno
 * All rights reserved.
 * @license GPL v3 License (http://www.gnu.org/licenses/gpl.html)
 */

import { ShaderProgram } from './ShaderProgram.js';
import { AEQD } from './AEQD.js';

/* ------------------------------------------------------------ */

/**
 * Projection of raster data.
 * @param {object} gl WebGL instance.
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @constructor
 */
const RasterAEQD = function() {
  this.shader_ = null;
  //
  this.backColor_ = { r: 0.0, g: 0.0, b: 0.0, a: 1.0 };
  this.graticuleColor_ = { r: 0.88, g: 0.88, b: 0.88, a: 1.0};
  this.alpha_ = 1.0;
  //
  this.projection = new AEQD(0.0, 0.0);   // public JON: why is this here?
  //
  this.numberOfPoints = 64;
  this.zoomScale = 0.01; // 0 > zoomScale >= 40
};

RasterAEQD.prototype.init = function(gl) {
  this.shader_ = new ShaderProgram(gl);
  var ret = this.shader_.init(RasterAEQD.VERTEX_SHADER_STR, RasterAEQD.FRAGMENT_SHADER_STR);
  if ( !ret ) {
    return false;
  }

  var numberOfItems = 4 + 4 + this.numberOfPoints;
  this.shader_.initVBO(numberOfItems);
  this.shader_.setClearColor(this.backColor_);
  return true;
};

RasterAEQD.prototype.setAlpha = function(alpha) {
  this.alpha_ = alpha;
};

RasterAEQD.prototype.setProjCenter = function(lam0, phi0) {
  this.projection = new AEQD(lam0, phi0);
};

RasterAEQD.prototype.clear = function(canvasSize) {
  this.shader_.clear(canvasSize);
};

RasterAEQD.prototype.prepareRender = function(texCoords, viewRect) {
  this.shader_.prepareRender(viewRect, texCoords, this.projection.lam0, this.projection.phi0, this.alpha_, this.graticuleColor_, this.zoomScale);
};

// c- Renders textures at locations specified in textureInfos
RasterAEQD.prototype.renderTextures = function(textureInfos) {
  this.shader_.setRenderType(ShaderProgram.RENDER_TYPE_TEXTURE);
  for ( var i = 0; i < textureInfos.length; ++i ) {
    var texture = textureInfos[i][0];
    var region = textureInfos[i][1];
    this.shader_.renderTexture(texture, region);
  }
};

// c- Renders an icon at the center of the map 
RasterAEQD.prototype.renderOverlays = function(centerIcon, iconSize) {
  this.shader_.setRenderType(ShaderProgram.RENDER_TYPE_POINT_TEXTURE);
  this.shader_.renderIconTexture(centerIcon, iconSize, { x:0.0, y:0.0});
};

RasterAEQD.prototype.setScale = function(zoomScale) {
  this.zoomScale = zoomScale;
  this.projection.setScale(zoomScale);
}

RasterAEQD.VERTEX_SHADER_STR = `
  precision highp float;
  attribute vec2 aPosition;
  attribute vec2 aTexCoord;
  varying vec2 vTexCoord;

  void main()
  {
    gl_Position = vec4(aPosition.x, aPosition.y, 1.0, 1.0);
    vTexCoord = aTexCoord;
  }
`;


RasterAEQD.FRAGMENT_SHADER_STR = `

  precision highp float;
  uniform sampler2D uTexture;
  varying vec2 vTexCoord;
  uniform lowp int uRenderType;
  uniform vec2 uProjCenter;
  uniform vec2 uViewXY1;
  uniform vec2 uViewXY2;
  uniform vec2 uDataCoord1;
  uniform vec2 uDataCoord2;
  uniform vec2 uFixedTextureSize;    //  アイコンサイズ（画面比） Icon size (screen ratio)
  uniform vec4 uRenderColor;
  uniform float uAlpha;
  uniform float uScale;       //  スケール zoomScale

  const float pi = 3.14159265;
  const float epsilon = 0.00000001;
  const float blurRatio = 0.015;
  const float xyRadius = pi;
  const float e = 2.718281;

  vec2 fisheye(vec2 xy) {
    xy = xy / pi; // circle radius 1.0
    float rho = length(xy);

    float theta = atan(xy.y, xy.x);
    float fisheyeR = (exp(rho * log(1.0 + uScale)) - 1.0) / uScale;
    return vec2(cos(theta) * fisheyeR * pi, sin(theta) * fisheyeR * pi);
  }

  // lat/lon from map coords
  vec2 proj_inverse(vec2 center, vec2 xy)
  {
    xy = fisheye(xy);      //  fisheye effect
    float sinPhi0 = sin(center.y);
    float cosPhi0 = cos(center.y);

    float rho = length(xy);

    if ( rho < epsilon ) {
      return center;
    }
    if ( rho - epsilon > xyRadius ) {
      rho = xyRadius;
    }

    float c_rh = rho;

    float cos_c = cos(c_rh);
    float sin_c = sin(c_rh);

    float phi = asin( clamp( cos_c * sinPhi0 + xy.y * sin_c * cosPhi0 / rho, -1.0, 1.0 ) );
    float lam = mod( center.x + atan( xy.x * sin_c, rho * cosPhi0 * cos_c - xy.y * sinPhi0 * sin_c ) + pi, 2.0 * pi ) - pi;

    return vec2(lam, phi);
  }

  float inner_xy(vec2 xy)
  {
    return 1.0 - smoothstep( (1.0 - blurRatio) * xyRadius, (1.0 + blurRatio) * xyRadius, length(xy) );
  }

  void main()
  {
  //  画面上の点 vTexCoord ([-1,-1]-[1,1]) をXY平面上の点にマッピング 
  //. Map the point vTexCoord ([-1, -1] - [1, 1]) on the screen to a point on the XY plane
    vec2 xy = mix(uViewXY1, uViewXY2, vTexCoord);

    if ( uRenderType == 0 ) {    //  Texture (map)

      vec2 lp = proj_inverse(uProjCenter, xy);

      vec2 ts = (lp - uDataCoord1) / (uDataCoord2 - uDataCoord1);
      float inXY = inner_xy(xy);
      vec2 inData = step(vec2(0.0, 0.0), ts) - step(vec2(1.0, 1.0), ts);
      vec4 OutputColor = texture2D(uTexture, ts) * inData.x * inData.y * inXY;
      OutputColor.a *= clamp(uAlpha, 0.0, 1.0);
      gl_FragColor = OutputColor;

    } else if ( uRenderType == 1 ) {  //  PointTexture (icon)

  //   XY平面上の点を画像上の点[0,0]-[1,1]にマッピングする 
  //.  Map a point on the XY plane to a point [0, 0] - [1, 1] on the image
      vec2 fixedTextureSizeXY = uFixedTextureSize * (uViewXY2 - uViewXY1);
      vec2 r1 = vec2(uDataCoord1.x - 0.5 * fixedTextureSizeXY.x, uDataCoord1.x - 0.5 * fixedTextureSizeXY.y);
      vec2 ts = (xy - r1) / fixedTextureSizeXY;
      vec2 inData = (step(vec2(0.0, 0.0), ts) - step(vec2(1.0, 1.0), ts));
      vec4 OutputColor = texture2D(uTexture, ts) * inData.x * inData.y;
      gl_FragColor = OutputColor;

    } else if ( uRenderType == 2 ) {  //  Polyline (Graticules)
  
        gl_FragColor = uRenderColor;
  
      }
    }

`;

/* -------------------------------------------------------------------------- */
export { RasterAEQD };


