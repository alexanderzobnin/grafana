import { CanvasEffect, CanvasEffectOptions } from './canvasEffect';
import {
  getImageDefinition,
  getDefinitionPoint,
  setDefinitionPoint,
  gaussianRandom,
  definitionToImageData,
} from './utils';

interface Particle {
  x: number;
  y: number;
  z: number;
  velocity: number;
  color: string;
  rand: number;
}

export interface CanvasEffectSnowOptions extends CanvasEffectOptions {
  particlesNumber: number;
  speed: number;
  wind: number;
}

export class CanvasEffectSnow extends CanvasEffect {
  private particlesNum: number;
  private speed: number;
  private wind: number;

  constructor(canvas: HTMLCanvasElement, options: CanvasEffectSnowOptions) {
    const { debug, showDefinitionImage } = options;
    super(canvas, { debug, showDefinitionImage });

    const { particlesNumber, speed, wind } = options;
    this.particlesNum = particlesNumber || 6000;
    this.speed = speed || 3;
    this.wind = wind || 0.5;
  }

  startAnimation() {
    this.applyAnimation(this.canvas);
  }

  onAnimationCancel() {
    console.log('cancel animation');
  }

  applyAnimation(canvas: HTMLCanvasElement) {
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const particlesNum = this.particlesNum;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return;
    }

    const initialImage = ctx?.getImageData(0, 0, canvasWidth, canvasHeight);

    const definition = getImageDefinition(initialImage);
    if (this.showDefinitionImage) {
      // Show definition image
      const defImageData = definitionToImageData(definition, initialImage.width);
      ctx?.putImageData(defImageData, 0, 0);
      // const initialDefSize = definition.reduce((acc, curr) => acc + curr, 0);
    }

    const particles: Array<Particle | null> = [];
    for (let i = 0; i < particlesNum; i++) {
      particles.push(null);
    }

    let stoppedParticles: Array<[number, number, number]> = [];
    let image = ctx?.getImageData(0, 0, canvasWidth, canvasHeight);

    this.animationFrame(0, ctx, image, definition, particles, stoppedParticles);
  }

  animationFrame(
    ts: number,
    ctx: CanvasRenderingContext2D | null,
    image: ImageData,
    definition: number[],
    particles: Array<Particle | null>,
    stoppedParticles: Array<[number, number, number]>
  ) {
    if (!ctx) {
      return;
    }

    const width = image.width;
    const height = image.height;
    const speed = this.speed;
    const wind = this.wind;

    const deltaTime = ts - this.lastTime;
    this.lastTime = ts;

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

    // Put stopped particles into the image and reset buffer
    for (let i = 0; i < stoppedParticles.length; i++) {
      const p = stoppedParticles[i];
      const yRel = p[1] / this.canvasHeight;
      const redIndex = (p[1] * width + p[0]) * 4;
      let rg = 240;
      const colorChance = Math.random();
      rg = 240 + colorChance * 10 * (p[2] * 0.4 + 0.6) * (yRel * 0.4 + 0.6);
      image.data[redIndex] = rg;
      image.data[redIndex + 1] = rg;
      image.data[redIndex + 2] = 250;
      image.data[redIndex + 3] = 255;
    }
    stoppedParticles = [];
    ctx.putImageData(image, 0, 0);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p) {
        const pX = Math.floor(p.x);
        const pY = Math.floor(p.y);
        const pZ = Math.floor(p.z);

        ctx.fillStyle = p.color;
        ctx.fillRect(pX, pY, 1, 1);

        const defPoint = getDefinitionPoint(definition, width, p.x, p.y + 1);
        const pointOnLeft = getDefinitionPoint(definition, width, p.x - 1, p.y + 1);
        const pointOnRight = getDefinitionPoint(definition, width, p.x + 1, p.y + 1);
        const yRel = p.y / this.canvasHeight;
        const chanceToStick = Math.random() * (pointOnLeft + pointOnRight - 0.9) * (1.5 - p.z) * (yRel + 0.5);
        // const chanceToStick = Math.random() * (p.y / this.canvasHeight * 2);
        if (defPoint === 1 && chanceToStick > 0.95) {
          // stop particle
          setDefinitionPoint(definition, width, pX, pY, 1);
          stoppedParticles.push([pX, pY, pZ]);
          particles[i] = null;
        } else if (p.y < this.canvasHeight - 1) {
          p.x += (Math.sin(p.y / ((p.rand + 0.3) * 20 * speed * 4) + p.rand * 10) + wind) * p.velocity * p.z;
          p.y += p.velocity * (p.z + 1);
        } else {
          if (Math.random() > 0) {
            setDefinitionPoint(definition, width, pX, pY, 1);
            stoppedParticles.push([pX, pY, pZ]);
            particles[i] = null;
          } else {
            // Remove when reached bottom line
            stoppedParticles.push([pX, pY, pZ]);
            particles[i] = null;
          }
        }
      }
    }

    if (this.debug) {
      const updateTime = ts - this.lastDebugTime;
      if (updateTime > 500) {
        this.debugInfo.fps = Math.round(1000 / deltaTime);
        this.lastDebugTime = ts;
      }
      ctx.font = '24px monospace';
      ctx.fillStyle = 'rgb(255,255,0)';
      ctx.fillText(`${this.debugInfo.fps}`, 100, 20);
    }

    this.animationFrameHandle = requestAnimationFrame((ts) =>
      this.animationFrame(ts, ctx, image, definition, particles, stoppedParticles)
    );
  }
}

function makeParticle(width: number, height: number, speed: number): Particle {
  const z = gaussianRandom();
  const velocity = (gaussianRandom() + 0.5) * speed;
  const alpha = z + 0.1;
  const color = `rgba(240, 240, 250, ${alpha > 1 ? 1 : alpha})`;
  const x = Math.ceil(Math.random() * width);
  const y = x < 10 ? Math.random() * height : 0;
  return { x, y, z, velocity, color, rand: Math.random() };
}
