/*! FlatEarth WebGL v0.0.10  2016-07-27
 * Copyright (C) 2016 T.Seno
 * Copyright (C) 2016 www.flatearthlab.com
 * All rights reserved.
 */
"use strict";
///////////////////////////////////////////////////////////////////
///////init////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function init(a) {
    var b = 0,
        c = 0,
        d = 0,
        e = Math.PI / 2,
        f = canvas.getBoundingClientRect(),
        g = {
            rootNumX: 2,
            rootNumY: 1,
            rootTileSizeX: Math.PI,
            rootTileSizeY: Math.PI,
            numLevels: 4,
            tileOrigin: [-Math.PI, -Math.PI / 2],
            inverseY: !1
        },
        h = {
            num: 50
        };
    a.init(gl, f.width, f.height), 
    a.setProjCenter(d, e), 
    mapView = new MapView(gl, a, g, h), 
    mapView.calculateLevel = function(a, b) {
        var c = a[2] - a[0],
            d = a[3] - a[1],
            e = Math.sqrt(c * d);
        return Math.PI <= e ? 0 : Math.PI / 2 <= e ? 1 : Math.PI / 4 <= e ? 2 : 3
    };
    var i = a.getViewRect(),
        j = (i[2] - i[0]) / 2;
    mapView.createUrl = function(a, b, c) {
        //return "http://www.flatearthlab.com/data/20120925/adb12292ed/NE2_50M_SR_W/" + a + "/" + b + "/" + c + ".png"
        return "./images/" + a + "/" + b + "/" + c + ".png"
    }, 
    mapView.setWindow(b - j, c - j, b + j, c + j), 
    mapView.requestImagesIfNecessary()
}
///////////////////////////////////////////////////////////////////
///////resizeCanvas////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function resizeCanvas(a) {
    var b = a.clientWidth,
        c = a.clientHeight;
    a.width == b && a.height == c || (a.width = b, a.height = c)
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
    return null
}
///////////////////////////////////////////////////////////////////
///////startup////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function startup(a) {
	
    if (canvas = document.getElementById("webglCanvas"), gl = WebGLUtils.setupWebGL(canvas), !gl) return void alert("Failed to setup WebGL.");
    resizeCanvas(canvas), canvas.addEventListener("webglcontextlost", handleContextLost, !1), canvas.addEventListener("webglcontextrestored", handleContextRestored, !1);
    var b = new Hammer(canvas);
    b.get("pinch").set({
        enable: !0
    }), $(canvas).hammer().on("panmove", handlePan), $(canvas).hammer().on("panstart", handlePanStart), $(canvas).hammer().on("panend pancancel", handlePanEnd), $(canvas).hammer().on("pinch", handlePinch), $(canvas).hammer().on("pinchend", handlePinchEnd), $(canvas).on("touchend", function(a) {
        a.preventDefault()
    }), $(canvas).hammer().on("doubletap", handleDoubleTap), window.WheelEvent && document.addEventListener("wheel", handleWheel, !1), init(a)
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
		var b = checkAndGetGesturePos(a); //b is [x,y] from upper left of canvas
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
    viewStatus.drag = !0;
    var b = checkAndGetGesturePos(a);
    null != b && (a.preventDefault(), viewStatus.dragStartPos = b)
}
///////////////////////////////////////////////////////////////////
///////handlePanEnd////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function handlePanEnd(a) {
    viewStatus.drag = !1, viewStatus.dragPrevPos = null
}
///////////////////////////////////////////////////////////////////
///////handleDoubleTap////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function handleDoubleTap(a) {
    var b = checkAndGetGesturePos(a);
    if (null != b) {
        a.preventDefault();
        var c = mapView.getLambdaPhiPointFromWindow(b[0], b[1]);
        viewStatus.targetLambdaPhi = c
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
function main(a) { //a is a RasterProjAEQD
    startup(a), animation()
}
///////////////////////////////////////////////////////////////////
///////animation////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function animation() {
    requestId = requestAnimFrame(animation);
    var a = (new Date).getTime();
    if (null == prevTime && (prevTime = a), ProjMath.EPSILON < Math.abs(viewStatus.zoomChange)) {
        var b = 5 * (a - prevTime),
            c = viewStatus.zoomChange;
        b < Math.abs(viewStatus.zoomChange) && (c = 0 < viewStatus.zoomChange ? +b : -b), mapView.zoomWindow(c), viewStatus.zoomChange = 0
    }
    var d;
    if (null != viewStatus.interpolater) d = viewStatus.interpolater.getPos(a), mapView.setProjCenter(d.lp.lambda, d.lp.phi), mapView.setViewCenterPoint(d.viewPos[0], d.viewPos[1]), viewStatus.interpolater.isFinished() && (viewStatus.interpolater = null);
    else if (null != viewStatus.targetLambdaPhi) {
        var e = mapView.getViewCenterPoint(),
            f = mapView.getProjCenter(),
            g = viewStatus.targetLambdaPhi;
        viewStatus.interpolater = Interpolater.create(f, g, e, [0, 0], interpolateTimeSpan), viewStatus.targetLambdaPhi = null, null != viewStatus.interpolater && (d = viewStatus.interpolater.getPos(a), mapView.setProjCenter(d.lp.lambda, d.lp.phi), mapView.setViewCenterPoint(d.viewPos[0], d.viewPos[1]))
    }
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height), mapView.render(), prevTime = a
}
///////////////////////////////////////////////////////////////////
///////MapUI////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
var MapUI = function() {};
MapUI.resetCityList = function(a) {
    a.children("ul").not("[hidden]").children("li").removeAttr("class")
}, MapUI.updateMap = function(a, b) {
    if (a.attr({
            "class": "active"
        }), b) {
        var c = a.children("a").text(),
            d = a.attr("data-lonlat"),
            e = d.split(",");
        b.call(this, c, parseFloat(e[0]), parseFloat(e[1]))
    }
}, MapUI.createCitiesTree = function(a, b, c, d) {
    var e = 0;
    a.children.forEach(function(a, f) {
        e++;
        var g = $("<li/>").attr({
            role: "presentation",
            countryId: e
        }).append($("<a/>").attr({
            href: "#"
        }).text(a.name)).click(function(a) {
            b.children("li").removeAttr("class");
            var e = $(this).attr("countryId");
            $(this).attr({
                "class": "active"
            }), c.children("ul").attr({
                hidden: "true"
            });
            var f = c.children("#country_" + e);
            f.removeAttr("hidden"), f.children("li").removeAttr("class");
            var g = f.children("li").first();
            MapUI.updateMap(g, d)
        });
        b.append(g);
        var h = $("<ul/>").attr({
            id: "country_" + e,
            "class": "nav nav-pills nav-stacked",
            hidden: "true"
        });
        a.children.forEach(function(a, b) {
            var c = $("<li/>").attr({
                role: "presentation",
                "data-lonlat": a.x + "," + a.y
            }).append($("<a/>").attr({
                href: "#"
            }).text(a.name)).click(function(a) {
                $(this).parent().children("li").removeAttr("class"), MapUI.updateMap($(this), d)
            });
            h.append(c)
        }), c.append(h)
    })
};
///////////////////////////////////////////////////////////////////
///////MapMathUtils////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
var MapMathUtils = function() {};
MapMathUtils.smoothstep = function(a, b, c) {
    var d = ProjMath.clamp((c - a) / (b - a), 0, 1);
    return d * d * (3 - 2 * d)
}, 
MapMathUtils.smootherstep = function(a, b, c) {
    var d = ProjMath.clamp((c - a) / (b - a), 0, 1);
    return d * d * d * (d * (6 * d - 15) + 10)
}, 
MapMathUtils.toUnitVector3d = function(a, b) {
    var c = Math.cos(b);
    return [Math.cos(a) * c, Math.sin(a) * c, Math.sin(b)]
}, 
MapMathUtils.slerp = function(a, b, c) {
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
    this.v1 = MapMathUtils.toUnitVector3d(a.lambda, a.phi), this.v2 = MapMathUtils.toUnitVector3d(b.lambda, b.phi), this.iniViewPos = c, this.finViewPos = d, this.timeSpan = e, this.startTime = null, this.finished = !1
};
Interpolater.create = function(a, b, c, d, e) {
    return ProjMath.neighborPoint(a, b) ? null : (Math.PI - ProjMath.EPSILON < Math.abs(b.phi - a.phi) && (a = {
        lambda: a.lambda,
        phi: a.phi + 1e-4 * (0 < a.phi ? -1 : 1)
    }), new Interpolater(a, b, c, d, e))
}, 
Interpolater.prototype.getPos = function(a) {
    var b = 0;
    if (null == this.startTime) this.startTime = a;
    else {
        var c = a - this.startTime;
        b = ProjMath.clamp(c / this.timeSpan, 0, 1), this.startTime + this.timeSpan < a && (this.finished = !0)
    }
    var d = MapMathUtils.smootherstep(0, 1, b),
        e = MapMathUtils.slerp(this.v1, this.v2, d),
        f = ProjMath.toLambdaPhi(e),
        g = [this.iniViewPos[0] * (1 - d) + this.finViewPos[0] * d, this.iniViewPos[1] * (1 - d) + this.finViewPos[1] * d];
    return {
        lp: f,
        viewPos: g
    }
}, 
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
        drag: !1,
        dragPrevPos: null,
        pinchPrevScale: null,
        zoomChange: 0,
        targetLambdaPhi: null,
        interpolater: null
    };
