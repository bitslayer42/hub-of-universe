let ShaderProgram = function(gl) {
  this.gl_ = gl;
  this.vbo_ = null;
  this.program_ = null;
  //
  this.locTexture_ = null;
  this.locAlpha_ = null;
  this.locProjCenter_ = null;
  this.locViewXY1_ = null;
  this.locViewXY2_ = null;
  this.locDataCoord1_ = null;
  this.locDataCoord2_ = null;
  this.locFixedTextureSize_ = null;
  this.locRenderColor_ = null;
  this.locRenderType_ = null;
  this.locUnifScale_ = null;
  this.locTranslateY_ = null;   //  TODO tmerc独自の処理の調整. Adjust your own processing
};

ShaderProgram.DIMENSION = 2;

ShaderProgram.UNIT_RECT_TRIANGLE_STRIP = new Float32Array([
    -1.0, -1.0,
    -1.0, +1.0,
    +1.0, -1.0,
    +1.0, +1.0
  ]);


ShaderProgram.RENDER_TYPE_TEXTURE = 0;        // dim=2, dataType=GeoGraphic
ShaderProgram.RENDER_TYPE_POINT_TEXTURE = 1;  // dim=0, dataType=XYCoordinates
ShaderProgram.RENDER_TYPE_POLYLINE = 2;       // dim=1, dataType=??


ShaderProgram.prototype.init = function(vertShaderStr, fragShaderStr) {
  let vertexShader = this.loadShader_(this.gl_.VERTEX_SHADER, vertShaderStr);
  let fragmentShader = this.loadShader_(this.gl_.FRAGMENT_SHADER, fragShaderStr);

  let prog = this.gl_.createProgram();
  this.gl_.attachShader(prog, vertexShader);
  this.gl_.attachShader(prog, fragmentShader);

  this.gl_.bindAttribLocation(prog, 0, "aPosition");  //  TODO ??
  this.gl_.bindAttribLocation(prog, 1, "aTexCoord");
  this.gl_.linkProgram(prog);

  let linked = this.gl_.getProgramParameter(prog, this.gl_.LINK_STATUS);
  if (!linked && !this.gl_.isContextLost()) {
    let info = this.gl_.getProgramInfoLog(prog);
    alert("Error linking program:\n" + info);
    this.gl_.deleteProgram(prog);
    return false;
  }
  this.program_ = prog;

  this.locTexture_ = this.gl_.getUniformLocation(this.program_, "uTexture");
  this.locAlpha_ = this.gl_.getUniformLocation(this.program_, "uAlpha");
  this.locProjCenter_ = this.gl_.getUniformLocation(this.program_, "uProjCenter");
  this.locViewXY1_ = this.gl_.getUniformLocation(this.program_, "uViewXY1");
  this.locViewXY2_ = this.gl_.getUniformLocation(this.program_, "uViewXY2");
  this.locDataCoord1_ = this.gl_.getUniformLocation(this.program_, "uDataCoord1");
  this.locDataCoord2_ = this.gl_.getUniformLocation(this.program_, "uDataCoord2");
  this.locFixedTextureSize_ = this.gl_.getUniformLocation(this.program_, "uFixedTextureSize");
  this.locRenderColor_ = this.gl_.getUniformLocation(this.program_, "uRenderColor");
  this.locRenderType_ = this.gl_.getUniformLocation(this.program_, "uRenderType");
  this.locUnifScale_ = this.gl_.getUniformLocation(this.program_, "uScale");
  //this.gl_.blendFunc(this.gl_.SRC_ALPHA, this.gl_.ONE);
  this.gl_.blendFunc(this.gl_.SRC_ALPHA, this.gl_.ONE_MINUS_SRC_ALPHA);

  return true;
};

ShaderProgram.prototype.initAdditionalParams = function() {
  this.locTranslateY_ = this.gl_.getUniformLocation(this.program_, "uTranslateY");  //  NOTICE tmerc独自. Original
};

ShaderProgram.prototype.loadShader_ = function(type, shaderSrc) {
  let shader = this.gl_.createShader(type);
  this.gl_.shaderSource(shader, shaderSrc);
  this.gl_.compileShader(shader);
  if (!this.gl_.getShaderParameter(shader, this.gl_.COMPILE_STATUS) && !this.gl_.isContextLost()) {
    let info = this.gl_.getShaderInfoLog(shader);
    alert("Error compiling shader:\n" + info);
    this.gl_.deleteShader(shader);
    return null;
  }
  return shader;
};

ShaderProgram.prototype.setClearColor = function(color) {
  this.gl_.clearColor(color.r, color.g, color.b, color.a);
  this.gl_.enable(this.gl_.BLEND);
};

ShaderProgram.prototype.clear = function(canvasSize) {
  this.gl_.clear(this.gl_.COLOR_BUFFER_BIT);
  this.gl_.viewport(0, 0, canvasSize.width, canvasSize.height);
};

ShaderProgram.prototype.initVBO = function(numberOfItems) {
  this.vbo_ = this.gl_.createBuffer();
  this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, this.vbo_);
  this.gl_.bufferData(this.gl_.ARRAY_BUFFER, numberOfItems * 4 * 2, this.gl_.DYNAMIC_DRAW);
};

ShaderProgram.prototype.setRenderType = function(type) {
  this.gl_.uniform1i(this.locRenderType_, type);
};

ShaderProgram.prototype.prepareRender = function(viewRect, texCoords, lam0, phi0, alpha, lineColor, zoomScale) {
  this.gl_.useProgram(this.program_);

  this.gl_.uniform1f(this.locAlpha_, alpha);
  this.gl_.uniform4f(this.locRenderColor_, lineColor.r, lineColor.g, lineColor.b, lineColor.a);
  this.gl_.uniform2f(this.locProjCenter_, lam0, phi0);
  this.gl_.uniform2f(this.locViewXY1_, viewRect[0], viewRect[1]);
  this.gl_.uniform2f(this.locViewXY2_, viewRect[2], viewRect[3]);
  this.gl_.uniform1i(this.locTexture_, 0);
  this.gl_.uniform1f(this.locUnifScale_, zoomScale);

  if ( this.locTranslateY_ != null ) {
    this.gl_.uniform1f(this.locTranslateY_, 0.0);   //  NOTICE uTranslateY, tmerc独自 Original
  }

  let offset = ShaderProgram.UNIT_RECT_TRIANGLE_STRIP.byteLength;
  this.gl_.bufferSubData(this.gl_.ARRAY_BUFFER, 0, ShaderProgram.UNIT_RECT_TRIANGLE_STRIP);
  this.gl_.bufferSubData(this.gl_.ARRAY_BUFFER, offset, texCoords);

  this.gl_.enableVertexAttribArray(0);
  this.gl_.vertexAttribPointer(0, ShaderProgram.DIMENSION, this.gl_.FLOAT, this.gl_.FALSE, 0, 0);
  this.gl_.enableVertexAttribArray(1);
  this.gl_.vertexAttribPointer(1, ShaderProgram.DIMENSION, this.gl_.FLOAT, this.gl_.FALSE, 0, offset);
};


//  TODO コメントとしてこれは残しておく. I will leave this as a comment
// ShaderProgram.prototype.prepareRenderPolyline = function() {
//   this.gl_.enableVertexAttribArray(0);
//   this.gl_.vertexAttribPointer(0, ShaderProgram.DIMENSION, this.gl_.FLOAT, this.gl_.FALSE, 0, 0);
//   this.gl_.enableVertexAttribArray(1);
//   this.gl_.vertexAttribPointer(1, ShaderProgram.DIMENSION, this.gl_.FLOAT, this.gl_.FALSE, 0, 0);
// };

//  TODO 要検討. To study
ShaderProgram.prototype.renderIconTexture = function(texture, iconSize, xyPos) {
  this.gl_.bindTexture(this.gl_.TEXTURE_2D, texture);
  this.gl_.uniform2f(this.locDataCoord1_, xyPos.x, xyPos.y);
  this.gl_.uniform2f(this.locDataCoord2_, 0, 0);
  this.gl_.uniform2f(this.locFixedTextureSize_, iconSize.width, iconSize.height);
  this.gl_.drawArrays(this.gl_.TRIANGLE_STRIP, 0, 4);
};

ShaderProgram.prototype.renderTexture = function(texture, region) {
  let lam1 = region[0];
  let phi1 = region[1];
  let lam2 = region[2];
  let phi2 = region[3];

  this.gl_.bindTexture(this.gl_.TEXTURE_2D, texture);
  this.gl_.uniform2f(this.locDataCoord1_, lam1, phi1);
  this.gl_.uniform2f(this.locDataCoord2_, lam2, phi2);
  this.gl_.drawArrays(this.gl_.TRIANGLE_STRIP, 0, 4);
};

ShaderProgram.prototype.renderPolyline = function(points) {
  this.gl_.bufferSubData(this.gl_.ARRAY_BUFFER, 0, new Float32Array(points));
  this.gl_.drawArrays(this.gl_.LINE_STRIP, 0, points.length / 2);
};

ShaderProgram.prototype.setPolylineData = function(points) {
  this.gl_.bufferSubData(this.gl_.ARRAY_BUFFER, 0, new Float32Array(points));
};

ShaderProgram.prototype.renderPolylineData = function(numPoints, ty) {
  if (typeof ty !== 'undefined') {
    this.gl_.uniform1f(this.locTranslateY_, ty);    //  NOTICE uTranslateY, tmerc独自. Original
  }
  this.gl_.drawArrays(this.gl_.LINE_STRIP, 0, numPoints / 2);
};

/* ------------------------------------------------------------ */
export { ShaderProgram };