import { CanvasEffect, CanvasEffectOptions } from './canvasEffect';
import { getImageDefinition, getDefinitionPoint, setDefinitionPoint, gaussianRandom } from './utils';

type Particle = [number, number, number, string, number];

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
    const { onAnimationCancel, debug } = options;
    super(canvas, { onAnimationCancel, debug });

    const { particlesNumber, speed, wind } = options;
    this.particlesNum = particlesNumber || 6000;
    this.speed = speed || 3;
    this.wind = wind || 0.5;
  }

  startAnimation() {
    this.applyAnimation(this.canvas);
  }

  applyAnimation(canvas: HTMLCanvasElement) {
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const particlesNum = this.particlesNum;

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    const initialImage = ctx?.getImageData(0, 0, canvasWidth, canvasHeight);

    const definition = getImageDefinition(initialImage);
    // const defImageData = definitionToImageData(definition, initialImage.width);
    // const initialDefSize = definition.reduce((acc, curr) => acc + curr, 0);

    const particles: Array<Particle | null> = [];
    for (let i = 0; i < particlesNum; i++) {
      particles.push(null);
    }

    let stoppedParticles: Array<[number, number]> = [];
    let image = ctx?.getImageData(0, 0, canvasWidth, canvasHeight);

    this.animationFrame(0, ctx, image, definition, particles, stoppedParticles);
  }

  animationFrame(
    ts: number,
    ctx: CanvasRenderingContext2D | null,
    image: ImageData,
    definition: number[],
    particles: Array<Particle | null>,
    stoppedParticles: Array<[number, number]>
  ) {
    const width = image.width;
    const height = image.height;
    const speed = this.speed;
    const wind = this.wind;

    const deltaTime = ts - this.lastTime;
    this.lastTime = ts;
    if (this.debug) {
      console.log(deltaTime);
    }

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

    if (ctx) {
      for (let i = 0; i < stoppedParticles.length; i++) {
        const redIndex = (stoppedParticles[i][1] * width + stoppedParticles[i][0]) * 4;
        let rg = 240;
        const colorChance = Math.random();
        rg = 240 + colorChance * 10;
        image.data[redIndex] = rg;
        image.data[redIndex + 1] = rg;
        image.data[redIndex + 2] = 250;
        image.data[redIndex + 3] = 255;
      }
      stoppedParticles = [];
    }
    ctx?.putImageData(image, 0, 0);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (ctx && p) {
        const pX = Math.floor(p[0]);
        const pY = Math.floor(p[1]);

        ctx.fillStyle = p[3];
        ctx.fillRect(pX, pY, 1, 1);

        const defPoint = getDefinitionPoint(definition, width, p[0], p[1] + 1);
        const pointOnLeft = getDefinitionPoint(definition, width, p[0] - 1, p[1] + 1);
        const pointOnRight = getDefinitionPoint(definition, width, p[0] + 1, p[1] + 1);
        const chanceToStick = Math.random() * (pointOnLeft + pointOnRight - 0.905);
        if (defPoint === 1 && chanceToStick > 0.91) {
          // stop particle
          setDefinitionPoint(definition, width, pX, pY, 1);
          stoppedParticles.push([pX, pY]);
          particles[i] = null;
        } else if (p[1] < this.canvasHeight - 1) {
          p[0] += Math.sin(p[1] / ((p[4] + 0.3) * 20 * speed * 4) + p[4] * 10) + wind * wind * p[2];
          p[1] += p[2];
        } else {
          if (Math.random() > 0) {
            setDefinitionPoint(definition, width, pX, pY, 1);
            stoppedParticles.push([pX, pY]);
            particles[i] = null;
          } else {
            // Remove when reached bottom line
            stoppedParticles.push([pX, pY]);
            particles[i] = null;
          }
        }
      }
    }

    this.animationFrameHandle = requestAnimationFrame((ts) =>
      this.animationFrame(ts, ctx, image, definition, particles, stoppedParticles)
    );
  }
}

function makeParticle(width: number, height: number, speed: number): Particle {
  const velocityRatio = gaussianRandom();
  const velocity = (velocityRatio + 0.5) * speed;
  const alpha = velocityRatio + 0.1;
  const color = `rgba(240, 240, 250, ${alpha > 1 ? 1 : alpha})`;
  const x = Math.ceil(Math.random() * width);
  const y = x < 10 ? Math.random() * height : 0;
  return [x, y, velocity, color, Math.random()];
}
