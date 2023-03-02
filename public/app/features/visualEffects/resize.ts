export function lanczosCreate(lobes: number) {
  return (x: number) => {
    return lanczosCore(x, lobes);
  };
}

function lanczosCore(x: number, lobes: number) {
  if (x >= lobes || x <= -lobes) {
    return 0;
  }
  if (x === 0) {
    return 1;
  }
  x *= Math.PI;
  const xx = x / lobes;
  return ((Math.sin(x) / x) * Math.sin(xx)) / xx;
}

// lanczosFastCreate precomputes lanczos values with specific precision
function lanczosFastCreate(lobes: number) {
  const precision = 100;
  const bounds = lobes * 2 * precision;
  const results = Array<number>(bounds);
  for (let i = 0; i < bounds; i++) {
    const x = i / precision - lobes;
    results[i] = lanczosCore(x, lobes);
  }
  return (x: number) => {
    return results[Math.floor((x + lobes) * precision)];
  };
}

export const lanczosFast2 = lanczosFastCreate(2);
export const lanczosFast3 = lanczosFastCreate(3);

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

  resize(srcData: Uint8ClampedArray, oW: number, oH: number, dW: number, dH: number): ImageData {
    const scaleFactorY = dH / oH;
    const scaleFactorX = dW / oW;
    const rowSize = oW * 4;

    const lobes = this.lanczosLobes;
    // const lanczosCore = lanczosCreate(lobes);
    let lanczosCore = lanczosFast2;
    if (lobes === 3) {
      lanczosCore = lanczosFast3;
    } else {
      lanczosCore = lanczosFastCreate(lobes);
    }
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

    return destImgX;
  }
}
