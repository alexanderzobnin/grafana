export function getImageDefinition(imageData: ImageData): number[] {
  const definition: number[] = [];
  for (let i = 0; i < imageData.data.length; i += 4) {
    const hsla = rgbaToHsla([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2], imageData.data[i + 3]]);
    if ((hsla[1] > 0.25 && hsla[2] * hsla[3] > 0.25) || hsla[3] > 0.9) {
      definition.push(1);
    } else {
      definition.push(0);
    }
  }
  return definition;
}

export function getDefinitionPoint(definition: number[], width: number, x: number, y: number): number {
  return definition[width * Math.floor(y) + Math.floor(x)];
}

export function setDefinitionPoint(definition: number[], width: number, x: number, y: number, value: number) {
  definition[width * Math.floor(y) + Math.floor(x)] = value;
}

export function definitionToImageData(definition: number[], width: number): ImageData {
  const data = [];
  for (let i = 0; i < definition.length; i++) {
    const p = definition[i];
    data.push(p * 255, p * 255, p * 255, 255);
  }
  const dataArray = new Uint8ClampedArray(data);
  return new ImageData(dataArray, width);
}

export function rgbaToHsla(rgb: [number, number, number, number]): [number, number, number, number] {
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

// Standard Normal variate using Box-Muller transform.
export function gaussianRandom(): number {
  const u = 1 - Math.random(); //Converting [0,1) to (0,1)
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  // Resample if out of range
  return z >= 0 && z <= 1 ? z : gaussianRandom();
}

export function convertImageGamma(imageData: ImageData, gamma: number) {
  for (let i = 0; i < imageData.data.length; i++) {
    imageData.data[i] = convertGamma(imageData.data[i], gamma);
  }
  return imageData;
}

// Converting into linear colors (invert gamma correction)
function convertGamma(v: number, gamma: number) {
  return Math.pow(v / 255, 1 / gamma) * 255;
}

export function scanlineMagnitude(n: number) {
  const c = 0.3;
  return Math.exp(-(((n - 0.5) * (n - 0.5)) / (2 * c * c)));
}
