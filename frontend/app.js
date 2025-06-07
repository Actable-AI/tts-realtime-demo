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
const openAiUrl = "http://localhost:8080";
const uri = baseUrl?.replace(/^https?/, (protocol) => (protocol === 'https' ? 'wss' : 'ws'));
const openAiUri = openAiUrl?.replace(/^https?/, (protocol) => (protocol === 'https' ? 'wss' : 'ws'));

// DOM Elements
const authTokenInput = document.getElementById('authToken');
const openApiKeyInput = document.getElementById('openApiKey');
const promptTextarea = document.getElementById('prompt');
const messageTextarea = document.getElementById('message');
const startButton = document.getElementById('startButton');
const resetButton = document.getElementById('resetButton');
const audioElement = document.getElementById('audioElement');
const speakerSelect = document.getElementById('speaker');

// State Management
let isStartRecording = false;
let microphoneStatus = MicrophoneStatusEnum.idle;
let authToken = '';
let openApiKey = '';
let prompt = '';
let tts = '';
let ttsTmp = '';
let audioChunks = [];
let arrAudioChunks = [];
let currentSpeaker = '';
let isProcessingTts = false;

// Refs
let vadRef = null;
let wsRef = null;
let wsOpenAiRef = null;

// Default system prompt
const DEFAULT_SYSTEM_PROMPT = `Mô tả:

Bạn là Nguyễn Cao Kỳ Duyên, một gương mặt nổi bật trong lĩnh vực người mẫu và truyền hình tại Việt Nam. 
Bạn đã đăng quang Hoa hậu Việt Nam 2014 và Miss Universe Vietnam 2024. 
Sau cuộc thi Miss Universe 2024 tại Mexico, nơi bạn lọt vào top 30, bạn đã tập trung vào các dự án cá nhân và việc học tại Đại học Ngoại thương.

Hướng dẫn trả lời:

Trả lời ngắn gọn (2-3 câu).
Chân thành, cởi mở và sẵn sàng chia sẻ.
Đón nhận và hỏi thêm về đối phương nếu thấy cuộc trò chuyện thú vị.

Xưng hô:

Gọi là "em" nếu đối phương xưng là anh hoặc chị.
Gọi là "chị" nếu đối phương xưng là em.
Gọi là "cháu" nếu đối phương xưng là cô, bác, chú, cháu, ông hoặc bà.
Gọi là "cô" nếu đối phương xưng là cháu và có vẻ lớn tuổi hơn.`;

// Helper Functions
const setMicrophoneStatus = (status) => {
  microphoneStatus = status;
  updateUI();
};

const checkRecordingConditions = () => {
  return disabledMicrophoneStatuses.includes(microphoneStatus) ||
    !authToken ||
    !currentSpeaker ||
    !openApiKey ||
    !prompt;
};

const updateUI = () => {
  const isLoading = microphoneStatus === MicrophoneStatusEnum.loading;
  const isRecordingDisabled = checkRecordingConditions();

  // Disable input fields when recording
  authTokenInput.disabled = isStartRecording;
  openApiKeyInput.disabled = isStartRecording;
  promptTextarea.disabled = isStartRecording;
  speakerSelect.disabled = isStartRecording;

  startButton.disabled = isRecordingDisabled;
  startButton.textContent = isLoading ? 'Loading' : isStartRecording ? "Stop" : "Start";
  startButton.className = `btn ${isStartRecording ? "btn-danger" : "btn-primary"}`;
  if (isLoading) {
    startButton.classList.add('btn-loading');
  } else {
    startButton.classList.remove('btn-loading');
  }
};

const checkMicrophonePermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({audio: true});
    // Stop the stream immediately after checking permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Microphone permission error:', error);
    return false;
  }
};

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

    const response = await fetch(`${baseUrl}/stt/execute?lazy_process=false`, {
      method: 'POST',
      headers: {
        ...headers,
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Add user message to message textarea
    if(messageTextarea.value) messageTextarea.value += '\n\n'
    messageTextarea.value += `> User: ${result?.result?.data?.raw_text}\n`;
    messageTextarea.scrollTop = messageTextarea.scrollHeight;
    
    if (wsOpenAiRef && wsOpenAiRef.readyState === WebSocket.OPEN) {
      wsOpenAiRef.send(JSON.stringify({
        api_key: openApiKey,
        prompt: prompt,
        text: result?.result?.data?.raw_text
      }));
    }
  } catch (error) {
    console.error('STT Error:', error);
  }
};

// VAD Initialization
const initializeVAD = async () => {
  try {
    vadRef = await vad.MicVAD.new({
      onSpeechStart: () => {
        console.log('Speech start detected');
      },
      onSpeechEnd: (audio) => {
        console.log('Speech end detected');
        if (!disabledMicrophoneStatuses.includes(microphoneStatus)) {
          handleStt(audio);
        }
      },
    });
  } catch (error) {
    console.error('VAD initialization error:', error);
  }
};

// State Management Functions
const handleClearState = async () => {
  if (vadRef) {
    await vadRef.destroy();
    vadRef = null;
  }

  if (wsRef && wsRef.readyState === WebSocket.OPEN) {
    wsRef.close();
    wsRef = null;
  }

  if (wsOpenAiRef && wsOpenAiRef.readyState === WebSocket.OPEN) {
    wsOpenAiRef.close();
    wsOpenAiRef = null;
  }
  isStartRecording = false;
  setMicrophoneStatus(MicrophoneStatusEnum.idle);
};

const handleReset = async () => {
  messageTextarea.value = '';
  handleClearState();
};

// WebSocket TTS
const ttsClient = () => {
  const websocket = new WebSocket(`${uri}/tts/realtime`);
  wsRef = websocket;

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
        audioChunks = [...audioChunks, event.data];
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
    console.error('WebSocket WebSocket TTS error:', event);
    handleClearState();
    alert("WebSocket error")
  };

  websocket.onclose = (event) => {
    console.log(`Connection WebSocket TTS closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
    handleClearState();
  };
};

// Stream open ai
const streamOpenAI = () => {
  const websocket = new WebSocket(`${openAiUri}/ws/chat`);
  wsOpenAiRef = websocket;

  websocket.onopen = () => {
    console.log('Connection open ai established, waiting for success message...');
  };

  websocket.onmessage = (event) => {
    if (event.data === "[DONE]") {
      messageTextarea.scrollTop = messageTextarea.scrollHeight;
      tts = ""
      ttsTmp = ""
    } else if (event.data.startsWith("[ERROR]")) {
      alert(event.data);
      handleClearState()
    } else {
      ttsTmp += event.data;
      const lastChar = ttsTmp.slice(-1);
      const punctuation = ['.', ',', '!', '?', ';', ':'];
      if (lastChar === ' ' || punctuation.includes(lastChar)) {
        if (!tts) {
          tts = '> Assistant: ' + ttsTmp;
          messageTextarea.value += '> Assistant: ' + ttsTmp;
        } else {
          tts += ttsTmp;
          messageTextarea.value += ttsTmp;
        }
        messageTextarea.scrollTop = messageTextarea.scrollHeight;
        handleJsonMessage({text: ttsTmp})
        ttsTmp = ""
      }
    }
  };

  websocket.onerror = (event) => {
    console.error('WebSocket Stream open ai error:', event);
    handleClearState();
    alert("WebSocket error")
  };

  websocket.onclose = (event) => {
    console.log(`Connection Stream open ai. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
    handleClearState();
  };
}

// Audio Handler
const processNextAudioElement = () => {
  if (arrAudioChunks.length > 0) {
    isProcessingTts = true;
    const nextElement = arrAudioChunks.shift();

    audioElement.src = nextElement;
    setMicrophoneStatus(MicrophoneStatusEnum.talking);

    audioElement.addEventListener('loadedmetadata', () => {
      audioElement.play()
        .then(() => {
          setTimeout(() => {
            if (isStartRecording) {
              setMicrophoneStatus(MicrophoneStatusEnum.recording);
            } else {
              setMicrophoneStatus(MicrophoneStatusEnum.idle);
            }

            if (arrAudioChunks.length > 0) {
              processNextAudioElement();
            } else {
              isProcessingTts = false;
            }
          }, (audioElement.duration || 1) * 1000);
        })
        .catch(() => {
          if (isStartRecording) {
            setMicrophoneStatus(MicrophoneStatusEnum.recording);
          } else {
            setMicrophoneStatus(MicrophoneStatusEnum.idle);
          }
        });
    }, {once: true});
  }
};

// Message Handler
const handleJsonMessage = ({message, text}) => {
  if (text && wsRef?.readyState === WebSocket.OPEN) {
    const queryMessage = {
      query: text,
      normalization: 'basic',
      language: 'vi',
      audio_format: 'mp3',
      audio_quality: 32,
      audio_speed: '1',
      speaker_id: currentSpeaker,
    };
    wsRef.send(JSON.stringify(queryMessage));
    
    
    return;
  }

  switch (message?.type) {
    case 'successful-connection':
      console.log('Connection successful, sending authentication...');
      if (wsRef?.readyState === WebSocket.OPEN) {
        const authMessage = {
          token: authToken,
          strategy: 'token',
        };
        wsRef.send(JSON.stringify(authMessage));
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
          speaker_id: currentSpeaker,
        };
        if (wsRef?.readyState === WebSocket.OPEN) wsRef.send(JSON.stringify(queryMessage));
      }, 100);

      setTimeout(() => {
        const queryMessage = {
          query: 'Tôi là một trợ lý ảo. Bạn có thể giúp tôi với một số thông tin không?',
          normalization: 'basic',
          language: 'vi',
          audio_format: 'mp3',
          audio_quality: 32,
          audio_speed: '1',
          speaker_id: currentSpeaker,
        };
        if (wsRef?.readyState === WebSocket.OPEN) wsRef.send(JSON.stringify(queryMessage));
      }, 500);
      break;

    case 'processing-request':
      // setMicrophoneStatus(MicrophoneStatusEnum.loading);
      break;

    case 'started-byte-stream':
      audioChunks = [];
      break;

    case 'finished-byte-stream':
      console.log('Audio stream finished, playing audio...');
      // Create a copy of the current audioChunks to avoid race conditions
      const currentChunks = [...audioChunks];
      const audioBlob = new Blob(currentChunks, {type: 'audio/mp3'});
      const audioUrl = URL.createObjectURL(audioBlob);

      arrAudioChunks.push(audioUrl)

      if (!isProcessingTts) {
        processNextAudioElement()
      }

      // Clear chunks after creating the blob
      audioChunks = [];
      break;

    default:
      console.log('Unhandled message type:', message?.type);
  }
};

// Fetch speakers from API
const fetchSpeakers = async () => {
  try {
    const response = await fetch(`${baseUrl}/tts/list-speaker-ids`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    const speakers = data?.list_speakers || [];

    // Clear existing options
    speakerSelect.innerHTML = '';

    // Add new options
    speakers.forEach(speaker => {
      const option = document.createElement('option');
      option.value = speaker.id;
      option.textContent = speaker.name;
      speakerSelect.appendChild(option);
    });

    // Set default value if available
    if (speakers.length > 0) {
      const item = speakers.find(e => e.id === "HN-Nu-2-BL")
      if (item) {
        currentSpeaker = item.id;
        speakerSelect.value = currentSpeaker;
      } else {
        currentSpeaker = speakers[0].id;
        speakerSelect.value = currentSpeaker;
      }
    }

    updateUI()
  } catch (error) {
    console.error('Error fetching speakers:', error);
  }
};

// Update speaker when select changes
speakerSelect.addEventListener('change', (e) => {
  currentSpeaker = e.target.value;
});

// Event Handlers
const handleStart = async () => {
  if (checkRecordingConditions()) {
    return;
  }

  isStartRecording = !isStartRecording;

  if (microphoneStatus === MicrophoneStatusEnum.recording) {
    setMicrophoneStatus(MicrophoneStatusEnum.idle);
    if (vadRef) {
      await vadRef.destroy();
      vadRef = null;
    }
    handleClearState()
  } else {
    setMicrophoneStatus(MicrophoneStatusEnum.loading);

    // Check microphone permission first
    // const hasPermission = await checkMicrophonePermission();
    // if (!hasPermission) {
    //   setMicrophoneStatus(MicrophoneStatusEnum.error);
    //   alert('Please allow microphone access to use this feature.');
    //   return;
    // }

    
    if (vadRef) {
      await vadRef.start();
    } else {
      await initializeVAD();
      await vadRef.start();
      ttsClient();
      streamOpenAI();
    }
    setMicrophoneStatus(MicrophoneStatusEnum.recording);
  }
};

// Event Listeners
authTokenInput.addEventListener('input', (e) => {
  authToken = e.target.value.trim();
  updateUI();
});

openApiKeyInput.addEventListener('input', (e) => {
  openApiKey = e.target.value.trim();
  updateUI();
});

promptTextarea.addEventListener('input', (e) => {
  prompt = e.target.value.trim();
  updateUI();
});

// Event Listeners
startButton.addEventListener('click', handleStart);
resetButton.addEventListener('click', handleReset);

// Initialize APP
fetchSpeakers();
promptTextarea.value = DEFAULT_SYSTEM_PROMPT;
prompt = DEFAULT_SYSTEM_PROMPT;
updateUI();
