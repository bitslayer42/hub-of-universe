
let ImageCache = function (cache_opts) {
  this.num = 32;             //  default: 32
  this.crossOrigin = null;
  this.textures = {};
  this.loading = {};
  this.ongoingImageLoads = [];
  this.debug = false;

  if (typeof cache_opts !== 'undefined') {
    if ('num' in cache_opts) {
      this.num = cache_opts.num;
    }
    if ('crossOrigin' in cache_opts) {
      this.crossOrigin = cache_opts.crossOrigin;
    }
    if ('debug' in cache_opts) {
      this.debug = cache_opts.debug;
    }
  }
  //
  this.createTexture = null;
};


ImageCache.prototype.loadImage_ = function (url, info) {
  this.loading[url] = true;
  let image = new Image();
  if (this.crossOrigin != null) {
    image.crossOrigin = this.crossOrigin;
  }
  let cache = this;
  let debug = this.debug;
  image.onload = function () {
    cache.ongoingImageLoads.splice(cache.ongoingImageLoads.indexOf(image), 1);
    if (cache.createTexture == null) return;
    let tex = cache.createTexture(image);
    if (tex) {
      cache.textures[url] = [tex, info];
    }
    delete cache.loading.url;

    // For DEBUG: Draw a red border around each loaded image
    if (debug == "boxred") {
      let canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      let ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 5;
      ctx.strokeRect(0, 0, image.width, image.height);
      image.src = canvas.toDataURL();
    }
  };
  this.ongoingImageLoads.push(image);
  console.log(debug)

  // debug: "local" use debug tile
  if (debug == "local") {
    image.src = new URL(
      './debug.png',
      import.meta.url
    );
  } else {
    image.src = url;
  }
};


ImageCache.prototype.loadImageIfAbsent = function (url, info) {
  if (url in this.textures) return false;
  if (url in this.loading) return false;
  this.loadImage_(url, info);
  return true;  //  ロード開始 Start loading
};


ImageCache.prototype.getTexture = function (url) {
  let tex = this.textures[url];
  return tex;
};


ImageCache.prototype.clearOngoingImageLoads = function () {
  for (let i = 0; i < this.ongoingImageLoads.length; i++) {
    this.ongoingImageLoads[i].onload = undefined;
  }
  this.ongoingImageLoads = [];
};

export { ImageCache };