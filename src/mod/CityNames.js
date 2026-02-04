const citynames = document.getElementById('citynames');

function placeCities(cityList, projection){  
  citynames.innerHTML = '';
  const rect = citynames.getBoundingClientRect();

  for(let city of cityList){
    let { x, y } = projection.forward(
      city.longitude * Math.PI / 180,
      city.latitude * Math.PI / 180
    );
    x = (x / (2 * Math.PI) + 0.5) * rect.width;
    y = (0.5 - y / (2 * Math.PI)) * rect.height;
    // create an SVG element with a single <text> child so we can use vector strokes
    const wordText = city.name;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.classList.add('word'); // for css
    svg.setAttribute('xmlns', svgNS);
    svg.style.overflow = 'visible';

    const textEl = document.createElementNS(svgNS, 'text');
    textEl.setAttribute('x', x);
    textEl.setAttribute('y', y);
    textEl.textContent = wordText;

    svg.appendChild(textEl);
    citynames.appendChild(svg);
  }
}

export { placeCities };