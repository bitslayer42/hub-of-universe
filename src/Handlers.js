export const Handlers = {
  checkAndGetGesturePos(clientX, clientY) {
    let canv_xy = this.canvas.getBoundingClientRect();
    let left = clientX - canv_xy.left;
    let top = clientY - canv_xy.top;
    return [left, top];
  },

  handleLayerChange(event) {
    this.selectedLayer = event.target.value;
    this.setLayer();
    this.setQueryParams();
    this.mapView.render(true, this.displayCities);
  },

  handleShowCitiesChange(event) {
    this.displayCities = event.target.checked;
    this.mapView.render(true, this.displayCities);
  },

  handleGotoChange(event) {
    this.selectedGoto = event.target.value;
    let selectedLocation = this.gotoLocations[parseInt(this.selectedGoto)];
    let lam_phi_zoom = { lambda: selectedLocation[1], phi: selectedLocation[2], zoom: this.zoomMax };
    this.gotoLocation(lam_phi_zoom);
    this.gotoSelectBox.selectedIndex = 0; // reset select box to default
  },

  handleKeydown(event) {
    switch (event.key) {
      case '=':
      case '+':
        this.viewStatus.zoomScale = this.viewStatus.zoomScale * 2.0;
        break;
      case '-':
      case '_':
        this.viewStatus.zoomScale = this.viewStatus.zoomScale / 2.0;
        break;
      case "ArrowUp":
        {
          let curr_lam_phi = this.mapView.getProjCenter();
          let newPhi0 = Math.max(Math.min(curr_lam_phi.phi + (1 / this.panRate), Math.PI / 2.0), -Math.PI / 2.0);
          this.setProjCenter(curr_lam_phi.lambda, newPhi0);
        }
        break;
      case "ArrowDown":
        {
          let curr_lam_phi = this.mapView.getProjCenter();
          let newPhi0 = Math.max(Math.min(curr_lam_phi.phi - (1 / this.panRate), Math.PI / 2.0), -Math.PI / 2.0);
          this.setProjCenter(curr_lam_phi.lambda, newPhi0);
        }
        break;
      case "ArrowLeft":
        {
          let curr_lam_phi = this.mapView.getProjCenter();
          let newLam0 = curr_lam_phi.lambda - (1 / this.panRate);
          this.setProjCenter(newLam0, curr_lam_phi.phi);
        }
        break;
      case "ArrowRight":
        {
          let curr_lam_phi = this.mapView.getProjCenter();
          let newLam0 = curr_lam_phi.lambda + (1 / this.panRate);
          this.setProjCenter(newLam0, curr_lam_phi.phi);
        }
        break;
      default:
        break;
    }
    this.viewStatus.zoomScale = Math.min(Math.max(this.zoomMin, this.viewStatus.zoomScale), this.zoomMax);
    requestAnimationFrame(this.renderOnce);
    this.wheelTimer && clearTimeout(this.wheelTimer);
    this.wheelTimer = setTimeout(() => {
      requestAnimationFrame(this.renderOnceSync);
    }, 200);
  },

  handleWheel(event) {
    if (event.deltaY < 0) {
      this.viewStatus.zoomScale = this.viewStatus.zoomScale * 1.1;
    }
    else {
      this.viewStatus.zoomScale = this.viewStatus.zoomScale / 1.1;
    }
    this.viewStatus.zoomScale = Math.min(Math.max(this.zoomMin, this.viewStatus.zoomScale), this.zoomMax);
    requestAnimationFrame(this.renderOnce);
    this.wheelTimer && clearTimeout(this.wheelTimer);
    this.wheelTimer = setTimeout(() => {
      requestAnimationFrame(this.renderOnceSync);
    }, 100);
  },

  setPanRate(zoomScale) {
    // return higher numbers to move slower 
    if (zoomScale < 1) {
      this.panRate = 100;
    } else if (zoomScale < 10) {
      this.panRate = 300;
    } else if (zoomScale < 100) {
      this.panRate = 500;
    } else if (zoomScale < 1_000) {
      this.panRate = 1_000;
    } else if (zoomScale < 10_000) {
      this.panRate = 10_000;
    } else if (zoomScale < 100_000) {
      this.panRate = 50_000;
    } else {
      this.panRate = zoomScale * 3;
    }
  },

  ///////////////////////////////////////////////////////////////
  handleMouseDown(event) {
    let canv_xy = this.checkAndGetGesturePos(event.clientX, event.clientY);
    this.viewStatus.drag = true;
    this.viewStatus.dragPrevPos = canv_xy;
  },

  handleMouseMove(event) {
    if (this.viewStatus.drag) {
      let canv_xy = this.checkAndGetGesturePos(event.clientX, event.clientY);
      if (this.viewStatus.dragPrevPos) {
        event.preventDefault();
        let deltaX = (canv_xy[0] - this.viewStatus.dragPrevPos[0]) / this.panRate;
        let deltaY = (canv_xy[1] - this.viewStatus.dragPrevPos[1]) / this.panRate;
        let curr_lam_phi = this.mapView.getProjCenter();
        let newLam0 = curr_lam_phi.lambda - deltaX;
        let newPhi0 = Math.max(Math.min(curr_lam_phi.phi + deltaY, Math.PI / 2.0), -Math.PI / 2.0);
        this.setProjCenter(newLam0, newPhi0);
      }
      this.viewStatus.dragPrevPos = canv_xy;
      this.mapView.render(false, this.displayCities);
    }
  },

  handleMouseUp(event) {
    this.viewStatus.drag = false;
    this.viewStatus.dragPrevPos = null;
    this.setQueryParams();
    this.mapView.renderSync(true, this.displayCities);
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
      requestAnimationFrame(this.renderOnce);
    } else if (event.touches.length === 1 && this.viewStatus.drag) {
      // Single touch drag
      let touch = event.touches[0];
      let canv_xy = this.checkAndGetGesturePos(touch.clientX, touch.clientY);
      if (null != canv_xy) {
        if (this.viewStatus.dragPrevPos) {
          event.preventDefault();
          let deltaX = (canv_xy[0] - this.viewStatus.dragPrevPos[0]) / this.panRate;
          let deltaY = (canv_xy[1] - this.viewStatus.dragPrevPos[1]) / this.panRate;
          let curr_lam_phi = this.mapView.getProjCenter();
          let newLam0 = curr_lam_phi.lambda - deltaX;
          let newPhi0 = Math.max(Math.min(curr_lam_phi.phi + deltaY, Math.PI / 2.0), -Math.PI / 2.0);
          this.setProjCenter(newLam0, newPhi0);
          this.mapView.render(false, this.displayCities);
        }
        this.viewStatus.dragPrevPos = canv_xy;
      }
    }
  },

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
      this.mapView.renderSync(true, this.displayCities);
    }
  },

  // handleTouchEnd(event) {
  //   this.viewStatus.pinching = false;
  //   this.viewStatus.pinchPrevDistance = null;
  //   this.setQueryParams();
  //   this.mapView.renderSync(true, this.displayCities);
  // },

  ///////////////////////////////////////////////////////////////
  handleZoomInClick(event) {
    event.preventDefault();
    this.viewStatus.zoomScale = this.viewStatus.zoomScale * 2.0;
    this.viewStatus.zoomScale = Math.min(Math.max(this.zoomMin, this.viewStatus.zoomScale), this.zoomMax);
    requestAnimationFrame(this.renderOnceSync);
  },

  handleZoomOutClick(event) {
    event.preventDefault();
    this.viewStatus.zoomScale = this.viewStatus.zoomScale / 2.0;
    this.viewStatus.zoomScale = Math.min(Math.max(this.zoomMin, this.viewStatus.zoomScale), this.zoomMax);
    requestAnimationFrame(this.renderOnceSync);
  },

  handleMyLocationClick: async function (event) {
    event.preventDefault();
    let lam_phi = await this.getUsersLocation(true);
    let lam_phi_zoom = { lambda: lam_phi.lambda, phi: lam_phi.phi, zoom: this.zoomMax };
    this.gotoLocation(lam_phi_zoom);
  },

  handleTitleClick: async function (event) {
    event.preventDefault();
    let random_latlon = this.mapView.cities.cityList[Math.floor(Math.random() * this.mapView.cities.cityList.length * 2 / 3)];
    // //console.log("Random city selected:", random_latlon);
    let lam_phi = { lambda: random_latlon.longitude * Math.PI / 180, phi: random_latlon.latitude * Math.PI / 180 };
    let lam_phi_zoom = { lambda: lam_phi.lambda, phi: lam_phi.phi, zoom: this.zoomMax };
    this.gotoLocation(lam_phi_zoom);
  },

  handleDoubleClick(event) { // NOTICE: single click is also called when double clicking
    clearTimeout(this.messageTimeoutID); // clear any existing message timeout
    this.messagesBox.innerHTML = ""; // clear messages on double click

    let canv_xy = this.checkAndGetGesturePos(event.clientX, event.clientY);
    if (canv_xy) {
      // //console.log(`Double tap at canvas coordinates: (${canv_xy[0]}, ${canv_xy[1]})`);
      event.preventDefault();
      let lam_phi = this.mapView.getLambdaPhiPointFromWindow(canv_xy[0], canv_xy[1]);
      let lam_phi_zoom = { lambda: lam_phi.lambda, phi: lam_phi.phi, zoom: this.viewStatus.zoomScale };
      this.gotoLocation(lam_phi_zoom);
    }
  },

  gotoLocation(lam_phi_zoom) {
    this.viewStatus.targetLambdaPhiZoom = lam_phi_zoom; // set target lambda, phi for interpolater
    requestAnimationFrame(this.animation);
  },

  handleContextLost(event) {
    event.preventDefault();
    this.mapView.resetImages();
  },

  handleContextRestored(event) {
    this.init(this.rasterProj);
    requestAnimationFrame(this.renderOnceSync);
  }
};