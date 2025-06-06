import { useEffect, useRef, useState } from 'react';
import { defaultTransitionConfig } from '@app/configs/animation';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { dataArrayToWaveScale } from './animation/dataArrayToWaveScale';
import { microphoneStatusConfig } from './status';
import { MicrophoneStatusEnum } from './enums/status';

const Button = styled(motion.button)`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-l);
  color: var(--secondary-inverted-color);
  font: var(--font-xxxl);
  width: 80px;
  height: 80px;
  min-height: 80px;
  min-width: 80px;
  cursor: pointer;

  transition: var(--timing-s) ease;
  scale: 1;

  &:active {
    scale: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;

    &:active {
      scale: 1;
    }
  }
`;

const ButtonElement = styled.div`
  position: absolute;
  z-index: var(--microphone-element-z-index);
`;

const Wave = styled(motion.svg)`
  position: absolute;
`;

type Props = {
  handleClick: () => void;
  status: MicrophoneStatusEnum;
  disabled: boolean;
  isRecording: boolean;
};

const Microphone = ({ handleClick, status, disabled, isRecording }: Props) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const [waveScale, setWaveScale] = useState(1);

  useEffect(() => {
    if (isRecording) setupAudioContext();
    else cleanupAudioContext();
    return () => cleanupAudioContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  const setupAudioContext = async () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      animateWaves();
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const cleanupAudioContext = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
      dataArrayRef.current = null;
    }
  };

  const animateWaves = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    const scale = dataArrayToWaveScale(dataArrayRef.current);

    setWaveScale(scale);

    requestAnimationFrame(animateWaves);
  };

  return (
    <>
      <Button onClick={handleClick} transition={defaultTransitionConfig} disabled={disabled}>
        {isRecording ? (
          <>
            <Wave
              key='wave_1'
              viewBox='0 0 200 200'
              xmlns='http://www.w3.org/2000/svg'
              animate={{ scale: waveScale, rotate: 360 }}
              transition={{
                rotate: {
                  duration: 1.6,
                  ease: 'linear',
                  repeat: Infinity,
                },
              }}
              initial={{ scale: waveScale, rotate: 0 }}>
              <path
                fill='#a1a1a134'
                d='M45.5,-79C58.3,-71.5,67.4,-57.9,74.8,-43.7C82.2,-29.5,87.8,-14.7,89.3,0.8C90.7,16.4,88,32.9,80.1,46.1C72.2,59.3,59,69.3,44.7,77.5C30.5,85.7,15.3,92.1,0.3,91.5C-14.6,91,-29.2,83.5,-42.9,74.9C-56.6,66.4,-69.4,56.9,-76.7,44.3C-84.1,31.6,-85.9,15.8,-86.5,-0.3C-87.1,-16.5,-86.5,-33,-79.4,-46.2C-72.4,-59.3,-59,-69.1,-44.7,-75.7C-30.4,-82.2,-15.2,-85.6,0.6,-86.7C16.4,-87.7,32.8,-86.4,45.5,-79Z'
                transform='translate(100 100)'
              />
            </Wave>
            <Wave
              key='wave_2'
              viewBox='0 0 200 200'
              xmlns='http://www.w3.org/2000/svg'
              animate={{ scale: waveScale - 0.2, rotate: 360 }}
              transition={{
                rotate: {
                  duration: 1.4,
                  ease: 'linear',
                  repeat: Infinity,
                },
              }}
              initial={{ scale: waveScale - 0.2, rotate: 0 }}>
              <path
                fill='#a1a1a134'
                d='M44.3,-76.8C58.3,-68.7,70.9,-58.5,79.8,-45.3C88.7,-32.2,93.9,-16.1,93.3,-0.4C92.7,15.4,86.3,30.7,77.2,43.6C68.1,56.5,56.3,66.8,43,74C29.7,81.2,14.9,85.2,-0.1,85.3C-15,85.4,-30,81.7,-44,74.9C-58,68.2,-71.1,58.4,-79.6,45.4C-88.1,32.4,-92.2,16.2,-91.4,0.5C-90.6,-15.3,-85,-30.5,-77,-44.5C-69,-58.5,-58.7,-71.1,-45.5,-79.6C-32.3,-88.1,-16.1,-92.3,-0.5,-91.5C15.2,-90.7,30.4,-84.9,44.3,-76.8Z'
                transform='translate(100 100)'
              />
            </Wave>
          </>
        ) : null}
        <ButtonElement>{microphoneStatusConfig?.[status]?.element || null}</ButtonElement>
      </Button>
    </>
  );
};

export { Microphone };
