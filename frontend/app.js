// Constants and Enums
const MicrophoneStatusEnum = {
  loading: 'loading',
  idle: 'idle',
  recording: 'recording',
  error: 'error',
  talking: 'talking',
};

const disabledMicrophoneStatuses = [
  MicrophoneStatusEnum.loading,
  MicrophoneStatusEnum.talking,
  MicrophoneStatusEnum.error,
];

// API Configuration
const baseUrl = "https://api.blaze.vn/v1";
const uri = baseUrl?.replace(/^https?/, (protocol) => (protocol === 'https' ? 'wss' : 'ws'));
const {Form, Button, Input} = window["antd"];

// Main App Component
function App() {
  // React Hooks
  const {useMemo, useRef, useState} = React;
  const [form] = Form.useForm();

  // Refs
  const vadRef = useRef(null);
  const wsRef = useRef(null);
  const audioRef = useRef(null);

  // State Management
  const [isStartRecoding, setIsStartRecoding] = useState(false);
  const [microphoneStatus, setMicrophoneStatus] = useState(MicrophoneStatusEnum.idle);
  const [authToken, setAuthToken] = useState('');
  const [transcript, setTranscript] = useState('');
  // const [textToSynthesize, setTextToSynthesize] = useState('');
  const [audioChunks, setAudioChunks] = useState([]);

  // Derived State
  const isLoading = useMemo(
    () => microphoneStatus === MicrophoneStatusEnum.loading,
    [microphoneStatus],
  );

  const isRecordingDisabled = useMemo(
    () => disabledMicrophoneStatuses.includes(microphoneStatus),
    [microphoneStatus],
  );

  // const isSendTtsDisabled = useMemo(
  //   () => wsRef?.current?.readyState !== WebSocket.OPEN || isRecordingDisabled || !textToSynthesize?.trim(),
  //   [wsRef, isRecordingDisabled, textToSynthesize],
  // );

  // Speech-to-Text Handler
  const handleStt = async (data) => {
    try {
      setMicrophoneStatus(MicrophoneStatusEnum.loading);
      const headers = {
        Authorization: `Bearer ${authToken}`,
      };

      const wavBuffer = vad.utils.encodeWAV(data);
      const audioBlob = new Blob([wavBuffer], {type: 'audio/wav'});
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'audio.wav');

      const result = await axios.post(`${baseUrl}/stt/execute?lazy_process=false`, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        },
      });

      setTranscript(
        (transcript) => {
          const text = transcript + (transcript ? '\n\n' : '') + result?.data?.result?.data?.raw_text
          form.setFieldValue('transcript', text)
          return text
        }
      );
      handleJsonMessage({text: result?.data?.result?.data?.raw_text});
    } catch (error) {
      console.error('STT Error:', error);
    }
  };

  // VAD Initialization
  const initializeVAD = async () => {
    try {
      vadRef.current = await vad.MicVAD.new({
        onSpeechStart: () => {
          console.log('Speech start detected');
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

  // State Management Functions
  const handleClearState = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current?.close();
      wsRef.current = null;
    }
    setIsStartRecoding(false);
    setMicrophoneStatus(MicrophoneStatusEnum.idle);
  };

  const handleReset = async () => {
    if (vadRef.current) {
      await vadRef.current.destroy();
      vadRef.current = null;
    }
    form.setFieldValue("transcript", "");
    setTranscript('');
    // setTextToSynthesize('');
    handleClearState();
  };

  // WebSocket and TTS Functions
  const ttsClient = () => {
    const websocket = new WebSocket(`${uri}/tts/realtime`);
    wsRef.current = websocket;

    const connectionTimeout = setTimeout(() => {
      console.log('WebSocket readyState:', websocket.readyState);
    }, 5000);

    websocket.onopen = () => {
      console.log('Connection established, waiting for success message...');
      clearTimeout(connectionTimeout);
    };

    websocket.onmessage = async (event) => {
      try {
        if (event.data instanceof Blob) {
          setAudioChunks((prevChunks) => [...prevChunks, event.data]);
          return;
        }
        const message = JSON.parse(event.data);
        handleJsonMessage({message});
      } catch (error) {
        console.error('Error processing message:', error);
        if (error.message?.includes('fatal') || error.message?.includes('connection')) {
          websocket.close();
        }
      }
    };

    websocket.onerror = (event) => {
      console.error('WebSocket error:', event);
      handleClearState();
    };

    websocket.onclose = (event) => {
      console.log(`Connection closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
      handleClearState();
    };
  };

  // Message Handler
  const handleJsonMessage = ({message, text}) => {
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
      // form.setFieldValue('textToSynthesize', '')
      // setTextToSynthesize('')
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
        setTimeout(() => {
          const queryMessage = {
            query: 'Xin chào.',
            normalization: 'basic',
            language: 'vi',
            audio_format: 'mp3',
            audio_quality: 32,
            audio_speed: '1',
            speaker_id: 'HN-Nam-2-BL',
          };
          if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(queryMessage));
        }, 100);

        setTimeout(() => {
          const queryMessage = {
            query: 'Tôi là một trợ lý ảo. Bạn có thể giúp tôi với một số thông tin không?',
            normalization: 'basic',
            language: 'vi',
            audio_format: 'mp3',
            audio_quality: 32,
            audio_speed: '1',
            speaker_id: 'HN-Nam-2-BL',
          };
          if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(queryMessage));
        }, 500);
        break;

      case 'processing-request':
        setMicrophoneStatus(MicrophoneStatusEnum.loading);
        break;

      case 'started-byte-stream':
        setAudioChunks([]);
        break;

      case 'finished-byte-stream':
        console.log('Audio stream finished, playing audio...');
        setAudioChunks((prevChunks) => {
          const audioBlob = new Blob(prevChunks, {type: 'audio/mp3'});
          const audioUrl = URL.createObjectURL(audioBlob);

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
              {once: true},
            );
          }
          return prevChunks;
        });
        setAudioChunks([]);
        break;

      default:
        console.log('Unhandled message type:', message?.type);
    }
  };

  // Form Handlers
  const onFinish = async () => {
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

  // const handleSendTts = () => {
  //   if (isSendTtsDisabled) return
  //
  //   handleJsonMessage({text: textToSynthesize + "."})
  // }

  // Render
  return (
    <div className="main-layout">
      <div className="layout">
        <Form
          name="basic"
          form={form}
          layout="vertical"
          style={{maxWidth: 600}}
          onFinish={onFinish}
          autoComplete="off"
        >
          <h2 style={{textAlign: "center"}}>Voice-bot realtime</h2>

          <Form.Item
            label="Authentication Token"
            name="authToken"
            rules={[{required: true, message: 'Please input your Authentication Token!'}]}
          >
            <Input onChange={(e) => setAuthToken(e.target.value)}/>
          </Form.Item>

          {/*<Form.Item*/}
          {/*  label="Text to Synthesize"*/}
          {/*  name="textToSynthesize"*/}
          {/*>*/}
          {/*  <Input onChange={(e) => setTextToSynthesize(e.target.value)}/>*/}
          {/*</Form.Item>*/}

          <Form.Item
            label="Speech to Text"
            name="transcript"
          >
            <Input.TextArea rows={6} autoSize={{minRows: 6, maxRows: 12}} readOnly/>
          </Form.Item>

          <Form.Item label={null}>
            <div className="btn-group">
              <Button onClick={handleReset}>
                Reset
              </Button>

              <Button
                type={isStartRecoding ? "danger" : "primary"}
                htmlType="submit"
                loading={microphoneStatus === MicrophoneStatusEnum.loading}
                disabled={isRecordingDisabled}
              >
                {isLoading ? 'Loading' : isStartRecoding ? "Stop" : "Start"}
              </Button>

              {/*<Button*/}
              {/*  type="primary"*/}
              {/*  disabled={isSendTtsDisabled}*/}
              {/*  onClick={handleSendTts}*/}
              {/*>*/}
              {/*  Send TTS*/}
              {/*</Button>*/}
            </div>
          </Form.Item>
        </Form>

        <audio ref={audioRef} autoPlay/>
      </div>
    </div>
  );
}

// Render App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);