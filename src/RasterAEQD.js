/**
 * Raster Map Projection v0.0.13  2016-11-13
 * Copyright (C) 2016 T.Seno
 * All rights reserved.
 * @license GPL v3 License (http://www.gnu.org/licenses/gpl.html)
 */

import { ShaderProgram } from './ShaderProgram.js';
import { AEQD } from './AEQD.js';

/* ------------------------------------------------------------ */

const RasterAEQD = function() {
  this.shader_ = null;
  //
  this.backColor_ = { r: 0.0, g: 0.0, b: 0.0, a: 1.0 };
  this.graticuleColor_ = { r: 0.88, g: 0.88, b: 0.88, a: 1.0};
  this.alpha_ = 1.0;
  //
  this.projection = new AEQD(0.0, 0.0, 0.01);   // public
  //
  this.numberOfPoints = 64;
  this.zoomScale = 0.01; // 0 > zoomScale >= 40
};

RasterAEQD.prototype.init = function(gl) {
  this.shader_ = new ShaderProgram(gl);
  let ret = this.shader_.init(RasterAEQD.VERTEX_SHADER_STR, RasterAEQD.FRAGMENT_SHADER_STR);
  if ( !ret ) {
    return false;
  }

  let numberOfItems = 4 + 4 + this.numberOfPoints;
  this.shader_.initVBO(numberOfItems);
  this.shader_.setClearColor(this.backColor_);
  return true;
};

RasterAEQD.prototype.setAlpha = function(alpha) {
  this.alpha_ = alpha;
};

RasterAEQD.prototype.setProjCenter = function(lam0, phi0) {
  this.projection = new AEQD(lam0, phi0, this.zoomScale);
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
  for ( let i = 0; i < textureInfos.length; ++i ) {
    let texture = textureInfos[i][0];
    let region = textureInfos[i][1];
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

/*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*/
RasterAEQD.VERTEX_SHADER_STR = /*glsl*/`#version 300 es
  precision highp float;
  in vec2 aPosition;
  in vec2 aTexCoord;
  out vec2 vTexCoord;

  void main() {
    gl_Position = vec4(aPosition.x, aPosition.y, 1.0, 1.0);
    vTexCoord = aTexCoord;
  }
`;

/*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*/
RasterAEQD.FRAGMENT_SHADER_STR = /*glsl*/`#version 300 es

  precision highp float;
  uniform sampler2D uTexture;
  in vec2 vTexCoord;
  uniform lowp int uRenderType;
  uniform vec2 uProjCenter;
  uniform vec2 uViewXY1;
  uniform vec2 uViewXY2;
  uniform vec2 uDataCoord1;
  uniform vec2 uDataCoord2;
  uniform vec2 uFixedTextureSize;    //  アイコンサイズ（画面比） Icon size (screen ratio)
  uniform vec4 uRenderColor;
  uniform float uAlpha;
  uniform float uScale;       //  スケール zoom in zoomScale

  const float pi = 3.14159265;
  const float epsilon = 0.00000001;
  const float blurRatio = 0.015;
  const float xyRadius = pi;
  const float atanSinhPi = 1.48442222; // atan(sinh(pi)) = max phi for web merc
  out vec4 fragColor;

  vec2 web_merc(float lambda, float phi) {      //  Web Mercator
    if (abs(phi) < atanSinhPi) {
      phi = asinh(tan(phi)) * 0.5;
    }
    return vec2(lambda, phi);
  }

  vec2 fisheye(vec2 xy) {      //  fisheye effect
    xy = xy / pi; // circle radius 1.0
    float rho = length(xy);

    float theta = atan(xy.y, xy.x);
    float fisheyeR = (exp(rho * log(1.0 + uScale)) - 1.0) / uScale;
    return vec2(cos(theta) * fisheyeR * pi, sin(theta) * fisheyeR * pi);
  }

  vec2 proj_inverse(vec2 center, vec2 xy) {  // lat/lon from map coords
    xy = fisheye(xy);
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
    vec2 lamphi = web_merc(lam,phi);

    return lamphi;
  }

  float inner_xy(vec2 xy) { // returns zero outside of circle
    return 1.0 - smoothstep( (1.0 - blurRatio) * xyRadius, (1.0 + blurRatio) * xyRadius, length(xy) );
  }

  void main() {
  //  画面上の点 vTexCoord ([-1,-1]-[1,1]) をXY平面上の点にマッピング 
  //. Map the point vTexCoord ([-1, -1] - [1, 1]) on the screen to a point on the XY plane
    vec2 xy = mix(uViewXY1, uViewXY2, vTexCoord);

    if ( uRenderType == 0 ) {    //  Texture (map)

      vec2 lp = proj_inverse(uProjCenter, xy);

      vec2 ts = (lp - uDataCoord1) / (uDataCoord2 - uDataCoord1);
      float inXY = inner_xy(xy);
      vec2 inData = step(vec2(0.0, 0.0), ts) - step(vec2(1.0, 1.0), ts);
      vec4 OutputColor = texture(uTexture, ts) * inData.x * inData.y * inXY;
      OutputColor.a *= clamp(uAlpha, 0.0, 1.0);
      fragColor = OutputColor;

  //   } else if ( uRenderType == 1 ) {  //  PointTexture (icon)

  // //   XY平面上の点を画像上の点[0,0]-[1,1]にマッピングする 
  // //.  Map a point on the XY plane to a point [0, 0] - [1, 1] on the image
  //     vec2 fixedTextureSizeXY = uFixedTextureSize * (uViewXY2 - uViewXY1);
  //     vec2 r1 = vec2(uDataCoord1.x - 0.5 * fixedTextureSizeXY.x, uDataCoord1.x - 0.5 * fixedTextureSizeXY.y);
  //     vec2 ts = (xy - r1) / fixedTextureSizeXY;
  //     vec2 inData = (step(vec2(0.0, 0.0), ts) - step(vec2(1.0, 1.0), ts));
  //     vec4 OutputColor = texture(uTexture, ts) * inData.x * inData.y;
  //     fragColor = OutputColor;

  //   } else if ( uRenderType == 2 ) {  //  Polyline (Graticules)
  
  //       fragColor = uRenderColor;
  
      }
    }

`;

/* -------------------------------------------------------------------------- */
export { RasterAEQD };


