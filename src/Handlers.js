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
      case "ArrowUp":
        {
          let deltaPanRate = this.getPanRate(this.viewStatus.zoomScale);
          let curr_lam_phi = this.mapView.getProjCenter();
          let newPhi0 = Math.max(Math.min(curr_lam_phi.phi + (1 / deltaPanRate), Math.PI / 2.0), -Math.PI / 2.0);
          this.mapView.setProjCenter(curr_lam_phi.lambda, newPhi0);
        }
        break;
      case "ArrowDown":
        {
          let deltaPanRate = this.getPanRate(this.viewStatus.zoomScale);
          let curr_lam_phi = this.mapView.getProjCenter();
          let newPhi0 = Math.max(Math.min(curr_lam_phi.phi - (1 / deltaPanRate), Math.PI / 2.0), -Math.PI / 2.0);
          this.mapView.setProjCenter(curr_lam_phi.lambda, newPhi0);
        }
        break;
      case "ArrowLeft":
        {
          let deltaPanRate = this.getPanRate(this.viewStatus.zoomScale);
          let curr_lam_phi = this.mapView.getProjCenter();
          let newLam0 = curr_lam_phi.lambda - (1 / deltaPanRate);
          this.mapView.setProjCenter(newLam0, curr_lam_phi.phi);
        }
        break;
      case "ArrowRight":
        {
          let deltaPanRate = this.getPanRate(this.viewStatus.zoomScale);
          let curr_lam_phi = this.mapView.getProjCenter();
          let newLam0 = curr_lam_phi.lambda + (1 / deltaPanRate);
          this.mapView.setProjCenter(newLam0, curr_lam_phi.phi);
        }
        break;
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

  ///////////////////////////////////////////////////////////////
  handleMouseDown(event) {
    let canv_xy = this.checkAndGetGesturePos(event.clientX, event.clientY);
    if (canv_xy) {
      this.viewStatus.drag = true;
      this.viewStatus.dragPrevPos = canv_xy;
      this.requestId = requestAnimationFrame(this.animation);
    }
  },

  handleMouseMove(event) {
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
          this.viewStatus.lam0 = newLam0;
          this.viewStatus.phi0 = newPhi0;
          this.mapView.setProjCenter(newLam0, newPhi0);
        }
        this.viewStatus.dragPrevPos = canv_xy;
      }
    }
  },

  handleMouseUp(event) {
    this.viewStatus.drag = false;
    this.viewStatus.dragPrevPos = null;
    this.mapView.render(true);
  },

  ///////////////////////////////////////////////////////////////
  getTouchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  },

  handleTouchStart(event) {
    if (event.touches.length === 2) {
      // Pinch gesture: clear tap tracking to avoid accidental double-tap
      this.viewStatus.pinching = true;
      this.viewStatus.pinchPrevDistance = this.getTouchDistance(event.touches[0], event.touches[1]);
      this.viewStatus.lastTapTime = 0;
      this.viewStatus.lastTapPos = null;
      this.viewStatus.drag = false; // disable drag when pinch starts
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
        this.viewStatus.zoomScale = this.viewStatus.zoomScale * 1.1;
      } else {
        this.viewStatus.zoomScale = this.viewStatus.zoomScale / 1.1;
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
          this.viewStatus.lam0 = newLam0;
          this.viewStatus.phi0 = newPhi0;
          this.mapView.setProjCenter(newLam0, newPhi0);
        }
        this.viewStatus.dragPrevPos = canv_xy;
      }
      // console.log("butmy",this.viewStatus.lam0 , newLam0);
      // this.viewStatus.lam0 = newLam0;
      // this.viewStatus.phi0 = newPhi0;
    }
  },

  /**
   * Handles the end of a touch event on the map view.
   * 
   * Manages pinch gesture termination, detects double-tap gestures with distance validation,
   * and handles drag gesture completion. Records tap timing and position to distinguish
   * between single and double taps within a specified threshold.
   * 
   * @param {TouchEvent} event - The touch event object containing touch point information
   * 
   * @description
   * - Resets pinch state when fewer than 2 touches remain
   * - Detects double-tap on single finger with time (300ms) and distance (30px) constraints
   * - Triggers handleDoubleClick callback if double-tap is detected
   * - Records tap timing and position for subsequent double-tap validation
   * - Auto-clears stale tap state after DOUBLE_TAP_MS + 50ms
   * - Completes drag gesture and triggers re-render when all touches end
   */
  handleTouchEnd(event) {
    const DOUBLE_TAP_MS = 300;
    const DOUBLE_TAP_DIST_PX = 30;

    if (event.touches.length < 2) {
      this.viewStatus.pinching = false;
      this.viewStatus.pinchPrevDistance = null;
    }

    // Detect double-tap on single-finger end
    if (event.changedTouches && event.changedTouches.length === 1) {
      const touch = event.changedTouches[0];
      const now = Date.now();
      const last = this.viewStatus.lastTapTime || 0;
      const lastPos = this.viewStatus.lastTapPos;

      if (last > 0 && (now - last) <= DOUBLE_TAP_MS && lastPos) {
        const dx = touch.clientX - lastPos[0];
        const dy = touch.clientY - lastPos[1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= DOUBLE_TAP_DIST_PX) {
          // It's a double-tap: prevent browser zoom and trigger map double-tap
          event.preventDefault();
          this.viewStatus.lastTapTime = 0;
          this.viewStatus.lastTapPos = null;
          this.handleDoubleClick({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => { } });
        } else {
          // Not close enough: treat as new tap
          this.viewStatus.lastTapTime = now;
          this.viewStatus.lastTapPos = [touch.clientX, touch.clientY];
        }
      } else {
        // first tap: record
        this.viewStatus.lastTapTime = now;
        this.viewStatus.lastTapPos = [touch.clientX, touch.clientY];
        // clear after threshold to avoid stale state
        setTimeout(() => {
          if (Date.now() - (this.viewStatus.lastTapTime || 0) > DOUBLE_TAP_MS) {
            this.viewStatus.lastTapTime = 0;
            this.viewStatus.lastTapPos = null;
          }
        }, DOUBLE_TAP_MS + 50);
      }
    }

    if (event.touches.length === 0) {
      this.viewStatus.drag = false;
      this.viewStatus.dragPrevPos = null;
      this.mapView.render(true);
    }
  },

  ///////////////////////////////////////////////////////////////
  handleDoubleClick(event) {
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