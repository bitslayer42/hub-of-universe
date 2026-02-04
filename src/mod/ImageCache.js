class LRUCache {
  constructor(capacity) {
    this.cache = new Map();
    this.capacity = capacity;
  }

  get(key) {
    if (!this.cache.has(key)) return false;
    let val = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, val); // move to top of list
    return val;
  }

  put(key, value) {
    this.cache.delete(key);
    if (this.cache.size === this.capacity) {
      this.cache.delete(this.cache.keys().next().value);
      this.cache.set(key, value);
    } else {
      this.cache.set(key, value);
    }
    // console.log("cache size", this.cache.size);
  }

}


let ImageCache = function (cache_opts) {
  this.num = 32;             //  default: 32
  this.crossOrigin = null;
  // this.textures = {};
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
  this.textures = new LRUCache(this.num);
};


ImageCache.prototype.loadImage_ = function (url, info) {
  const { promise, resolve, reject } = Promise.withResolvers();
  this.loading[url] = true;
  let image = new Image();
  if (this.crossOrigin != null) {
    image.crossOrigin = this.crossOrigin;
  }
  let cache = this;
  let debug = this.debug;
  let redImage;
  image.onload = async function () {
    cache.ongoingImageLoads.splice(cache.ongoingImageLoads.indexOf(image), 1); //remove from ongoing load list
    if (cache.createTexture == null) return;
    let tex = cache.createTexture(image);
    if (tex) {
      cache.textures.put(url, [tex, info]);
    }
    delete cache.loading.url;

    // For DEBUG: Draw a red border around each loaded image
    if (debug == "red") {
      let canvas = new OffscreenCanvas(256, 256);
      let ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 5;
      ctx.strokeRect(0, 0, image.width, image.height);
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      redImage = new Image();
      redImage.src = URL.createObjectURL(blob);
      // console.log("DEBUG: Image loaded with red border", url);
      resolve(redImage);
    }
  }
  if (debug == "red") {
    promise.then((redImage) => {
      image.src = redImage.src; // Use the red bordered image
    });
  }

  this.ongoingImageLoads.push(image);
  // use local debug tile
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
  if (this.textures.get(url)) return false;
  if (url in this.loading) return false;
  this.loadImage_(url, info);
  return true;  //  ロード開始 Start loading
};


ImageCache.prototype.getTexture = function (url) {
  let tex = this.textures.get(url);
  return tex;
};


ImageCache.prototype.clearOngoingImageLoads = function () {
  for (let i = 0; i < this.ongoingImageLoads.length; i++) {
    this.ongoingImageLoads[i].onload = undefined;
  }
  this.ongoingImageLoads = [];
};

export { ImageCache, LRUCache };