import { defaultIconAnimationConfig } from '@app/configs/animation';
import { motion } from 'framer-motion';
import styled from 'styled-components';

const AnimatedIcon = styled(motion.div).attrs(defaultIconAnimationConfig)``;

export { AnimatedIcon };
