/*! FlatEarth WebGL v0.0.13  2016-11-13
 * Copyright (C) 2016 T.Seno
 * Copyright (C) 2016 www.flatearthlab.com
 * All rights reserved.
 */
"use strict";

///////////////////////////////////////////////////////////////////
///////main////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function main(imageProj) { //imageProj is a RasterProjAEQD
    startup(imageProj);
    animation();
}

///////////////////////////////////////////////////////////////////
///////startup////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function startup(imageProj) {
    canvas = document.getElementById("webglCanvas"); 
    gl = WebGLUtils.setupWebGL(canvas); 
    if (!gl) {
        return void alert("Failed to setup WebGL.");
    }
    resizeCanvas(canvas);
    canvas.addEventListener("webglcontextlost", handleContextLost, false);
    canvas.addEventListener("webglcontextrestored", handleContextRestored, false);
    
    var hamm = new Hammer(canvas);
    hamm.get("pinch").set({
        enable: true
    }); 

    $(canvas).hammer().on("panmove", handlePan); 
    $(canvas).hammer().on("panstart", handlePanStart);
    $(canvas).hammer().on("panend pancancel", handlePanEnd);
    $(canvas).hammer().on("pinch", handlePinch);
    $(canvas).hammer().on("pinchend", handlePinchEnd);
    $(canvas).on("touchend", function(a) {
        a.preventDefault();
    });
    $(canvas).hammer().on("doubletap", handleDoubleTap);
    window.WheelEvent && document.addEventListener("wheel", handleWheel, false);
    
    init(imageProj);
}

///////////////////////////////////////////////////////////////////
///////init////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function init(imageProj) { //imageProj is a RasterProjAEQD
    var b = 0;
    var c = 0;
    var lam0 = 0;				//map center longitude
    var phi0 = Math.PI / 2;	    //map center latitude
    var canvasInfo = canvas.getBoundingClientRect();   //read-only left, top, right, bottom, x, y, width, height properties of canvas
    var tile_opts = {
            rootNumX: 2,
            rootNumY: 1,
            rootTileSizeX: Math.PI,
            rootTileSizeY: Math.PI,
            numLevels: 4,
            tileOrigin: [-Math.PI, -Math.PI / 2],
            inverseY: false
        };
    var cache_opts = {
            num: 50
        };
        
    imageProj.init(gl); 
    imageProj.setProjCenter(lam0, phi0);
    var canvasSize = {
        width: canvasInfo.width,
        height: canvasInfo.height
    };
    mapView = new MapView(gl, imageProj, canvasSize, tile_opts, cache_opts); 
    
    //loadIcon("./center-pin.png"),
    
    //Add custom function to MapView- Determines tile level needed
    mapView.calculateLevel = function(window, dataRect) {
        var c = window[2] - window[0];
        var d = window[3] - window[1];
        var e = Math.sqrt(c * d);
        return Math.PI <= e ? 0 : Math.PI / 2 <= e ? 1 : Math.PI / 4 <= e ? 2 : 3
    };
    
    var j = mapView.getViewRect();
    var k = (j[2] - j[0]) / 2;  //radius (pi)
    
    //Add custom function to MapView
    mapView.createUrl = function(a, b, c) {
        //return "http://www.flatearthlab.com/data/20120925/adb12292ed/NE2_50M_SR_W/" + a + "/" + b + "/" + c + ".png"
        //https://api.mapbox.com/styles/v1/mapbox/streets-v9/tiles/256/0/0/0?access_token=access_token
        return "./images/" + a + "/" + b + "/" + c + ".png"
    };
    
    mapView.setWindow(b - k, c - k, b + k, c + k);
    mapView.requestImagesIfNecessary();
}

///////////////////////////////////////////////////////////////////
///////resizeCanvas////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function resizeCanvas(canvas) {
    var width = canvas.clientWidth,
        height = canvas.clientHeight;
    canvas.width == width && canvas.height == height || (canvas.width = width, canvas.height = height)
}

///////////////////////////////////////////////////////////////////
///////getProjCenterParameter////////////////////////////////////////////////////////////
//   if url includes ?projCenter=lat,log map will be centered there /////////////////////
///////////////////////////////////////////////////////////////////
function getProjCenterParameter() {
    var a = location.search.match(/projCenter=(.*?)(&|$)/);
    if (a) {
        var b = decodeURIComponent(a[1]);
        if (b) {
            var c = b.split(",");
            if (c.length < 2) return null;
            var d = parseFloat(c[0]),
                e = parseFloat(c[1]);
            if (isNaN(d) || isNaN(e)) return null;
            var f = d * Math.PI / 180,
                g = e * Math.PI / 180;
            return f < -Math.PI / 2 && (f = -Math.PI / 2), Math.PI / 2 < f && (f = Math.PI / 2), [g, f]
        }
    }
    return null;
}

///////////////////////////////////////////////////////////////////
///////startup////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function startup(imageProj) { //imageProj is a RasterProjAEQD
    canvas = document.getElementById("webglCanvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
	    return void alert("Failed to setup WebGL.");
	}
    resizeCanvas(canvas);
    canvas.addEventListener("webglcontextlost", handleContextLost, false);
    canvas.addEventListener("webglcontextrestored", handleContextRestored, false);
    var ham = new Hammer(canvas);
    ham.get("pinch").set({
        enable: true
    });
    $(canvas).hammer().on("panmove", handlePan);
    $(canvas).hammer().on("panstart", handlePanStart);
    $(canvas).hammer().on("panend pancancel", handlePanEnd);
    $(canvas).hammer().on("pinch", handlePinch);
    $(canvas).hammer().on("pinchend", handlePinchEnd);
    $(canvas).on("touchend", function(a) {
        a.preventDefault()
    });
    $(canvas).hammer().on("doubletap", handleDoubleTap);
    window.WheelEvent && document.addEventListener("wheel", handleWheel, false);
    init(imageProj);
}

///////////////////////////////////////////////////////////////////
///////checkAndGetMousePos////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function checkAndGetMousePos(a) {
    var b = canvas.getBoundingClientRect(),
        c = a.clientX - b.left,
        d = a.clientY - b.top;
    return 0 > c || 0 > d ? null : b.width < c || b.height < d ? null : [c, d]
}

///////////////////////////////////////////////////////////////////
///////checkAndGetGesturePos////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function checkAndGetGesturePos(a) {
    var b = canvas.getBoundingClientRect(),
        c = a.gesture.center.x - b.left,
        d = a.gesture.center.y - b.top;
    return 0 > c || 0 > d ? null : b.width < c || b.height < d ? null : [c, d]
}

///////////////////////////////////////////////////////////////////
///////handlePan////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function handlePan(a) {
    if (viewStatus.drag) {
        var b = checkAndGetGesturePos(a);
        if (null != b) {
            if (a.preventDefault(), null != viewStatus.dragPrevPos) {
                var c = b[0] - viewStatus.dragPrevPos[0],
                    d = b[1] - viewStatus.dragPrevPos[1];
                mapView.moveWindow(c, d)
            }
            viewStatus.dragPrevPos = b
        }
    }
}

///////////////////////////////////////////////////////////////////
///////handlePanStart////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function handlePanStart(a) {
    viewStatus.drag = true;
    var b = checkAndGetGesturePos(a);
    null != b && (a.preventDefault(), viewStatus.dragStartPos = b)
}

///////////////////////////////////////////////////////////////////
///////handlePanEnd////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function handlePanEnd(a) {
    viewStatus.drag = false, viewStatus.dragPrevPos = null
}

///////////////////////////////////////////////////////////////////
///////handleDoubleTap////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function handleDoubleTap(a) {
    var b = checkAndGetGesturePos(a);
    if (null != b) {
        a.preventDefault();
        var c = mapView.getLambdaPhiPointFromWindow(b[0], b[1]);
        viewStatus.targetLambdaPhi = c; //{lambda: 1.533480323761242, phi: 0.5899993533326611} ; //c
    }
}

///////////////////////////////////////////////////////////////////
///////handleWheel////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function handleWheel(a) {
    var b = 6,
        c = checkAndGetMousePos(a);
    null != c && (a.preventDefault(), viewStatus.zoomChange -= a.deltaY * b)
}

///////////////////////////////////////////////////////////////////
///////handlePinch////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function handlePinch(a) {
    var b = checkAndGetGesturePos(a);
    if (null != b) {
        a.preventDefault();
        var c = a.gesture.scale,
            d = null != viewStatus.pinchPrevScale ? viewStatus.pinchPrevScale : 1,
            e = gl.canvas.height * (c - d);
        viewStatus.zoomChange += e, viewStatus.pinchPrevScale = c
    }
}

///////////////////////////////////////////////////////////////////
///////handlePinchEnd////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function handlePinchEnd(a) {
    viewStatus.pinchPrevScale = null
}

///////////////////////////////////////////////////////////////////
///////handleContextLost////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function handleContextLost(a) {
    a.preventDefault(), cancelAnimFrame(requestId), mapView.resetImages()
}

///////////////////////////////////////////////////////////////////
///////handleContextRestored////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function handleContextRestored(a) {
    init(), requestId = requestAnimFrame(animation)
}

///////////////////////////////////////////////////////////////////
///////main////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function main(imageProj) { 		//imageProj is a RasterProjAEQD
    startup(imageProj), 		// sets up canvas, webgl, and hammer, and calls init (map-main ln: 98)
    animation()			// starts animation
}

///////////////////////////////////////////////////////////////////
///////animation////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function animation() {
    requestId = requestAnimFrame(animation);
    var currTime = (new Date).getTime();
    if (null == prevTime) {
        prevTime = currTime;
    } 
    if (ProjMath.EPSILON < Math.abs(viewStatus.zoomChange)) {
        var b = 5 * (currTime - prevTime);
        var c = viewStatus.zoomChange;
        b < Math.abs(viewStatus.zoomChange) && (c = 0 < viewStatus.zoomChange ? +b : -b);
        mapView.zoomWindow(c);
        viewStatus.zoomChange = 0;
    }
    var d;
    if (null != viewStatus.interpolater) {
        d = viewStatus.interpolater.getPos(currTime); 
        mapView.setProjCenter(d.lp.lambda, d.lp.phi);
        mapView.setViewCenterPoint(d.viewPos[0], d.viewPos[1]);
        viewStatus.interpolater.isFinished() && (viewStatus.interpolater = null);
    }
    else if (null != viewStatus.targetLambdaPhi) {
        var e = mapView.getViewCenterPoint();
        var f = mapView.getProjCenter();
        var g = viewStatus.targetLambdaPhi;
        viewStatus.interpolater = Interpolater.create(f, g, e, [0, 0], interpolateTimeSpan);
        viewStatus.targetLambdaPhi = null;
        if (null != viewStatus.interpolater) {
            d = viewStatus.interpolater.getPos(currTime);
            mapView.setProjCenter(d.lp.lambda, d.lp.phi);
            mapView.setViewCenterPoint(d.viewPos[0], d.viewPos[1]);
        }
    }
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    mapView.render();
    prevTime = currTime;
}

///////////////////////////////////////////////////////////////////
///////MapMathUtils////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
var MapMathUtils = function() {};
MapMathUtils.smoothstep = function(a, b, c) {
    var d = ProjMath.clamp((c - a) / (b - a), 0, 1);
    return d * d * (3 - 2 * d)
};
MapMathUtils.smootherstep = function(a, b, c) {
    var d = ProjMath.clamp((c - a) / (b - a), 0, 1);
    return d * d * d * (d * (6 * d - 15) + 10)
};
MapMathUtils.toUnitVector3d = function(a, b) {
    var c = Math.cos(b);
    return [Math.cos(a) * c, Math.sin(a) * c, Math.sin(b)]
};
MapMathUtils.slerp = function(a, b, c) {  //Spherical Linear Interpolation
    var d = ProjMath.clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1);
    if (1 - ProjMath.EPSILON < d) return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    d < -(1 - ProjMath.EPSILON);
    var e = Math.acos(d),
        f = Math.sin(e),
        g = Math.sin((1 - c) * e) / f,
        h = Math.sin(c * e) / f;
    return [g * a[0] + h * b[0], g * a[1] + h * b[1], g * a[2] + h * b[2]]
};

///////////////////////////////////////////////////////////////////
///////Interpolater////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
var Interpolater = function(a, b, c, d, e) {
    this.v1 = MapMathUtils.toUnitVector3d(a.lambda, a.phi);
    this.v2 = MapMathUtils.toUnitVector3d(b.lambda, b.phi);
    this.iniViewPos = c;
    this.finViewPos = d;
    this.timeSpan = e;
    this.startTime = null;
    this.finished = false;
};
Interpolater.create = function(a, b, c, d, e) {
    return ProjMath.neighborPoint(a, b) ? null : (Math.PI - ProjMath.EPSILON < Math.abs(b.phi - a.phi) && (a = {
        lambda: a.lambda,
        phi: a.phi + 1e-4 * (0 < a.phi ? -1 : 1)
    }), new Interpolater(a, b, c, d, e))
};
Interpolater.prototype.getPos = function(a) {
    var b = 0;
    if (null == this.startTime) this.startTime = a;
    else {
        var c = a - this.startTime;
        b = ProjMath.clamp(c / this.timeSpan, 0, 1), this.startTime + this.timeSpan < a && (this.finished = true)
    }
    var d = MapMathUtils.smootherstep(0, 1, b),
        e = MapMathUtils.slerp(this.v1, this.v2, d),
        f = ProjMath.toLambdaPhi(e),
        g = [this.iniViewPos[0] * (1 - d) + this.finViewPos[0] * d, this.iniViewPos[1] * (1 - d) + this.finViewPos[1] * d];
    return {
        lp: f,
        viewPos: g
    }
};
Interpolater.prototype.isFinished = function() {
    return this.finished
};

///////////////////////////////////////////////////////////////////
/////////globals//////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
var interpolateTimeSpan = 1e3,
    gl = null,
    canvas = null,
    mapView = null,
    requestId = null,
    prevTime = null,
    viewStatus = {
        drag: false,
        dragPrevPos: null,
        pinchPrevScale: null,
        zoomChange: 0,
        targetLambdaPhi: null,
        interpolater: null
    };