  import { main, resizeCanvas, getProjCenterParameter } from './src/Main.js';
  import { RasterProjAEQD } from './src/RasterProjAEQD.js';
  window.addEventListener("resize", (event) => {
    draw();
  });
  document.addEventListener('DOMContentLoaded', () => {
    draw();
  });

  function draw() {
    const canvas = document.getElementById('webglCanvas');
    resizeCanvas(canvas);
    //  default projCenter parameter
    var phi0 = 0.0 // 35.32 * 0.0174533; // +Math.PI/2; //north pole
    var lam0 = 0.0 //-82.48 * 0.0174533;
    var projCenter = getProjCenterParameter();  //map-main ln:77 (if url includes projCenter=35.3206141,-82.4861473)
    if (projCenter) {
      lam0 = projCenter[0];
      phi0 = projCenter[1];
    }
    var imageProj = new RasterProjAEQD();        //rasterproj-aeqd ln:530
    main(imageProj);                             //map-main ln:11
    imageProj.setProjCenter(lam0, phi0);         //rasterproj-aeqd ln:561       
  } 