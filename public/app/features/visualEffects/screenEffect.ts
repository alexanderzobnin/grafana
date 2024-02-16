import { CanvasEffect, CanvasEffectOptions } from './canvasEffect';
import { LanczosFilter, nearestNeighborResize } from './resize';
import { applyPixelMask, applyScanLines, convertImageGamma } from './utils';

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

    // const initialImage = ctx?.getImageData(0, 0, canvasWidth, canvasHeight);

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
    const intermediateHeight = 400;
    const scanLinesCount = Math.ceil(image.height / intermediateHeight) * intermediateHeight;
    const reScaleFactor = scanLinesCount / image.height;
    const reScaleHeight = scanLinesCount;
    const reScaleWidth = Math.floor(image.width * reScaleFactor);
    // const intermediateWidth = Math.floor(image.width * scaleFactor);

    const numHorizPixels = 640;
    const numVertPixels = intermediateHeight;
    const CellWidth0 = 2,
      CellBlank0 = 1; // R
    const CellWidth1 = 2,
      CellBlank1 = 1; // G
    const CellWidth2 = 2,
      CellBlank2 = 2; // B
    const totalHorizRes =
      numHorizPixels * (CellWidth0 + CellBlank0 + CellWidth1 + CellBlank1 + CellWidth2 + CellBlank2);

    const cellHeight0 = 5; // Height of RGB triplet
    const cellHeight1 = 1; // Blank after RGB triplet
    // const cellStagger = 3; // Offset of successive columns
    const totalVertRes = numVertPixels * (cellHeight0 + cellHeight1);
    console.log(totalVertRes);

    const lanczos = new LanczosFilter(2);
    const startTs = performance.now();
    let resizedImage = lanczos.resize(image, reScaleWidth, reScaleHeight);

    console.log(`Resize time: ${Math.floor(performance.now() - startTs)} ms`);
    console.log(resizedImage.width, resizedImage.height, resizedImage.data.length);

    convertImageGamma(resizedImage, 2);

    const startTsNNResize = performance.now();
    resizedImage = nearestNeighborResize(resizedImage, totalHorizRes, totalVertRes);
    console.log(resizedImage.width, resizedImage.height, resizedImage.data.length);
    console.log(`NN resize time: ${Math.floor(performance.now() - startTsNNResize)} ms`);

    resizedImage = applyScanLines(resizedImage, scanLinesCount);
    resizedImage = applyPixelMask(resizedImage, CellWidth0, cellHeight0, CellBlank0, CellBlank0);

    // resizedImage = lanczos.resize(resizedImage, image.width, image.height);

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
