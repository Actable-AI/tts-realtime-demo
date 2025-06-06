import { Transition } from 'framer-motion';

const defaultTransitionConfig: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
  mass: 1,
  duration: 0.25,
};

export { defaultTransitionConfig };
