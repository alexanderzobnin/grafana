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

export class LanczosFilter {
  lanczosLobes: number;
  scaleX: number;
  scaleY: number;
  rcpScaleX: number;
  rcpScaleY: number;

  constructor(lanczosLobes = 3) {
    this.lanczosLobes = lanczosLobes;
    this.scaleX = 1;
    this.scaleY = 1;
    this.rcpScaleX = 1 / this.scaleX;
    this.rcpScaleY = 1 / this.scaleY;
  }

  lanczosCreate(lobes: number) {
    return (x: number) => {
      if (x >= lobes || x <= -lobes) {
        return 0.0;
      }
      if (x < 1.1920929e-7 && x > -1.1920929e-7) {
        return 1.0;
      }
      x *= Math.PI;
      const xx = x / lobes;
      return ((Math.sin(x) / x) * Math.sin(xx)) / xx;
    };
  }

  // Implementation from fabric.js
  // https://github.com/fabricjs/fabric.js/blob/master/src/filters/Resize.ts
  resize(srcData: Uint8ClampedArray, oW: number, oH: number, dW: number, dH: number) {
    const scaleX = dW / oW;
    const scaleY = dH / oH;
    this.rcpScaleX = 1 / scaleX;
    this.rcpScaleY = 1 / scaleY;

    const destImg = new ImageData(dW, dH);
    const destData = destImg.data;
    const lanczos = this.lanczosCreate(this.lanczosLobes);
    const ratioX = this.rcpScaleX;
    const ratioY = this.rcpScaleY;
    const rcpRatioX = 2 / this.rcpScaleX;
    const rcpRatioY = 2 / this.rcpScaleY;
    const range2X = Math.ceil((ratioX * this.lanczosLobes) / 2);
    const range2Y = Math.ceil((ratioY * this.lanczosLobes) / 2);
    const center: { x?: number; y?: number } = {};
    const icenter: { x?: number; y?: number } = {};

    for (let u = 0; u < dW; u++) {
      let v: number;
      let i: number;
      let weight: number;
      let idx: number;
      let a: number;
      let red: number;
      let green: number;
      let blue: number;
      let alpha: number;
      let fX: number;
      let fY: number;

      center.x = (u + 0.5) * ratioX;
      icenter.x = Math.floor(center.x);

      for (v = 0; v < dH; v++) {
        center.y = (v + 0.5) * ratioY;
        icenter.y = Math.floor(center.y);
        a = 0;
        red = 0;
        green = 0;
        blue = 0;
        alpha = 0;
        for (i = icenter.x - range2X; i <= icenter.x + range2X; i++) {
          if (i < 0 || i >= oW) {
            continue;
          }
          fX = Math.floor(1000 * Math.abs(i - center.x));
          for (let j = icenter.y - range2Y; j <= icenter.y + range2Y; j++) {
            if (j < 0 || j >= oH) {
              continue;
            }
            fY = Math.floor(1000 * Math.abs(j - center.y));
            weight = lanczos(Math.sqrt(Math.pow(fX * rcpRatioX, 2) + Math.pow(fY * rcpRatioY, 2)) / 1000);
            if (weight > 0) {
              idx = (j * oW + i) * 4;
              a += weight;
              red += weight * srcData[idx];
              green += weight * srcData[idx + 1];
              blue += weight * srcData[idx + 2];
              alpha += weight * srcData[idx + 3];
            }
          }
        }
        idx = (v * dW + u) * 4;
        destData[idx] = red / a;
        destData[idx + 1] = green / a;
        destData[idx + 2] = blue / a;
        destData[idx + 3] = alpha / a;
      }
    }

    return destImg;
  }
}

export function resizeImageSimple(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  destHeight: number
): Uint8ClampedArray {
  const resizedData: number[] = [];
  const resizeFactor = height / destHeight;
  const resizeFactorFloor = Math.floor(resizeFactor);
  const cellSize = Math.ceil(resizeFactor);
  const rowSize = width * 4;
  if (resizeFactor <= 1) {
    return imageData;
  }

  const destWidth = Math.floor(width / resizeFactor);

  // Go through rows
  let iRow = 0;
  let i = 0;
  while (iRow < imageData.length / rowSize - resizeFactorFloor) {
    for (let j = 0; j < rowSize; j++) {
      let newColor = 0;
      for (let k = 0; k < cellSize; k++) {
        let colorWeight = 1;
        if (k > resizeFactorFloor) {
          colorWeight = resizeFactor - resizeFactorFloor;
        }
        newColor += imageData[i + rowSize * k + j] * colorWeight;
      }
      newColor = Math.round(newColor / cellSize);
      resizedData.push(newColor);
    }
    iRow += resizeFactor;
    i = Math.floor(iRow) * rowSize;
  }

  // Go through columns
  const resizedColumns: number[] = [];
  let rowIdx = 0;
  for (let j = 0; j < resizedData.length; j += rowSize) {
    let iCol = 0;
    i = 0;
    const magnitude = scanlineMagnitude(rowIdx);
    console.log(magnitude);
    while (i < rowSize - resizeFactorFloor * cellSize * 4) {
      for (let colorIdx = 0; colorIdx < 4; colorIdx++) {
        let newColor = 0;
        for (let k = 0; k < cellSize; k++) {
          let colorWeight = 1;
          if (k > resizeFactorFloor) {
            colorWeight = resizeFactor - resizeFactorFloor;
          }
          newColor += resizedData[j + i + k * 4 + colorIdx] * colorWeight;
        }
        newColor = Math.round(newColor / cellSize);
        newColor = convertGamma(newColor, 2);

        newColor = magnitude * newColor;
        resizedColumns.push(newColor);
      }
      iCol += resizeFactor;
      i = Math.floor(iCol) * 4;
    }
    rowIdx++;
  }

  const resized = new Uint8ClampedArray(resizedColumns);
  return resized;
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
