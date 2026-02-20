import { TileManager } from "./mod/TileManager.js";
import { ImageCache, LRUCache } from "./mod/ImageCache.js";

let MapView = function (gl, imgProj, canvasSize, tile_opts, cache_opts) {
  this.gl = gl;
  this.rasterProj = imgProj;

  this.canvasSize = canvasSize;
  //
  this.tileManager = new TileManager(tile_opts);
  this.prevTileInfos_ = null;
  this.prevWindow_ = null;
  //
  this.imageCache = new ImageCache(cache_opts);
  //
  let self = this;
  this.imageCache.createTexture = function (img) {
    return self.createTexture(img);
  };
  //
  this.tileInfos = null;
  this.getURL = null;
  this.calculateLevel = null;
  this.currTileLevel = 0;
  // this.prevTileLevel = null;
  this.lam0 = 0;
  this.phi0 = 0;
  this.lat0 = 0;
  this.lon0 = 0;

  this.cityList = []; // list of cities in current view
  this.cityDiv = document.getElementById('citydiv');
  this.cityCache = new LRUCache(1000);
  this.cityFontColor = "black";
};

MapView.prototype.clearTileInfoCache_ = function () {
  this.prevWindow_ = null;
  this.prevTileInfos_ = null;
};

MapView.prototype.setProjCenter = function (lam, phi) {
  this.lam0 = lam;
  this.phi0 = phi;
  this.clearTileInfoCache_();
  this.rasterProj.setProjCenter(lam, phi);
};

MapView.prototype.getProjCenter = function () {
  return this.rasterProj.projection.getProjCenter();
};

MapView.prototype.resizeCanvas = function (canvas) {
  this.canvasSize.width = canvas.width;
  this.canvasSize.height = canvas.height;
}

MapView.prototype.setTileLevel = function (currTileLevel) {
  this.currTileLevel = currTileLevel;
};

MapView.prototype.setCityFontColor = function (color) {
  this.cityFontColor = color;
};

MapView.prototype.getViewPointFromWindow = function (canvX, canvY) {
  let scaleX_ = (Math.PI * 2) / this.canvasSize.width; // convert pixel to pi
  let scaleY_ = (Math.PI * 2) / -this.canvasSize.height;
  let x = -Math.PI + canvX * scaleX_;
  let y = -Math.PI + (canvY - this.canvasSize.height) * scaleY_;
  return [x, y]; //radians
};

MapView.prototype.getLambdaPhiPointFromWindow = function (x, y) { // canvas x y pixel coordinates
  let viewPos = this.getViewPointFromWindow(x, y);
  let lam_phi = this.rasterProj.projection.inverse(viewPos[0], viewPos[1]);
  return lam_phi; // projected lambda, phi
};


MapView.prototype.resetImages = function () {
  this.imageCache.clearOngoingImageLoads();
};

// Called from init
MapView.prototype.requestImagesIfNecessary = function () {
  if (this.getURL == null) return -1;
  this.getTileInfos_();
  let count = this.requestImages_(this.tileInfos);
  return count;
};

// Called from animation
MapView.prototype.render = function (getNewTiles) {
  if (this.getURL == null) return;
  if (getNewTiles) {
    this.getTileInfos_();
    this.requestImages_(this.tileInfos);
  }
  this.render_(this.tileInfos);
}

//  TODO この実装の詳細は別の場所にあるべきか Should this implementation's detail be in a different location?
MapView.prototype.createTexture = function (img) {
  let tex = this.gl.createTexture();
  this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
  this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

  this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);

  this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  return tex;
};

MapView.prototype.showCities_ = async function () {
  this.lat0 = this.phi0 * 180 / Math.PI; // convert to degrees
  this.lon0 = this.lam0 * 180 / Math.PI; // convert to degrees
  this.cityList = this.cityCache.get([this.lat0, this.lon0, this.currTileLevel]);
  if (!this.cityList) {
    this.requestCities_([this.lat0, this.lon0, this.currTileLevel]);
    return;
  }
  this.placeCities_(this.cityList, this.rasterProj.projection);
}

MapView.prototype.requestCities_ = function (centerQuadkey) {
  let api_key = import.meta.env.VITE_HUB_API_KEY;

  const params = new URLSearchParams();
  params.append("apikey", api_key);
  params.append("lat", this.lat0);
  params.append("lon", this.lon0);
  params.append("level", this.currTileLevel);

  fetch(`${import.meta.env.VITE_CITIES_URL}?${params}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  })
    .then(response => response.json())
    .then(data => {
      this.cityList = data || [];
      this.cityCache.put([this.lat0, this.lon0, this.currTileLevel], this.cityList);
      this.placeCities_(this.cityList);
    })
    .catch(error => {
      console.error("Error fetching cities:", error);
      this.cityList = [];
    });
};

MapView.prototype.placeCities_ = function (cityList) {
  this.cityDiv.innerHTML = '';
  const rect = this.cityDiv.getBoundingClientRect();
  this.cityList = cityList || [];
  for (let city of this.cityList) {
    let { x, y } = this.rasterProj.projection.forward(
      city.longitude * Math.PI / 180,
      city.latitude * Math.PI / 180
    );
    x = ( x / (2 * Math.PI) + 0.5) * rect.width;
    y = (-y / (2 * Math.PI) + 0.5) * rect.height;

    const worddiv = document.createElement('div');
    worddiv.classList.add('word'); // for css
    worddiv.classList.add(this.cityFontColor); // for css
    worddiv.style.left = `${x}px`;
    worddiv.style.top = `${y}px`;

    worddiv.textContent = city.name;
    this.cityDiv.appendChild(worddiv);
  }
    // After elements are in the DOM test for overlap and hide if necessary
    const children = Array.from(this.cityDiv.children);
    const placedRects = [];
    const padding = 0; // minimum space between words

    children.forEach(child => {
      const cRect = child.getBoundingClientRect();
      const x = parseInt(child.style.left);
      const y = parseInt(child.style.top);
      const w = parseInt(cRect.width);
      const h = parseInt(cRect.height);

      const candidate = { left: x - w / 2 - padding, top: y - h / 2 - padding, right: x + w / 2 + padding, bottom: y + h / 2 + padding };

      const collision = placedRects.some(r => !(candidate.right < r.left || candidate.left > r.right || candidate.bottom < r.top || candidate.top > r.bottom));
      if (collision) {
        child.style.display = 'none';
      } else {
        placedRects.push({ name: child.textContent, left: candidate.left, top: candidate.top, right: candidate.right, bottom: candidate.bottom });
      }
      // child.style.left = `${left}px`;
      // child.style.top = `${top}px`;
    });
}

MapView.prototype.getTileInfos_ = function () {
  let tileArray = this.tileManager.getTileInfos(this.lam0, this.phi0, this.currTileLevel, this.getURL);
  this.tileInfos = tileArray;
};


MapView.prototype.requestImages_ = function () {
  let count = 0;
  for (let i = 0; i < this.tileInfos.length; ++i) {
    if (this.imageCache.loadImageIfAbsent(this.tileInfos[i].url, this.tileInfos[i].rect)) {
      ++count;
    }
  }
  return count;
};


MapView.prototype.render_ = function () {
  this.rasterProj.clear(this.canvasSize);
  let targetTextures = [];
  for (let i = 0; i < this.tileInfos.length; ++i) {
    let info = this.tileInfos[i];
    let tex = this.imageCache.getTexture(info.url);
    if (tex) {
      targetTextures.push(tex);
    }
  }

  let texCoords = new Float32Array([
    0.0, 0.0,   // left top
    0.0, 1.0,   // left bottom
    1.0, 0.0,   // right top
    1.0, 1.0    // right bottom
  ]);
  this.rasterProj.prepareRender(texCoords, [-Math.PI, -Math.PI, Math.PI, Math.PI]);
  if (0 < targetTextures.length) {
    this.rasterProj.renderTextures(targetTextures);
  }
  this.showCities_();
};


/* -------------------------------------------------------------------------- */
export { MapView };
