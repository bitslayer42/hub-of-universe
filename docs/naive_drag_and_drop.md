# https://rogerallen.github.io/webgl/2014/01/27/azimuthal-equidistant-projection

function handleMouseDown(event) {
    if (event.button !== 0) return; // left button only
    mouseDown = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    renderer.domElement.setPointerCapture(event.pointerId);
}

function handleMouseUp(event) {
    mouseDown = false;
}

function handleMouseMove(event) {
    if (!mouseDown) {
        return;
    }
    var newX = event.clientX;
    var newY = event.clientY;

    var deltaX = newX - lastMouseX
    var deltaY = newY - lastMouseY;

    curLatitude += deltaY / 100.0;
    curLongitude -= deltaX / 100.0;

    lastMouseX = newX
    lastMouseY = newY;
}