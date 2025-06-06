import { defaultTransitionConfig } from './transition';

const defaultIconAnimationConfig = {
  animate: {
    y: 0,
    opacity: 1,
    scale: 1,
  },
  initial: { y: 60, opacity: 0, scale: 0.5 },
  transition: defaultTransitionConfig,
};

export { defaultIconAnimationConfig };
