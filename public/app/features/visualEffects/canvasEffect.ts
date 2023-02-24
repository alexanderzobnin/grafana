export interface CanvasEffectOptions {
  debug?: boolean;
  onAnimationCancel?: () => void;
}

export class CanvasEffect {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  animationFrameHandle: number;
  canvasWidth: number;
  canvasHeight: number;
  lastTime: number;
  debug: boolean;

  onAnimationCancel?: () => void;

  constructor(canvas: HTMLCanvasElement, options: CanvasEffectOptions) {
    const { onAnimationCancel, debug } = options;
    this.canvasWidth = canvas.width;
    this.canvasHeight = canvas.height;
    this.animationFrameHandle = 0;
    this.onAnimationCancel = onAnimationCancel;
    this.lastTime = 0;
    this.debug = !!debug;

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  startAnimation() {}

  cancelAnimation() {
    cancelAnimationFrame(this.animationFrameHandle);
    if (this.onAnimationCancel) {
      this.onAnimationCancel();
    }
  }
}
