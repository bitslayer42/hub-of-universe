export const Handlers = {
  checkAndGetGesturePos(clientX, clientY) {
    let canv_xy = this.canvas.getBoundingClientRect();
    let left = clientX - canv_xy.left;
    let top = clientY - canv_xy.top;
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

  getTouchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  },

  handlePointerDown(event) {
    let canv_xy = this.checkAndGetGesturePos(event.clientX, event.clientY);
    if (canv_xy) {
      this.viewStatus.drag = true;
      this.viewStatus.dragPrevPos = canv_xy;
      this.requestId = requestAnimationFrame(this.animation);
    }
  },

  handlePointerMove(event) {
    if (this.viewStatus.drag) {
      let canv_xy = this.checkAndGetGesturePos(event.clientX, event.clientY);
      if (null != canv_xy) {
        if (this.viewStatus.dragPrevPos) {
          event.preventDefault();
          let deltaPanRate = this.getPanRate(this.viewStatus.zoomScale);
          let deltaX = (canv_xy[0] - this.viewStatus.dragPrevPos[0]) / deltaPanRate;
          let deltaY = (canv_xy[1] - this.viewStatus.dragPrevPos[1]) / deltaPanRate;
          let curr_lam_phi = this.mapView.getProjCenter();
          let newLam0 = curr_lam_phi.lambda - deltaX;
          let newPhi0 = Math.max(Math.min(curr_lam_phi.phi + deltaY, Math.PI / 2.0), -Math.PI / 2.0);
          this.mapView.setProjCenter(newLam0, newPhi0);
        }
        this.viewStatus.dragPrevPos = canv_xy;
      }
    }
  },

  handlePointerUp(event) {
    this.viewStatus.drag = false;
    this.viewStatus.dragPrevPos = null;
    this.mapView.render(true);
  },

  handleTouchStart(event) {
    if (event.touches.length === 2) {
      // Pinch gesture
      this.viewStatus.pinching = true;
      this.viewStatus.pinchPrevDistance = this.getTouchDistance(event.touches[0], event.touches[1]);
    } else if (event.touches.length === 1) {
      // Single touch drag
      let touch = event.touches[0];
      let canv_xy = this.checkAndGetGesturePos(touch.clientX, touch.clientY);
      if (canv_xy) {
        this.viewStatus.drag = true;
        this.viewStatus.dragPrevPos = canv_xy;
        this.requestId = requestAnimationFrame(this.animation);
      }
    }
  },

  handleTouchMove(event) {
    if (event.touches.length === 2 && this.viewStatus.pinching) {
      // Pinch zoom
      event.preventDefault();
      let currentDistance = this.getTouchDistance(event.touches[0], event.touches[1]);
      let scale = currentDistance / this.viewStatus.pinchPrevDistance;
      
      if (scale > 1.0) {
        this.viewStatus.zoomScale = this.viewStatus.zoomScale * 1.05;
      } else {
        this.viewStatus.zoomScale = this.viewStatus.zoomScale / 1.05;
      }
      this.viewStatus.zoomScale = Math.min(Math.max(this.zoomMin, this.viewStatus.zoomScale), this.zoomMax);
      this.viewStatus.pinchPrevDistance = currentDistance;
      cancelAnimationFrame(this.requestId);
      this.requestId = requestAnimationFrame(this.animation);
    } else if (event.touches.length === 1 && this.viewStatus.drag) {
      // Single touch drag
      let touch = event.touches[0];
      let canv_xy = this.checkAndGetGesturePos(touch.clientX, touch.clientY);
      if (null != canv_xy) {
        if (this.viewStatus.dragPrevPos) {
          event.preventDefault();
          let deltaPanRate = this.getPanRate(this.viewStatus.zoomScale);
          let deltaX = (canv_xy[0] - this.viewStatus.dragPrevPos[0]) / deltaPanRate;
          let deltaY = (canv_xy[1] - this.viewStatus.dragPrevPos[1]) / deltaPanRate;
          let curr_lam_phi = this.mapView.getProjCenter();
          let newLam0 = curr_lam_phi.lambda - deltaX;
          let newPhi0 = Math.max(Math.min(curr_lam_phi.phi + deltaY, Math.PI / 2.0), -Math.PI / 2.0);
          this.mapView.setProjCenter(newLam0, newPhi0);
        }
        this.viewStatus.dragPrevPos = canv_xy;
      }
    }
  },

  handleTouchEnd(event) {
    if (event.touches.length < 2) {
      this.viewStatus.pinching = false;
      this.viewStatus.pinchPrevDistance = null;
      this.setQueryParams();
    }
    if (event.touches.length === 0) {
      this.viewStatus.drag = false;
      this.viewStatus.dragPrevPos = null;
      this.mapView.render(true);
    }
  },

  handleDoubleTap(event) {
    let canv_xy = this.checkAndGetGesturePos(event.clientX, event.clientY);
    if (canv_xy) {
      // console.log(`Double tap at canvas coordinates: (${canv_xy[0]}, ${canv_xy[1]})`);
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