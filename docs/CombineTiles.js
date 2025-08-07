let CombineTiles = function (tiles) { // tiles: [{url: "tile1.png"}...]
    // Create one tile from four
    this.imageData = null; // Will hold the combined image data
    let proms = [];
    tiles.forEach(tile => {
        proms.push(this.addImageProcess(tile.url));
    });
    return Promise.all(proms).then(images => {
        return this.drawTiledImages(images);
    });
};

CombineTiles.prototype.addImageProcess = function (src) {
    return new Promise((resolve, reject) => {
        let img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    })
}

CombineTiles.prototype.drawTiledImages = function (images) {
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    const tileWidth = 256;
    const tileHeight = 256;
    canvas.width = tileWidth * 2; // Two columns
    canvas.height = tileHeight * 2; // Two rows

    ctx.drawImage(images[0], 0, 0, tileWidth, tileHeight); // Top-left
    ctx.drawImage(images[1], tileWidth, 0, tileWidth, tileHeight); // Top-right
    ctx.drawImage(images[2], 0, tileHeight, tileWidth, tileHeight); // Bottom-left
    ctx.drawImage(images[3], tileWidth, tileHeight, tileWidth, tileHeight); // Bottom-right (using image1 again)

    this.imageData = canvas.toDataURL("image/png");
    return this.imageData;
}

export { CombineTiles };