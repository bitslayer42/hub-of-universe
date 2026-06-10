html2canvas NOPE (dont think it will read canvas)
ScreenCapture API - For media streams, requires user input (Firefox/Chrome support limited)
HTMLCanvasElement: toDataURL() (Maybe, but no cities?)
Headless Browsers
- Puppeteer
- Playwright
- Selenium
Third Party
- Urlbox
- ScreenshotAPI.net
- Grabzit


// ScreenCapture API example
async function takeScreenshot() {
  // 1. Request screen capture
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 1 }, // Low frame rate is enough for a still
    audio: false
  });

  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.autoplay = true;

    // 2. Wait for video to be ready
    await new Promise((resolve) => (video.onloadedmetadata = resolve));

    // 3. Draw frame to canvas
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    // 4. Get the image data
    const imageUrl = canvas.toDataURL("image/png");
    
    // Use imageUrl (e.g., set as src for an <img> tag)
    console.log("Screenshot captured:", imageUrl);
    return imageUrl;

  } finally {
    // 5. Always stop the stream tracks to close the capture session
    stream.getTracks().forEach(track => track.stop());
  }
}
