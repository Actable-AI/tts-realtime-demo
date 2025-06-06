import { useEffect, useState } from 'react';
import { MicrophoneStatusEnum, useSpeechToTextContext } from '@modules/Recording';
import { Button, Divider, Modal, Radio, Skeleton, Space } from 'antd';
import styled from 'styled-components';

const StyledModal = styled(Modal)`
  margin: 20px;
`;

const RadioGroup = styled(Radio.Group)`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const RadioLabel = styled(Space)`
  line-height: 1;

  span {
    line-height: 1;
  }
`;

const RadioDescription = styled.span`
  font-size: 12px;
  color: #b1b1b1;
  font-style: italic;
  font-weight: 400;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
`;

const ChooseMic = ({ isOpen, onCancel }) => {
  const {
    audioInputs,
    setAudioInputs,
    setAudioStream,
    audioSelected,
    setAudioSelected,
    status,
    handleResetRecording,
  } = useSpeechToTextContext();

  const [currentAudio, setCurrentAudio] = useState(audioSelected);
  const [isReset, setIsReset] = useState(false);

  useEffect(() => {
    if (!currentAudio && audioInputs?.length) setCurrentAudio(audioInputs[0].value);
  }, [audioInputs, audioSelected, currentAudio]);

  const populateAudioDevices = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const devices = await navigator.mediaDevices.enumerateDevices();

      const audioInputs = devices.filter((device) => device.kind === 'audioinput');

      const arr = audioInputs.map((e) => {
        const [, part1, part2] = e?.label?.includes('(') ? e.label.match(/^(.*)\s+\((.*)\)$/) : [];

        return {
          value: e.deviceId,
          label: part1 ? (
            <RadioLabel direction={'vertical'} size={4}>
              <span>{part1}</span>

              <RadioDescription>{part2}</RadioDescription>
            </RadioLabel>
          ) : (
            e.label || `Microphone ${audioInputs?.length + 1}`
          ),
        };
      });

      setAudioInputs(arr);

      if (arr?.length) {
        setCurrentAudio(arr?.[0]?.value);
      }
    } catch (error) {
      console.error('Error accessing audio devices:', error);
    }
  };

  const startAudio = async (deviceId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
        },
      });

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);

      const analyser = audioContext.createAnalyser();
      source.connect(analyser);

      return { stream, audioContext, source, analyser };
    } catch (error) {
      console.error('Error starting audio:', error);
    }
  };

  const handleChangeAudio = async (value) => {
    if (window.currentStream) {
      window.currentStream.getTracks().forEach((track) => track.stop());
    }

    const audioSetup = await startAudio(value);

    window.currentStream = audioSetup.stream;

    setAudioSelected(value);
    setAudioStream(audioSetup.stream);

    if (status === MicrophoneStatusEnum.recording) {
      setIsReset(true);
      return;
    }

    onCancel();
  };

  useEffect(() => {
    if (isOpen && !audioInputs?.length) populateAudioDevices();
  }, [isOpen, audioInputs]);

  useEffect(() => {
    if (!isReset || !audioSelected) return;

    setIsReset(false);
    handleResetRecording();
    onCancel();
  }, [isReset, audioSelected]);

  return (
    <>
      <StyledModal
        title='Choose a device for speaking or recording'
        open={isOpen}
        onCancel={onCancel}
        footer={null}
        centered>
        {audioInputs?.length ? (
          <>
            <Divider />

            <RadioGroup
              onChange={(e) => setCurrentAudio(e.target.value)}
              value={currentAudio}
              options={audioInputs}
            />

            <Divider />

            <ButtonGroup align={'end'}>
              <Button onClick={onCancel}>Cancel</Button>

              <Button type={'primary'} onClick={() => handleChangeAudio(currentAudio)}>
                Ok
              </Button>
            </ButtonGroup>
          </>
        ) : (
          <Skeleton active />
        )}
      </StyledModal>
    </>
  );
};

export { ChooseMic };
