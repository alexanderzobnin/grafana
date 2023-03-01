import { CanvasEffect, CanvasEffectOptions } from './canvasEffect';
import { LanczosFilter } from './resize';

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
    // const cellSize = this.cellSize;

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    const initialImage = ctx?.getImageData(0, 0, canvasWidth, canvasHeight);

    // const definition = getImageDefinition(initialImage);
    // const defImageData = definitionToImageData(definition, initialImage.width);
    // const initialDefSize = definition.reduce((acc, curr) => acc + curr, 0);

    let image = ctx?.getImageData(0, 0, canvasWidth, canvasHeight);
    const crtImage = this.crtFilter(image);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.putImageData(crtImage, 0, 0);

    // this.animationFrame(0, ctx, image);
  }

  crtFilter(image: ImageData): ImageData {
    // 640x480
    const intermediateHeight = 480;
    const scanLinesCount = Math.ceil(image.height / intermediateHeight) * intermediateHeight;
    const reScaleFactor = scanLinesCount / image.height;
    const reScaleHeight = scanLinesCount;
    const reScaleWidth = Math.floor(image.width * reScaleFactor);
    // const intermediateWidth = Math.floor(image.width * scaleFactor);

    const lanczos = new LanczosFilter(2);
    const startTs = performance.now();
    // const resizedImage = lanczos.resize(
    //   image.data,
    //   image.width,
    //   image.height,
    //   Math.floor(image.width * 1.1),
    //   Math.floor(image.height * 1.1)
    // );
    const resizedImage = lanczos.resizeVH(image.data, image.width, image.height, reScaleWidth, reScaleHeight);
    console.log(`Resize time: ${Math.floor(performance.now() - startTs)} ms`);
    console.log(resizedImage.width, resizedImage.height, resizedImage.data.length);
    // convertImageGamma(resizedImage, 2);
    console.log(`Total time: ${Math.floor(performance.now() - startTs)} ms`);

    return resizedImage;
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
