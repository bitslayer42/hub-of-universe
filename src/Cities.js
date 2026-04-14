let Cities = function (mapView) {
  this.rasterProj = mapView.rasterProj;
  this.cityList = [];
  this.cityDiv = document.getElementById('citydiv');
  this.cityFontColor = "black"; // default font color
};

Cities.prototype.showCities_ = async function (getNewTiles, mapView) {
  let lat0 = (mapView.phi0 * 180 / Math.PI).toFixed(2); // convert to degrees
  let lon0 = (mapView.lam0 * 180 / Math.PI).toFixed(2); // convert to degrees
  let mapkey = lat0 + "," + lon0 + "," + mapView.currTileLevel;
  if (!mapView.cityCache.has(mapkey) && getNewTiles) {
    // this.cityCache.put(mapkey, null); // placeholder to indicate loading
    this.requestCities_(mapkey, lat0, lon0, mapView.currTileLevel);
    return;
  }
  mapView.cityCache.get(mapkey, lat0, lon0, mapView.currTileLevel);
  this.placeCities();
};

Cities.prototype.requestCities_ = function (mapkey, lat0, lon0, tileLevel) {
  let api_key = import.meta.env.VITE_HUB_API_KEY;
  const params = new URLSearchParams();
  params.append("apikey", api_key);
  params.append("lat", lat0);
  params.append("lon", lon0);
  params.append("level", tileLevel);

  fetch(`${import.meta.env.VITE_CITIES_URL}?${params}`, {
    method: "GET",
    headers: {
      "Content-Type": "text/plain"
    }
  })
    .then(response => response.json())
    .then(data => {
      this.cityList = data || [];
      this.cityCache.put(mapkey, this.cityList);
    })
    .catch(error => {
      console.error("Error fetching cities:", error);
      // this.cityList = [];
    });
};

Cities.prototype.clearCities = function () {
  this.cityDiv.innerHTML = '';
};

Cities.prototype.placeCities = function () {
  this.cityDiv.innerHTML = '';
  const rect = this.cityDiv.getBoundingClientRect();
  for (let city of this.cityList) {
    let fontSize = -0.06 * city.level + 1.2; // Adjust font size from 0.6 to 1.2em based on city level 0-10
    let { x, y } = this.rasterProj.projection.forward(
      city.longitude * Math.PI / 180,
      city.latitude * Math.PI / 180
    );
    x = ( x / (2 * Math.PI) + 0.5) * rect.width;
    y = (-y / (2 * Math.PI) + 0.5) * rect.height;

    const worddiv = document.createElement('div');
    worddiv.classList.add('word'); // for css
    worddiv.classList.add(this.cityFontColor); // for css
    worddiv.style.left = `${x}px`;
    worddiv.style.top = `${y}px`;
    worddiv.style.fontSize = `${fontSize}em`;

    worddiv.textContent = city.name;
    this.cityDiv.appendChild(worddiv);
  }
    // After elements are in the DOM test for overlap and hide if necessary
    const children = Array.from(this.cityDiv.children);
    const placedRects = [];
    const padding = 0; // minimum space between words

    children.forEach(child => {
      const cRect = child.getBoundingClientRect();
      const x = parseInt(child.style.left);
      const y = parseInt(child.style.top);
      const w = parseInt(cRect.width);
      const h = parseInt(cRect.height);

      const candidate = { left: x - w / 2 - padding, top: y - h / 2 - padding, right: x + w / 2 + padding, bottom: y + h / 2 + padding };

      const collision = placedRects.some(r => !(candidate.right < r.left || candidate.left > r.right || candidate.bottom < r.top || candidate.top > r.bottom));
      if (collision) {
        child.style.display = 'none';
      } else {
        placedRects.push({ name: child.textContent, left: candidate.left, top: candidate.top, right: candidate.right, bottom: candidate.bottom });
      }
      // child.style.left = `${left}px`;
      // child.style.top = `${top}px`;
    });
}

export { Cities };