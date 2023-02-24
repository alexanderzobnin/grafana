import { CanvasEffectSnow } from './snow';

export async function initVisualEffects() {
  window.addEventListener('load', (e) => onLoad(e));
}

async function onLoad(e: Event) {
  console.log('Start animations');
  const canvasList = await waitForCanvasLoaded();
  console.log(canvasList);
  if (canvasList?.length) {
    for (let i = 0; i < canvasList.length; i++) {
      const canvas = canvasList[i];
      const snowEffect = new CanvasEffectSnow(canvas, {
        particlesNumber: 6000,
        speed: 2,
        wind: 0.05,
      });
      snowEffect.startAnimation();
    }
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
