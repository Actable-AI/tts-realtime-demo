import { ReactNode } from 'react';
import { AudioFilled, LoadingOutlined, PauseOutlined, WarningOutlined, XFilled } from '@ant-design/icons';
import { defaultTransitionConfig } from '@app/configs/animation';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { MicrophoneStatusEnum } from './enums/status';

const RedColor = styled.span`
  color: var(--danger-color);
`;

const OrangeColor = styled.span`
  color: var(--danger-color);
`;

const PrimaryColor = styled.span`
  color: var(--primary-color);
`;

const TertiaryColor = styled.span`
  color: var(--tertiary-color);
`;

const Icon = styled(motion.div)``;

const iconProps = {
  animate: {
    y: 0,
    opacity: 1,
    scale: 1,
  },
  initial: { y: 60, opacity: 0, scale: 0.5 },
  transition: defaultTransitionConfig,
};

type MicrophoneStatusConfigItemType = {
  element: ReactNode;
  key: MicrophoneStatusEnum;
};

type MicrophoneStatusConfigType = Record<MicrophoneStatusEnum, MicrophoneStatusConfigItemType>;

const microphoneStatusIconsConfig: MicrophoneStatusConfigItemType[] = [
  {
    element: (
      <TertiaryColor>
        <LoadingOutlined />
      </TertiaryColor>
    ),
    key: MicrophoneStatusEnum.loading,
  },
  {
    element: (
      <PrimaryColor>
        <AudioFilled />
      </PrimaryColor>
    ),
    key: MicrophoneStatusEnum.idle,
  },
  {
    element: (
      <RedColor>
        <XFilled />
      </RedColor>
    ), // TODO: Change to record icon
    key: MicrophoneStatusEnum.recording,
  },
  {
    element: (
      <OrangeColor>
        <WarningOutlined />
      </OrangeColor>
    ),
    key: MicrophoneStatusEnum.error,
  },
  {
    element: (
      <TertiaryColor>
        <PauseOutlined />
      </TertiaryColor>
    ),
    key: MicrophoneStatusEnum.talking,
  },
];

const microphoneStatusConfig = microphoneStatusIconsConfig.reduce((acc, { key, element }) => {
  acc[key] = {
    key,
    element: (
      <Icon {...iconProps} key={key}>
        {element}
      </Icon>
    ),
  };
  return acc;
}, {} as MicrophoneStatusConfigType);

const disabledActionStatuses = [
  MicrophoneStatusEnum.loading,
  MicrophoneStatusEnum.recording,
  MicrophoneStatusEnum.error,
  MicrophoneStatusEnum.talking,
];

const disabledMicrophoneStatuses = [
  MicrophoneStatusEnum.loading,
  MicrophoneStatusEnum.talking,
  MicrophoneStatusEnum.error,
];

export { microphoneStatusConfig, disabledActionStatuses, disabledMicrophoneStatuses };
