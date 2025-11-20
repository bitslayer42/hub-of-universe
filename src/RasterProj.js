import { ShaderProgram } from './ShaderProgram.js';
import { Projection } from './Projection.js';

/* ------------------------------------------------------------ */

const RasterProj = function () {
  this.shader_ = null;
  //
  this.backColor_ = { r: 0.0, g: 0.0, b: 0.0, a: 1.0 };
  this.graticuleColor_ = { r: 0.88, g: 0.88, b: 0.88, a: 1.0 };
  this.alpha_ = 1.0;
  //
  this.projection = new Projection(0.0, 0.0, 0.01);   // public
  //
  this.numberOfPoints = 64;
  this.zoomScale = 0.01; // 0 > zoomScale >= 40
  this.ringRadius = null; // radius of flat center disk in radians
  this.flatRatio = null;    // ratio of projectedFlatRadius / flatRadius

};

RasterProj.prototype.init = function (gl) {
  this.shader_ = new ShaderProgram(gl);
  let ret = this.shader_.init(RasterProj.VERTEX_SHADER_STR, RasterProj.FRAGMENT_SHADER_STR);
  if (!ret) {
    return false;
  }

  let numberOfItems = 4 + 4 + this.numberOfPoints;
  this.shader_.initVBO(numberOfItems);
  this.shader_.setClearColor(this.backColor_);
  return true;
};

RasterProj.prototype.setAlpha = function (alpha) {
  this.alpha_ = alpha;
};

RasterProj.prototype.setProjCenter = function (lam0, phi0) {
  this.projection = new Projection(lam0, phi0, this.zoomScale);
};

RasterProj.prototype.clear = function (canvasSize) {
  this.shader_.clear(canvasSize);
};

RasterProj.prototype.prepareRender = function (texCoords, viewRect) {
  this.shader_.prepareRender(
    viewRect, 
    texCoords, 
    this.projection.lam0,
    this.projection.phi0, 
    this.alpha_, 
    this.graticuleColor_, 
    this.zoomScale,
    this.ringRadius,
    this.flatRatio
  );
};

// c- Renders textures at locations specified in textureInfos
RasterProj.prototype.renderTextures = function (textureInfos) {
  for (let i = 0; i < textureInfos.length; ++i) {
    this.shader_.setRenderType(ShaderProgram.RENDER_TYPE_TEXTURE);

    let texture = textureInfos[i][0];
    let region = textureInfos[i][1];
    this.shader_.renderTexture(texture, region);
  }
};

// c- Renders an icon at the center of the map 
// RasterProj.prototype.renderOverlays = function(centerIcon, iconSize) {
//   this.shader_.setRenderType(ShaderProgram.RENDER_TYPE_POINT_TEXTURE);
//   this.shader_.renderIconTexture(centerIcon, iconSize, { x:0.0, y:0.0});
// };

RasterProj.prototype.setScale = function (zoomScale) {
  this.zoomScale = zoomScale;
  this.projection.setScale(zoomScale);
}

// The center of the map is unprojected and is just displayed flat
RasterProj.prototype.setFlatRatio = function (ringRadius) {
  this.ringRadius = ringRadius;
  let lambda = this.projection.lam0;
  let phi = this.projection.phi0 + ringRadius; // a lambda, phi on the north edge of the flat disk
  let {x,y} = this.projection.forward(lambda, phi); // projected x,y of that point
  this.flatRatio = y / ringRadius; // ratio of projectedFlatRadius / flatRadius
  // console.log("setFlatRatio: ", { 
  //   lambda, phi, 
  //   lam0: this.projection.lam0, phi0: this.projection.phi0, 
  //   x, y, 
  //   zoom: this.zoomScale, 
  //   ratio: y / ringRadius });
}

/*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*//*glsl*/
RasterProj.VERTEX_SHADER_STR = /*.glsl*/`#version 300 es
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
RasterProj.FRAGMENT_SHADER_STR = /*glsl*/`#version 300 es

  precision highp float;
  uniform sampler2D uTexture;
  in vec2 vTexCoord;
  uniform lowp int uRenderType;
  uniform vec2 uProjCenter; // lam0, phi0
  uniform vec2 uViewXY1;    // -PI,-PI
  uniform vec2 uViewXY2;    // +PI,+PI
  uniform vec2 uDataCoord1; // lam1, phi1: top left corner of current texture: radians
  uniform vec2 uDataCoord2; // lam2, phi2: bot right corner of current texture: radians
  uniform vec2 uFixedTextureSize;    //  アイコンサイズ（画面比） Icon size (screen ratio)
  uniform vec4 uRenderColor;
  uniform float uAlpha;
  uniform float uScale;       //  スケール zoom in zoomScale
  uniform float uRingRadius;  // radius of flat center disk in radians
  uniform float uFlatRatio;   // ratio of projectedFlatRadius / flatRadius  

  // const float flatradius = 0.0001;

  // float flatratio = 0.0002; // ratio of

  const float pi = 3.14159265;
  const float blurRatio = 0.015; // planet haze
  const float xyRadius = pi;
  const float atanSinhPi = 1.48442222; // atan(sinh(pi)) = max phi for web merc
  out vec4 fragColor;

  vec2 inner_flat(vec2 center, vec2 xy) {
    // Inside the ring - draw flat
    // Convert screen coordinates to web mercator coordinates
    // Scale by uFlatRatio to match the projection scale at the ring boundary
    float xflat = (xy.x / uFlatRatio) + center.x;
    float yflat = asinh(tan((xy.y / uFlatRatio) + center.y)) * 0.5;
    return vec2(xflat, yflat);
  }

  vec2 outer_projected(vec2 center, vec2 xy_fe, float rho) {
        // Inverse of azimuthal equidistant projection
    float sinPhi0 = sin(center.y);
    float cosPhi0 = cos(center.y);
    float phi = asin( clamp( cos(rho) * sinPhi0 + xy_fe.y * sin(rho) * cosPhi0 / rho, -1.0, 1.0 ) );
    float lambda = mod( center.x + atan( xy_fe.x * sin(rho), rho * cosPhi0 * cos(rho) - xy_fe.y * sinPhi0 * sin(rho) ) + pi, 2.0 * pi ) - pi;

    // Adj phi for web mercator
    if (abs(phi) < atanSinhPi) { // not for poles
      phi = asinh(tan(phi)) * 0.5;
    }
    return vec2(lambda, phi);
  }

  vec2 proj_inverse(vec2 center, vec2 xy) {
    float epsilon = 0.0001; // uRingRadius / 2.0; //0.00001
    // Fisheye effect
    vec2 xy_1 = xy / pi; // circle radius 1.0
    float rho_fe = length(xy_1);
    float theta = atan(xy.y, xy.x);
    float fisheyeR = (exp(rho_fe * log(1.0 + uScale)) - 1.0) / uScale;    
    vec2 xy_fe = vec2(cos(theta) * fisheyeR * pi, sin(theta) * fisheyeR * pi);
    
    float rho = length(xy_fe);

    if (rho > uRingRadius + epsilon || abs(center.y) >= atanSinhPi) { // outside ring: projected
      return outer_projected(center, xy_fe, rho);
    } else if (rho <= uRingRadius) {                                  // inside ring: flat
      return inner_flat(center, xy);
    } else {                                                // Smooth transition at the boundary
      // return vec2( -0.785017, 1.15794); // debug with white ring
      float t = (rho - uRingRadius) / epsilon;
      vec2 flatCoords = inner_flat(center, xy);
      vec2 projectedCoords = outer_projected(center, xy_fe, rho);
      return mix( // Interpolate
        flatCoords,
        projectedCoords,
        smoothstep(0.0, 1.0, t)
      );
    }
  }

  float inner_xy(vec2 xy) { // returns zero outside of circle
    return 1.0 - smoothstep( (1.0 - blurRatio) * xyRadius, (1.0 + blurRatio) * xyRadius, length(xy) );
  }

  void main() {
  // Map the texture point vTexCoord ([0,0] - [1,1]) to a point on the XY plane
    vec2 xy = mix(uViewXY1, uViewXY2, vTexCoord); // lerp from -PI,-PI to +PI,+PI, inverse so rationalizes it
    // if ( uRenderType == 0 ) {    //  Texture (map) RENDER_TYPE_TEXTURE

      vec2 lp = proj_inverse(uProjCenter, xy);

      vec2 ts = (lp - uDataCoord1) / (uDataCoord2 - uDataCoord1);
      float inXY = inner_xy(xy);
      vec2 inData = step(vec2(0.0, 0.0), ts) - step(vec2(1.0, 1.0), ts); // cut off outside of texture
      vec4 OutputColor = texture(uTexture, ts) * inData.x * inData.y * inXY;
      OutputColor.a *= clamp(uAlpha, 0.0, 1.0);
      fragColor = OutputColor;
    // }
  //  else if ( uRenderType == 1 ) {  //  PointTexture (icon)

  // //   XY平面上の点を画像上の点[0,0]-[1,1]にマッピングする 
  // //.  Map a point on the XY plane to a point [0, 0] - [1, 1] on the image
  //     vec2 fixedTextureSizeXY = uFixedTextureSize * (uViewXY2 - uViewXY1);
  //     vec2 r1 = vec2(uDataCoord1.x - 0.5 * fixedTextureSizeXY.x, uDataCoord1.x - 0.5 * fixedTextureSizeXY.y);
  //     vec2 ts = (xy - r1) / fixedTextureSizeXY;
  //     vec2 inData = (step(vec2(0.0, 0.0), ts) - step(vec2(1.0, 1.0), ts));
  //     vec4 OutputColor = texture(uTexture, ts) * inData.x * inData.y;
  //     fragColor = OutputColor;

  // } 
  // else if ( uRenderType == 2 ) {  //  Polyline (Graticules)
  
  //       fragColor = uRenderColor;
  
      // }
    }

`;

/* -------------------------------------------------------------------------- */
export { RasterProj };


