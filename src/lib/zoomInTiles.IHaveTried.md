## Original idea: use distance from center after projecting
    let tileMidLam = (kidtile.rect[0] + kidtile.rect[2]) / 2;
    let tileMidPhi = (kidtile.rect[1] + kidtile.rect[3]) / 2;
    let xy = this.imageProj.projection.forward(tileMidLam, tileMidPhi);
    let radius = Math.sqrt(xy.x * xy.x + xy.y * xy.y);

    if (radius < Math.PI / (kidtile.xyz.z) && kidtile.xyz.z <= this.currTileLevel) {
      retTiles.push(this.zoomInTiles(kidtile));
    }

## Use smaller of diagonals: problem, opposite pole gets lots of tiles
    let diag1 = Math.sqrt(
      Math.pow(botleft.x - topright.x, 2) +
      Math.pow(botleft.y - topright.y, 2)
    );
    let diag2 = Math.sqrt(
      Math.pow(topleft.x - botright.x, 2) +
      Math.pow(topleft.y - botright.y, 2)
    );
    let diagonal = Math.min(diag1, diag2);

    if ((diagonal > this.tileMaxSize && kidtile.xyz.z <= this.currTileLevel)  ){// || tile.xyz.z == 0) {
      retTiles.push(this.zoomInTiles(kidtile));
    }
    
## Use area of quadrilateral: same problem, opposite pole gets lots of tiles
    let x1 = kidtile.rect[0];
    let y1 = kidtile.rect[1];
    let x2 = kidtile.rect[2];
    let y2 = kidtile.rect[3];
    let botleft1 = this.imageProj.projection.forward(x1, y1);
    let topleft2 = this.imageProj.projection.forward(x1, y2);
    let topright3 = this.imageProj.projection.forward(x2, y2);
    let botright4 = this.imageProj.projection.forward(x2, y1);

    let area = (1/2) * Math.abs(
      (botleft1.x * topleft2.y + topleft2.x * topright3.y + topright3.x * botright4.y + botright4.x * botleft1.y) - 
      (topleft2.x * botleft1.y + topright3.x * topleft2.y + botright4.x * topright3.y + botleft1.x * botright4.y))
    console.log("tile: ", kidtile.xyz, "area: ", area, Math.random()); // <==========

    if ((area > this.tileMaxArea && kidtile.xyz.z <= this.currTileLevel)  ){// || tile.xyz.z == 0) {
      retTiles.push(this.zoomInTiles(kidtile));
    }

