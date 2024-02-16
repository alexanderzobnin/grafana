export interface CanvasEffectOptions {
  debug?: boolean;
  showDefinitionImage?: boolean;
  onAnimationCancel?: () => void;
}

interface DebugInfo {
  fps: number;
}

export class CanvasEffect {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  animationFrameHandle: number;
  canvasWidth: number;
  canvasHeight: number;
  lastTime: number;
  lastDebugTime: number;
  debug: boolean;
  debugInfo: DebugInfo;
  showDefinitionImage?: boolean;

  constructor(canvas: HTMLCanvasElement, options: CanvasEffectOptions) {
    const { debug, showDefinitionImage } = options;
    this.canvasWidth = canvas.width;
    this.canvasHeight = canvas.height;
    this.animationFrameHandle = 0;
    this.lastTime = 0;
    this.lastDebugTime = 0;
    this.debug = !!debug;
    this.debugInfo = { fps: 0 };
    this.showDefinitionImage = showDefinitionImage;

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  startAnimation() {}

  onAnimationCancel() {}

  cancelAnimation() {
    cancelAnimationFrame(this.animationFrameHandle);
    if (this.onAnimationCancel) {
      this.onAnimationCancel();
    }
  }
}
