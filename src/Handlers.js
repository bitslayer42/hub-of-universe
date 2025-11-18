export const Handlers = {
  checkAndGetGesturePos(event) {
    let canv_xy = this.canvas.getBoundingClientRect();
    let left = event.center.x - canv_xy.left;
    let top = event.center.y - canv_xy.top;
    if (left < 0 || top < 0 || canv_xy.width < left || canv_xy.height < top) { //offscreen
      return null;
    }
    return [left, top];
  },

  handleLayerChange: async function (event) {
    this.selectedLayer = event.target.value;
    await this.setLayer();
    await this.init(this.rasterProj);
    this.animation();
  },

  handleKeydown(event) {
    switch (event.key) {
      case '=':
      case '+':
        this.viewStatus.zoomScale = this.viewStatus.zoomScale * 1.1;
        break;
      case '-':
      case '_':
        this.viewStatus.zoomScale = this.viewStatus.zoomScale / 1.1;
        break;
      // case "ArrowUp":
      //   console.log("ArrowUp");
      //   this.lat0 += this.getPanRate(this.viewStatus.zoomScale);
      //   break;
      // case "ArrowDown":
      //   this.lat0 -= this.getPanRate(this.viewStatus.zoomScale);
      //   break;
      // case "ArrowLeft":
      //   this.lon0 -= this.getPanRate(this.viewStatus.zoomScale);
      //   break;
      // case "ArrowRight":
      //   this.lon0 += this.getPanRate(this.viewStatus.zoomScale);
      //   break;        
      default:
        break;
    }
    this.viewStatus.zoomScale = Math.min(Math.max(this.zoomMin, this.viewStatus.zoomScale), this.zoomMax);
    cancelAnimationFrame(this.requestId);
    this.requestId = requestAnimationFrame(this.animation);
  },

  handleWheel(event) {
    if (event.deltaY < 0) {
      this.viewStatus.zoomScale = this.viewStatus.zoomScale * 1.1;
    }
    else {
      this.viewStatus.zoomScale = this.viewStatus.zoomScale / 1.1;
    }
    this.viewStatus.zoomScale = Math.min(Math.max(this.zoomMin, this.viewStatus.zoomScale), this.zoomMax);
    cancelAnimationFrame(this.requestId);
    this.requestId = requestAnimationFrame(this.animation);
  },

  handlePinch(event) {
    if (event.scale > 1.0) {
      this.viewStatus.zoomScale = this.viewStatus.zoomScale * 1.05;
    }
    else {
      this.viewStatus.zoomScale = this.viewStatus.zoomScale / 1.05;
    }
    this.viewStatus.zoomScale = Math.min(Math.max(this.zoomMin, this.viewStatus.zoomScale), this.zoomMax);
    cancelAnimationFrame(this.requestId);
    this.requestId = requestAnimationFrame(this.animation);
    this.setQueryParams();
  },

  getPanRate(zoomScale) {
   // how far should we pan given current zoom level?    
    if (zoomScale < 1) {
      return 100;
    } else if (zoomScale < 10) {
      return 300;
    } else if (zoomScale < 100) {
      return 500;
    } else if (zoomScale < 1000) {
      return 1000;
    } else if (zoomScale < 10000) {
      return 10000;
    } else if (zoomScale < 100000) {
      return 50000;
    } else {
      return zoomScale;
    }
  },

  handlePan(event) {
    if (this.viewStatus.drag) {
      let canv_xy = this.checkAndGetGesturePos(event);
      if (null != canv_xy) {
        if (this.viewStatus.dragPrevPos) {
          event.preventDefault();
          let deltaPanRate = this.getPanRate(this.viewStatus.zoomScale);
          let deltaX = (canv_xy[0] - this.viewStatus.dragPrevPos[0]) / deltaPanRate;
          let deltaY = (canv_xy[1] - this.viewStatus.dragPrevPos[1]) / deltaPanRate;
          let curr_lam_phi = this.mapView.getProjCenter();
          let newLam0 = curr_lam_phi.lambda - deltaX;
          let newPhi0 = Math.max(Math.min(curr_lam_phi.phi + deltaY, Math.PI / 2.0), -Math.PI / 2.0); // limit phi to -90 to 90 degrees
          this.mapView.setProjCenter(newLam0, newPhi0);
        }
        this.viewStatus.dragPrevPos = canv_xy;
      }
    }
  },

  handlePanStart(event) {
    this.viewStatus.drag = true;
    let canv_xy = this.checkAndGetGesturePos(event); // get canvas x y from upper left corner
    if (canv_xy) {
      event.preventDefault();
      this.viewStatus.dragPrevPos = canv_xy;
      this.requestId = requestAnimationFrame(this.animation);
    }
  },

  handlePanEnd(event) {
    this.viewStatus.drag = false;
    this.viewStatus.dragPrevPos = null;
    this.mapView.render(true);
  },

  handleDoubleTap(event) {
    let canv_xy = this.checkAndGetGesturePos(event);
    if (canv_xy) {
      event.preventDefault();
      let lam_phi = this.mapView.getLambdaPhiPointFromWindow(canv_xy[0], canv_xy[1]);
      this.viewStatus.lam0 = lam_phi.lambda;
      this.viewStatus.phi0 = lam_phi.phi;
      this.viewStatus.targetLambdaPhi = lam_phi; // set target lambda, phi for interpolater
      this.requestId = requestAnimationFrame(this.animation);
    }
  },

  handleContextLost(event) {
    event.preventDefault();
    cancelAnimationFrame(this.requestId);
    this.mapView.resetImages();
  },

  handleContextRestored(event) {
    this.init(this.rasterProj);
    this.requestId = requestAnimationFrame(this.animation);
  }
};