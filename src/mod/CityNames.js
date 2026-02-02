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
    svg.classList.add('word');
    svg.setAttribute('xmlns', svgNS);
    svg.style.overflow = 'visible';

    const textEl = document.createElementNS(svgNS, 'text');
    textEl.setAttribute('x', x);
    textEl.setAttribute('y', y);
    textEl.textContent = wordText;

    svg.appendChild(textEl);
    citynames.appendChild(svg);
  }

  // // After elements are in the DOM we can measure them and set a valid position
  // const children = Array.from(citynames.children);
  // // place items attempting to avoid overlaps using randomized tries
  // const placedRects = [];
  // const padding = 6; // minimum space between words
  // const maxAttempts = 250; // max tries per word before placing anywhere

  // children.forEach(child => {
  //   // const cRect = child.getBoundingClientRect();
  //   // const w = cRect.width;
  //   // const h = cRect.height;
  //   // const maxLeft = Math.max(0, rect.width - w);
  //   // const maxTop = Math.max(0, rect.height - h);

  //   // let placed = false;
  //   // let attempts = 0;
  //                 // let {x,y} = projection.forward(
  //                 //   parseFloat(child.firstChild.dataset.lon) * Math.PI / 180,
  //                 //   parseFloat(child.firstChild.dataset.lat) * Math.PI / 180
  //                 // );
  //                 // let left = (x / (2 * Math.PI) + 0.5) * rect.width;;
  //                 // let top = (0.5 - y / (2 * Math.PI)) * rect.height;

  //   // left = (left / (2 * Math.PI) + 0.5) * rect.width;
  //   // top = (0.5 - top / (2 * Math.PI)) * rect.height;

  //   // while(!placed && attempts < maxAttempts){
  //   //   left = Math.round(Math.random() * maxLeft);
  //   //   top = Math.round(Math.random() * maxTop);

  //   //   const candidate = { left, top, right: left + w + padding, bottom: top + h + padding };

  //   //   // check collision against already placed rects
  //   //   const collision = placedRects.some(r => !(candidate.right < r.left || candidate.left > r.right || candidate.bottom < r.top || candidate.top > r.bottom));

  //   //   if(!collision){
  //   //     placed = true;
  //   //     placedRects.push({ left: candidate.left - padding/2, top: candidate.top - padding/2, right: candidate.right + padding/2, bottom: candidate.bottom + padding/2 });
  //   //   }

  //   //   attempts++;
  //   // }

  //   // // If we failed to find a non-overlapping spot, place it with clamping
  //   // if(!placed){
  //   //   left = Math.round(Math.random() * maxLeft);
  //   //   top = Math.round(Math.random() * maxTop);
  //   // }

  //   // child.style.left = left + 'px';
  //   // child.style.top = top + 'px';

  //   // no background — SVG <text> handles fill and stroke
  //   child.style.background = 'transparent';
  // });
}

export { placeCities };