import appEvents from 'app/core/app_events';

import { CanvasEffect } from './canvasEffect';
import { CanvasEffectScreen } from './screenEffect';
import { CanvasEffectSnow } from './snow';
import { AnimationEffectPayload } from './types';

export async function initVisualEffects() {
  const effectObjects: CanvasEffect[] = [];
  appEvents.on('visual-effect-start', (payload: AnimationEffectPayload) => startAnimation(effectObjects, payload));
  appEvents.on('visual-effect-cancel', () => cancelAnimation(effectObjects));
}

async function startAnimation(effectObjects: CanvasEffect[], payload: AnimationEffectPayload) {
  console.log('Start animations');
  const { effect } = payload;
  const canvasList = await waitForCanvasLoaded();
  console.log(canvasList);
  if (canvasList?.length) {
    for (let i = 0; i < canvasList.length; i++) {
      const canvas = canvasList[i];

      if (effect === 'snow') {
        const snowEffect = new CanvasEffectSnow(canvas, {
          particlesNumber: payload.particlesNumber || 6000,
          speed: payload.speed || 2,
          wind: payload.wind || 0.05,
          debug: payload.debug,
          showDefinitionImage: payload.showDefinitionImage,
        });
        effectObjects.push(snowEffect);

        snowEffect.startAnimation();
      }
      if (effect === 'crt-display') {
        const screenEffect = new CanvasEffectScreen(canvas, {
          cellSize: 6,
          debug: true,
        });
        effectObjects.push(screenEffect);

        screenEffect.startAnimation();
      }
    }
  }
}

async function cancelAnimation(effectObjects: CanvasEffect[]) {
  for (const effect of effectObjects) {
    effect.cancelAnimation();
  }
}

async function waitForCanvasLoaded() {
  let canvasList: HTMLCollectionOf<HTMLCanvasElement> | null = null;
  for (let i = 0; i < 10; i++) {
    const elements = document.getElementsByTagName('canvas');
    if (elements.length) {
      canvasList = elements;
      return canvasList;
    } else {
      await asyncTimeout(1000);
    }
  }

  return canvasList;
}

const asyncTimeout = (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};
