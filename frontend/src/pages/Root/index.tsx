import { useEffect, useMemo, useRef, useState } from 'react';
import { authToken, baseUrl } from '@app/configs/env';
import * as vad from '@ricky0123/vad-web';
import { Input } from 'antd';
import axios from 'axios';
import styled from 'styled-components';
import { Avatar } from './Avatar';
import { MicrophoneStatusEnum } from './enums/status';
import { Microphone } from './Microphone';
import { disabledMicrophoneStatuses } from './status';

const { TextArea } = Input;

interface TTSMessage {
  type?: string;
  status?: string;
  token?: string;
  strategy?: string;
  query?: string;
  normalization?: string;
  language?: string;
  audio_format?: string;
  audio_quality?: number;
  audio_speed?: string;
  speaker_id?: string;
}

const MainLayout = styled.div`
  background-color: var(--bg-color);
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  justify-content: flex-start;
  align-items: center;
  align-content: flex-start;
  gap: var(--spacing-m);
  padding: var(--spacing-xl);
  width: 100%;
  height: 100vh;
`;

const Layout = styled.div`
  width: 100%;
  max-width: 424px;
  height: 80%;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  justify-content: space-between;
  align-items: center;
  align-content: flex-start;
  position: relative;
  gap: var(--spacing-xxl);
`;

const uri = baseUrl?.replace(/^https?/, (protocol) => (protocol === 'https' ? 'wss' : 'ws'));

declare global {
  interface FormData {
    getHeaders: () => { [key: string]: string };
  }
}

FormData.prototype.getHeaders = () => {
  return { 'Content-Type': 'multipart/form-data' };
};

const HomePage = () => {
  const vadRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isStartRecoding, setIsStartRecoding] = useState(false);
  const [microphoneStatus, setMicrophoneStatus] = useState<MicrophoneStatusEnum>(MicrophoneStatusEnum.idle);
  const [transcript, setTranscript] = useState('');

  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  const isRecordingDisabled = useMemo(
    () => disabledMicrophoneStatuses.includes(microphoneStatus),
    [microphoneStatus],
  );

  const handleStt = async (data) => {
    try {
      const headers = {
        Authorization: `Bearer ${authToken}`,
      };

      const wavBuffer = vad.utils.encodeWAV(data);
      const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'audio.wav');

      const result = await axios.post(`${baseUrl}/stt/execute?lazy_process=false`, formData, {
        headers: {
          ...headers,
          ...formData.getHeaders(),
        },
      });

      setTranscript(
        (transcript) => transcript + (transcript ? '\n\n' : '') + result?.data?.result?.data?.raw_text,
      );
      handleJsonMessage({ text: result?.data?.result?.data?.raw_text });
    } catch (error) {
      console.error('STT Error:', error);
    }
  };

  const initializeVAD = async () => {
    try {
      vadRef.current = await vad.MicVAD.new({
        onSpeechStart: () => {
          console.log('Speech start detected');
          // setMicrophoneStatus(MicrophoneStatusEnum.recording);
        },
        onSpeechEnd: (audio) => {
          console.log('Speech end detected');
          setMicrophoneStatus((microphoneStatus) => {
            if (!disabledMicrophoneStatuses.includes(microphoneStatus)) handleStt(audio);

            return microphoneStatus;
          });
        },
      });
    } catch (error) {
      console.error('VAD initialization error:', error);
    }
  };

  const handleMicrophoneClick = async () => {
    setIsStartRecoding(!isStartRecoding);

    if (microphoneStatus === MicrophoneStatusEnum.recording) {
      setMicrophoneStatus(MicrophoneStatusEnum.idle);
      if (vadRef.current) {
        await vadRef.current.destroy();
        vadRef.current = null;
      }
    } else {
      setMicrophoneStatus(MicrophoneStatusEnum.loading);
      ttsClient();
      if (vadRef.current) {
        await vadRef.current.start();
      } else {
        await initializeVAD();
        await vadRef.current.start();
      }
      setMicrophoneStatus(MicrophoneStatusEnum.recording);
    }
  };

  useEffect(() => {
    // Initialize VAD when component mounts
    // initializeVAD();

    // Initialize TTS client with audio element
    // ttsClient();

    // Cleanup when component unmounts
    return () => {
      if (vadRef.current) {
        vadRef.current.destroy();
        vadRef.current = null;
      }
    };
  }, []);

  const ttsClient = () => {
    // console.log(`Connecting to ${uri}...`);
    const websocket = new WebSocket(`${uri}/tts/realtime`);
    wsRef.current = websocket;

    const connectionTimeout = setTimeout(() => {
      // console.log('Connection seems to be stuck. Dumping raw socket state:');
      console.log('WebSocket readyState:', websocket.readyState);
    }, 5000);

    websocket.onopen = () => {
      console.log('Connection established, waiting for success message...');
      clearTimeout(connectionTimeout);
    };

    websocket.onmessage = async (event: MessageEvent) => {
      try {
        if (event.data instanceof Blob) {
          setAudioChunks((prevChunks) => [...prevChunks, event.data]);
          return;
        }

        // Handle text messages (JSON)
        const message = JSON.parse(event.data);

        handleJsonMessage({ message });
      } catch (error) {
        const err = error as Error;
        console.error('Error processing message:', err);
        if (err.message?.includes('fatal') || err.message?.includes('connection')) {
          websocket.close();
        }
      }
    };

    websocket.onerror = (event: Event) => {
      console.error('WebSocket error:', event);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current?.close();
        wsRef.current = null;
      }
    };

    websocket.onclose = (event: CloseEvent) => {
      console.log(`Connection closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current?.close();
        wsRef.current = null;
      }
    };
  };

  const handleJsonMessage = ({ message, text }: { message?: TTSMessage; text?: string }) => {
    if (text && wsRef.current?.readyState === WebSocket.OPEN) {
      const queryMessage = {
        query: text,
        normalization: 'basic',
        language: 'vi',
        audio_format: 'mp3',
        audio_quality: 32,
        audio_speed: '1',
        speaker_id: 'HN-Nam-2-BL',
      };
      wsRef.current.send(JSON.stringify(queryMessage));
      return;
    }

    switch (message?.type) {
      case 'successful-connection':
        console.log('Connection successful, sending authentication...');
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const authMessage = {
            token: authToken,
            strategy: 'token',
          };
          wsRef.current.send(JSON.stringify(authMessage));
        }

        break;

      case 'successful-authentication':
        // console.log('Authentication successful, sending TTS query...');
        // Send first TTS query after a short delay
        setTimeout(() => {
          const queryMessage = {
            query: 'Xin chào, tôi là một trợ lý ảo. Bạn có thể giúp tôi với một số thông tin không?',
            normalization: 'basic',
            language: 'vi',
            audio_format: 'mp3',
            audio_quality: 32,
            audio_speed: '1',
            speaker_id: 'HN-Nam-2-BL',
          };
          // console.log(`Sending first query: ${JSON.stringify(queryMessage)}`);
          if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(queryMessage));
        }, 100);
        break;

      case 'processing-request':
        // console.log('Request is being processed...');
        setMicrophoneStatus(MicrophoneStatusEnum.loading);
        break;

      case 'started-byte-stream':
        // console.log('Starting to receive audio stream...');
        setAudioChunks([]); // Reset audio chunks properly
        break;

      case 'finished-byte-stream':
        console.log('Audio stream finished, playing audio...');

        // Create audio blob and play it using the latest state
        setAudioChunks((prevChunks) => {
          const audioBlob = new Blob(prevChunks, { type: 'audio/mp3' });
          const audioUrl = URL.createObjectURL(audioBlob);

          // Set up audio element
          if (audioRef.current) {
            audioRef.current.src = audioUrl;

            setMicrophoneStatus(MicrophoneStatusEnum.talking);

            audioRef.current.addEventListener(
              'loadedmetadata',
              () => {
                if (audioRef.current) {
                  audioRef.current
                    .play()
                    .then(() => {
                      setTimeout(() => {
                        setIsStartRecoding((isStartRecoding) => {
                          if (isStartRecoding) setMicrophoneStatus(MicrophoneStatusEnum.recording);
                          else setMicrophoneStatus(MicrophoneStatusEnum.idle);
                          return isStartRecoding;
                        });
                      }, (audioRef.current?.duration || 1) * 1000);
                    })
                    .catch(() => {
                      setIsStartRecoding((isStartRecoding) => {
                        if (isStartRecoding) setMicrophoneStatus(MicrophoneStatusEnum.recording);
                        else setMicrophoneStatus(MicrophoneStatusEnum.idle);
                        return isStartRecoding;
                      });
                    });
                }
              },
              { once: true },
            );
          }
          return prevChunks; // Keep the chunks in state
        });
        setAudioChunks([]);
        break;

      default:
        console.log('Unhandled message type:', message?.type);
    }
  };

  return (
    <MainLayout>
      <Layout>
        <Avatar />

        <TextArea rows={9} readOnly value={transcript} />

        <Microphone
          isRecording={microphoneStatus === MicrophoneStatusEnum.recording}
          handleClick={handleMicrophoneClick}
          status={microphoneStatus}
          disabled={isRecordingDisabled}
        />
      </Layout>

      <audio ref={audioRef} autoPlay />
    </MainLayout>
  );
};

export default HomePage;
