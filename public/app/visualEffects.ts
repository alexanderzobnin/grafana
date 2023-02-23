type Particle = [number, number, number, string];

export async function initVisualEffects() {
  window.addEventListener('load', (e) => onLoad(e));
}

async function onLoad(e: Event) {
  console.log('Start animations');
  const canvasList = await waitForCanvasLoaded();
  console.log(canvasList);
  if (canvasList?.length) {
    for (let i = 0; i < canvasList.length; i++) {
      const canvas = canvasList[i];
      applyAnimation(canvas);
    }
  }
}

async function waitForCanvasLoaded() {
  let canvasList: HTMLCollectionOf<HTMLCanvasElement> | null = null;
  for (let i = 0; i < 10; i++) {
    const elements = document.getElementsByTagName('canvas');
    if (elements.length) {
      canvasList = elements;
      return canvasList;
    } else {
      await asyncTimeout(1000);
    }
  }

  return canvasList;
}

function applyAnimation(canvas: HTMLCanvasElement) {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const cellSize = 8;
  const particlesNum = 6000;
  const speed = 3;
  const wind = 0.05;
  let lastTime = 0;
  let animationFrameHandle = 0;

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return;
  }

  // console.log('Canvas', ctx);
  const initialImage = ctx?.getImageData(0, 0, canvasWidth, canvasHeight);
  console.log(initialImage);
  const width = initialImage.width;
  const height = initialImage.height;
  const definition = getImageDefinition(initialImage);
  const defImageData = definitionToImageData(definition, initialImage.width);
  const initialDefSize = definition.reduce((acc, curr) => acc + curr, 0);

  const particles: Array<Particle | null> = [];
  for (let i = 0; i < particlesNum; i++) {
    particles.push(null);
  }

  let stoppedParticles: Array<[number, number]> = [];
  let stoppedParticlesCount = 0;
  let image = ctx?.getImageData(0, 0, canvasWidth, canvasHeight);

  function animationFrame(ts: number, image: ImageData) {
    const deltaTime = ts - lastTime;
    lastTime = ts;
    // console.log(deltaTime);
    // const ctx = canvas.getContext('2d');

    // const defImageData = definitionToImageData(definition, image.width);
    // ctx?.putImageData(defImageData, 0, 0);

    // Generate new particles
    for (let i = 0; i < particles.length; i++) {
      if (particles[i] == null) {
        if (Math.random() >= 0.9) {
          particles[i] = makeParticle(width, height, speed);
          // break;
        }
      }
    }

    if (stoppedParticles.length > 100000) {
      cancelAnimationFrame(animationFrameHandle);
      return;
    }

    if (ctx) {
      stoppedParticlesCount += stoppedParticles.length;
      for (let i = 0; i < stoppedParticles.length; i++) {
        // ctx.fillStyle = 'rgba(240, 240, 250, 255)';
        // ctx.fillRect(stoppedParticles[i][0], stoppedParticles[i][1], 1, 1);
        const redIndex = (stoppedParticles[i][1] * width + stoppedParticles[i][0]) * 4;
        let rg = 240;
        const colorChance = Math.random();
        rg = 240 + colorChance * 10;
        image.data[redIndex] = rg;
        image.data[redIndex + 1] = rg;
        image.data[redIndex + 2] = 250;
        image.data[redIndex + 3] = 255;
      }
      stoppedParticles = [];
    }
    ctx?.putImageData(image, 0, 0);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (ctx && p) {
        // ctx.fillStyle = 'rgba(240, 240, 250, 1)';
        const pX = Math.floor(p[0]);
        const pY = Math.floor(p[1]);

        ctx.fillStyle = p[3];
        ctx.fillRect(pX, pY, 1, 1);

        const defPoint = getDefinitionPoint(definition, width, p[0], p[1] + 1);
        const pointOnLeft = getDefinitionPoint(definition, width, p[0] - 1, p[1] + 1);
        const pointOnRight = getDefinitionPoint(definition, width, p[0] + 1, p[1] + 1);
        const chanceToStick = Math.random() * (pointOnLeft + pointOnRight - 0.905);
        if (defPoint === 1 && chanceToStick > 0.91) {
          // stop particle
          setDefinitionPoint(definition, width, pX, pY, 1);
          stoppedParticles.push([pX, pY]);
          particles[i] = null;
        } else if (p[1] < canvasHeight - 1) {
          p[0] += (Math.random() - 0.5) * 0.5 * p[2] + wind * p[2] * p[2];
          p[1] += p[2];
        } else {
          if (Math.random() > 0) {
            setDefinitionPoint(definition, width, pX, pY, 1);
            stoppedParticles.push([pX, pY]);
            particles[i] = null;
          } else {
            // Remove when reached bottom line
            stoppedParticles.push([pX, pY]);
            particles[i] = null;
          }
        }
      }
    }

    animationFrameHandle = requestAnimationFrame((ts) => animationFrame(ts, image));
  }
  animationFrame(0, image);
}

function makeParticle(width: number, height: number, speed: number): Particle {
  const velocityRatio = Math.random();
  const velocity = (velocityRatio + 0.5) * speed;
  const alpha = velocityRatio + 0.1;
  const color = `rgba(240, 240, 250, ${alpha > 1 ? 1 : alpha})`;
  const x = Math.ceil(Math.random() * width);
  const y = x < 10 ? Math.random() * height : 0;
  return [x, y, velocity, color];
}

function getImageDefinition(imageData: ImageData): number[] {
  const definition: number[] = [];
  for (let i = 0; i < imageData.data.length; i += 4) {
    const hsla = rgbToHsla([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2], imageData.data[i + 3]]);
    if ((hsla[1] > 0.25 && hsla[2] * hsla[3] > 0.25) || hsla[3] > 0.9) {
      definition.push(1);
    } else {
      definition.push(0);
    }
  }
  return definition;
}

function getDefinitionPoint(definition: number[], width: number, x: number, y: number): number {
  return definition[width * Math.floor(y) + Math.floor(x)];
}

function setDefinitionPoint(definition: number[], width: number, x: number, y: number, value: number) {
  definition[width * Math.floor(y) + Math.floor(x)] = value;
}

function definitionToImageData(definition: number[], width: number): ImageData {
  const data = [];
  for (let i = 0; i < definition.length; i++) {
    const p = definition[i];
    data.push(p * 255, p * 255, p * 255, 255);
  }
  const dataArray = new Uint8ClampedArray(data);
  return new ImageData(dataArray, width);
}

function rgbToHsla(rgb: [number, number, number, number]): [number, number, number, number] {
  if (rgb[0] === 0 && rgb[1] === 0 && rgb[2] === 0) {
    return [0, 0, 0, 0];
  }

  // console.log(rgb);
  const depthRatio = 1 / 255;
  const rgbNormalized = [rgb[0] * depthRatio, rgb[1] * depthRatio, rgb[2] * depthRatio];
  const alpha = rgb[3] * depthRatio;
  const minRgb = Math.min(...rgbNormalized);
  const maxRgb = Math.max(...rgbNormalized);
  const luminace = (minRgb + maxRgb) * 0.5;

  let saturation = 0;
  if (minRgb !== maxRgb) {
    if (luminace <= 0.5) {
      saturation = (maxRgb - minRgb) / (maxRgb + minRgb);
    } else {
      saturation = (maxRgb - minRgb) / (2 - maxRgb - minRgb);
    }
  }

  let hue = 0;
  if (minRgb !== maxRgb) {
    // Red
    if (maxRgb === rgbNormalized[0]) {
      // (G-B)/(max-min)
      hue = (rgbNormalized[1] - rgbNormalized[2]) / (maxRgb - minRgb);
    }
    // Green
    if (maxRgb === rgbNormalized[1]) {
      // 2 + (B-R)/(max-min)
      hue = 2 + (rgbNormalized[2] - rgbNormalized[0]) / (maxRgb - minRgb);
    }
    // Blue
    if (maxRgb === rgbNormalized[2]) {
      // 4 + (R-G)/(max-min)
      hue = 4 + (rgbNormalized[0] - rgbNormalized[1]) / (maxRgb - minRgb);
    }
  }
  // to degrees
  hue *= 60;
  hue = hue < 0 ? hue + 360 : hue;
  return [hue, saturation, luminace, alpha];
}

// function _animationFrame(canvas: HTMLCanvasElement, image: ImageData) {
//   const ctx = canvas.getContext('2d');
//   ctx?.putImageData(image, 0, 0);
//   if (ctx) {
//     ctx.fillStyle = 'rgba(0, 0, 200, 0.5)';
//     ctx.fillRect(30, 30, 50, 50);
//   }
//   requestAnimationFrame(() => _animationFrame(canvas, image));
// }

// const getColorIndicesForCoord = (x: number, y: number, width: number) => {
//   const red = y * (width * 4) + x * 4;
//   return [red, red + 1, red + 2, red + 3];
// };

const asyncTimeout = (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};
