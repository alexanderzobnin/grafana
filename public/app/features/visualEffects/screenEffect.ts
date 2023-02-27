import { CanvasEffect, CanvasEffectOptions } from './canvasEffect';
import { getImageDefinition, getDefinitionPoint, setDefinitionPoint, gaussianRandom } from './utils';

export interface CanvasEffectScreenOptions extends CanvasEffectOptions {
  cellSize: number;
}

export class CanvasEffectScreen extends CanvasEffect {
  cellSize: number;
  cells: number[][];

  constructor(canvas: HTMLCanvasElement, options: CanvasEffectScreenOptions) {
    const { onAnimationCancel, debug } = options;
    super(canvas, { onAnimationCancel, debug });

    const { cellSize } = options;
    this.cellSize = cellSize;
    this.cells = [];
  }

  startAnimation() {
    this.applyAnimation(this.canvas);
  }

  applyAnimation(canvas: HTMLCanvasElement) {
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const cellSize = this.cellSize;
    const intermediateWidth = 640;
    const intermediateHeight = 480;

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    const initialImage = ctx?.getImageData(0, 0, canvasWidth, canvasHeight);

    // const definition = getImageDefinition(initialImage);
    // const defImageData = definitionToImageData(definition, initialImage.width);
    // const initialDefSize = definition.reduce((acc, curr) => acc + curr, 0);

    let image = ctx?.getImageData(0, 0, canvasWidth, canvasHeight);
    const resizedImageData = resizeImage(image.data, image.width, image.height, intermediateHeight);
    const resizedImageWidth = resizedImageData.length / 4 / intermediateHeight;
    const resizedImage = new ImageData(resizedImageData, resizedImageWidth);
    console.log(resizedImage.width, resizedImage.height, resizedImage.data.length);
    ctx.putImageData(resizedImage, 0, 0);

    // const width = image.width;
    // const height = image.height;
    // ctx.clearRect(0, 0, image.width, image.height);
    // ctx.fillStyle = 'rgb(0, 0, 0)';
    // ctx.fillRect(0, 0, image.width, image.height);
    // let yShift = 0;

    // for (let i = 0; i < height; i += cellSize) {
    //   for (let j = 0; j < width; j += cellSize) {
    //     const cellPixels = getCellPixels(image.data, width, height, cellSize, j, i);
    //     const p = getAverageColor(cellPixels);
    //     this.cells.push([...p, j, i]);

    //     ctx.fillStyle = `rgb(${p[0]}, ${p[1]}, ${p[2]})`;
    //     ctx.fillRect(j, i, cellSize, cellSize);

    //     const modifier = (Math.random() + 10) / 10;
    //     // const pixelWidth = Math.floor(cellSize / 3);
    //     const pixelWidth = 1;
    //     const bloom = 600 / 255;
    //     const alphaNorm = Math.min((p[3] / 255) * bloom, 255);
    //     yShift = yShift === 0 ? 1 : 0;

    //     // ctx.fillStyle = `rgb(${p[0] * alphaNorm * modifier * bloom}, 0, 0)`;
    //     // ctx.fillRect(j, i + yShift, pixelWidth, cellSize - 1);
    //     // ctx.fillStyle = `rgb(0, ${p[1] * alphaNorm * modifier * bloom}, 0)`;
    //     // ctx.fillRect(j + 2, i + yShift, pixelWidth, cellSize - 1);
    //     // ctx.fillStyle = `rgb(0, 0, ${p[2] * alphaNorm * modifier * bloom})`;
    //     // ctx.fillRect(j + 4, i + yShift, pixelWidth, cellSize - 1);

    //     const lightCoef = 1.5;
    //     const darkCoef = 0.5;
    //     const darkCoef2 = darkCoef * darkCoef;

    //     // ctx.beginPath();
    //     // ctx.strokeStyle = `rgba(${p[0] * darkCoef2},${p[1] * darkCoef2},${p[2] * darkCoef2},${p[3] * darkCoef2})`;
    //     // // ctx.arc(j, i, cellSize / 2, 0, 2 * Math.PI);
    //     // // ctx.fill();
    //     // ctx.moveTo(j, i);
    //     // ctx.lineTo(j + cellSize - 1, i);
    //     // ctx.lineTo(j + cellSize - 1, i + cellSize - 1);
    //     // ctx.stroke();

    //     // ctx.strokeStyle = `rgba(${p[0] * darkCoef},${p[1] * darkCoef},${p[2] * darkCoef},${p[3] * darkCoef})`;
    //     // ctx.beginPath();
    //     // ctx.moveTo(j + cellSize - 1, i + cellSize - 1);
    //     // ctx.lineTo(j, i + cellSize - 1);
    //     // ctx.lineTo(j, i);
    //     // ctx.stroke();

    //     // ctx.fillStyle = `rgba(${p[0] * darkCoef},${p[1] * darkCoef},${p[2] * darkCoef},${p[3] * darkCoef})`;
    //     // ctx.fillRect(j, i, 1, 1);
    //     // ctx.fillStyle = `rgba(${p[0] * 1.5},${p[1] * 1.5},${p[2] * 1.5},${p[3] * 1.5})`;
    //     // ctx.fillRect(j + cellSize - 1, i, 1, 1);
    //     // ctx.fillStyle = `rgba(${p[0] * 1.5},${p[1] * 1.5},${p[2] * 1.5},${p[3] * 1.5})`;
    //     // ctx.fillRect(j, i + cellSize - 1, 1, 1);
    //     // ctx.fillStyle = `rgba(${p[0] * 1.5},${p[1] * 1.5},${p[2] * 1.5},${p[3] * 1.5})`;
    //     // ctx.fillRect(j + cellSize - 1, i + cellSize - 1, 1, 1);
    //   }
    // }

    // for (let i = 0; i < cells.length; i++) {
    //   const p = cells[i];
    //   const y = Math.floor((i / width) * 4);
    //   const x = (i - (width / 4) * y) * 4;
    //   ctx.fillStyle = `rgba(${p[0]},${p[1]},${p[2]},${p[3]})`;
    //   ctx.fillRect(x, y, cellSize, cellSize);
    // }

    // this.animationFrame(0, ctx, image);
  }

  animationFrame(ts: number, ctx: CanvasRenderingContext2D | null, image: ImageData) {
    const cellSize = this.cellSize;
    const deltaTime = ts - this.lastTime;
    this.lastTime = ts;
    if (this.debug) {
      console.log(Math.floor(1000 / deltaTime), deltaTime);
    }
    ctx?.clearRect(0, 0, image.width, image.height);

    // const defImageData = definitionToImageData(definition, image.width);
    // ctx?.putImageData(defImageData, 0, 0);
    if (ctx) {
      for (let i = 0; i < this.cells.length; i++) {
        const p = this.cells[i];
        const x = p[4];
        const y = p[5];
        const modifier = (Math.random() + 10) / 10;
        const pixelWidth = Math.floor(cellSize / 3);
        ctx.fillStyle = `rgba(${p[0] * modifier}, 0, 0, ${p[3]})`;
        ctx.fillRect(x, y, pixelWidth, cellSize - 1);
        ctx.fillStyle = `rgba(0, ${p[1] * modifier}, 0, ${p[3]})`;
        ctx.fillRect(x + 1, y, pixelWidth, cellSize - 1);
        ctx.fillStyle = `rgba(0, 0, ${p[2] * modifier}, ${p[3]})`;
        ctx.fillRect(x + 2, y, pixelWidth, cellSize - 1);
      }
    }

    this.animationFrameHandle = requestAnimationFrame((ts) => this.animationFrame(ts, ctx, image));
  }
}

function getAverageColor(pixels: number[][]): number[] {
  const avg = [0, 0, 0, 0];
  for (let i = 0; i < pixels.length; i++) {
    for (let j = 0; j < 4; j++) {
      avg[j] += pixels[i][j];
    }
  }
  for (let j = 0; j < 4; j++) {
    avg[j] = Math.round(avg[j] / pixels.length);
  }
  return avg;
}

function getCellPixels(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  cellSize: number,
  x: number,
  y: number
): number[][] {
  const cellWidthX = Math.min(cellSize, width - x);
  const cellWidthY = Math.min(cellSize, height - y);

  const pixels: number[][] = [];
  for (let i = 0; i < cellWidthX; i++) {
    for (let j = 0; j < cellWidthY; j++) {
      const redIdx = width * 4 * (y + i) + (x + j) * 4;
      const red = imageData[redIdx];
      const green = imageData[redIdx + 1];
      const blue = imageData[redIdx + 2];
      const alpha = imageData[redIdx + 3];
      pixels.push([red, green, blue, alpha]);
    }
  }
  return pixels;
}

function resizeImage(
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
      resizedData.push(newColor);
    }
    iRow += resizeFactor;
    i = Math.floor(iRow) * rowSize;
  }

  console.log(resizedData.length / destHeight / 4);
  console.log(width);
  console.log(resizedData.length / width / 4);
  // Go through columns
  const resizedColumns: number[] = [];
  for (let j = 0; j < resizedData.length; j += rowSize) {
    let iCol = 0;
    i = 0;
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
        resizedColumns.push(newColor);
      }
      iCol += resizeFactor;
      i = Math.floor(iCol) * 4;
    }
  }

  const resized = new Uint8ClampedArray(resizedColumns);
  return resized;
}
