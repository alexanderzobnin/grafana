import { scanlineMagnitude } from './utils';

function lanczosCreate(lobes: number) {
  return (x: number) => {
    if (x >= lobes || x <= -lobes) {
      return 0;
    }
    if (x < 1.1920929e-7 && x > -1.1920929e-7) {
      return 1.0;
    }
    // if (x === 0) {
    //   return 1;
    // }
    // if (x >= lobes || x <= -lobes) {
    //   return 0;
    // }
    x *= Math.PI;
    const xx = x / lobes;
    return ((Math.sin(x) / x) * Math.sin(xx)) / xx;
  };
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

  resizeVH(srcData: Uint8ClampedArray, oW: number, oH: number, dW: number, dH: number): ImageData {
    const scaleFactorY = dH / oH;
    const scaleFactorX = dW / oW;
    const rowSize = oW * 4;

    const lobes = this.lanczosLobes;
    const lanczosCore = lanczosCreate(lobes);
    let windowRadius = Math.ceil(lobes / scaleFactorY / 2);

    const destImgY = new ImageData(oW, dH);
    const destDataY = destImgY.data;

    // Go through rows
    let i = 0;
    let destIdx = 0;
    while (i < dH) {
      // center is a point in a scaled image, it's basically x coordinate of lanczos interpolation formula
      const center = (i + 0.5) / scaleFactorY - 0.5;
      const windowStart = Math.max(Math.floor(center - windowRadius), 0);
      const windowEnd = Math.min(Math.floor(center + windowRadius), oH);
      for (let j = 0; j < rowSize; j++) {
        let newColor = 0;
        let colorWeight = 0;
        let density = 0;
        for (let k = windowStart; k <= windowEnd; k++) {
          const idxNormalized = center - k;
          colorWeight = lanczosCore(idxNormalized);
          density += colorWeight;
          newColor += srcData[rowSize * k + j] * colorWeight;
        }
        newColor = Math.round(newColor);
        destDataY[destIdx] = newColor / density;
        destIdx++;
      }
      i++;
    }

    // Go through columns
    const destImgX = new ImageData(dW, dH);
    const destDataX = destImgX.data;
    const rowSizeX = dW * 4;
    windowRadius = Math.ceil(lobes / scaleFactorX / 2);
    i = 0;
    destIdx = 0;
    let colorWeight = 0;
    // i is a column
    while (i < dW) {
      // center is a point in a scaled image, it's basically x coordinate of lanczos interpolation formula
      const center = (i + 0.5) / scaleFactorX - 0.5;
      const windowStart = Math.max(Math.floor(center - windowRadius), 0);
      const windowEnd = Math.min(Math.floor(center + windowRadius), oW);
      // j is a row
      for (let j = 0; j < dH; j++) {
        for (let colorIdx = 0; colorIdx < 4; colorIdx++) {
          let newColor = 0;
          let density = 0;
          for (let k = windowStart; k <= windowEnd; k++) {
            const idxNormalized = center - k;
            colorWeight = lanczosCore(idxNormalized);
            density += colorWeight;
            newColor += destDataY[j * rowSize + k * 4 + colorIdx] * colorWeight;
          }
          newColor = Math.round(newColor);
          destDataX[j * rowSizeX + i * 4 + colorIdx] = newColor / density;
        }
      }
      i++;
    }

    // const resized = new Uint8ClampedArray(resizedColumns);
    return destImgX;
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
    const lanczos = lanczosCreate(this.lanczosLobes);
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
      let dXY: number;

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
            dXY = Math.sqrt(Math.pow(fX * rcpRatioX, 2) + Math.pow(fY * rcpRatioY, 2)) / 1000;
            weight = lanczos(dXY);
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

  // const destWidth = Math.floor(width / resizeFactor);

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
function convertGamma(newColor: number, arg1: number): number {
  throw new Error('Function not implemented.');
}
