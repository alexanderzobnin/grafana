export type AnimationEffectType = 'snow' | 'crt-display';

export type AnimationEffectPayload = {
  effect?: AnimationEffectType;
  particlesNumber?: number;
  speed?: number;
  wind?: number;
};
