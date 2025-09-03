class TTSManager {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '';
    this.authToken = options.authToken || '';
    this.speakerId = options.speakerId || '';
    this.config = options.config;
    this.sttManager = options.sttManager;
    this.MicrophoneStatusEnum = options.MicrophoneStatusEnum;
    this.setMicrophoneStatus = options.setMicrophoneStatus;
    this.wsRef = null;
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.audioQueue = [];
    this.isPlaying = false;
    this.audioType = null;
  }

  getWebSocketUrl() {
    return this.baseUrl?.replace(/^https?/, (protocol) => (protocol === 'https' ? 'wss' : 'ws')) + '/tts/realtime';
  }

  async fetchSpeakers() {
    try {
      const response = await fetch(`${this.baseUrl}/tts/list-speaker-ids`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data?.list_speakers || [];
    } catch (error) {
      console.error('Error fetching speakers:', error);
      return [];
    }
  }

  detectAudioType(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const header = String.fromCharCode(...bytes.slice(0, 4));

    if (header.startsWith("RIFF")) return "wav";
    if (header.startsWith("ID3")) return "mp3";
    if ((bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0)) return "mp3"; // MPEG frame
    return "pcm";
  }

  async playPCM(arrayBuffer) {
    const pcm = new Int16Array(arrayBuffer);
    const float32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) {
      float32[i] = pcm[i] / 32768.0;
    }

    const buffer = this.audioCtx.createBuffer(1, float32.length, 16000); // mono, 16kHz
    buffer.copyToChannel(float32, 0);

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioCtx.destination);
    source.start();
  }

  onQueueDone = () => {
    this.setMicrophoneStatus(this.MicrophoneStatusEnum.recording)
    this.sttManager.start()
  };

  async playQueue() {
    if (this.isPlaying || this.audioQueue.length === 0) return;

    this.setMicrophoneStatus(this.MicrophoneStatusEnum.talking)
    this.sttManager.stop()
    this.isPlaying = true;
    const chunk = this.audioQueue.shift();

    try {
      const audioBuffer = await this.audioCtx.decodeAudioData(chunk.slice(0));
      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioCtx.destination);

      source.onended = () => {
        this.isPlaying = false;
        if (this.audioQueue.length > 0) {
          this.playQueue();
        } else {
          if (this.onQueueDone) this.onQueueDone();
        }
      };

      source.start();
    } catch (err) {
      console.error("Decode error:", err);
      this.isPlaying = false;
      if (this.audioQueue.length > 0) {
        this.playQueue();
      } else {
        if (this.onQueueDone) this.onQueueDone();
      }
    }
  }

  connect() {
    try {
      const websocket = new WebSocket(this.getWebSocketUrl());
      this.wsRef = websocket;
      websocket.binaryType = "arraybuffer";

      const connectionTimeout = setTimeout(() => {
        if (websocket.readyState !== WebSocket.OPEN) {
          websocket.close();
          alert('TTS Connection timeout after 5 seconds');
        }
      }, 5000);

      websocket.onopen = () => {
        console.log('Connection established, waiting for success message...');
        clearTimeout(connectionTimeout);
      };

      websocket.onmessage = async (event) => {
        try {
          if (event.data instanceof ArrayBuffer) {
            if (!this.audioType) this.audioType = this.detectAudioType(event.data);

            if (this.audioType === "pcm") {
              this.playPCM(event.data);
            } else {
              this.audioQueue.push(event.data);
              this.playQueue();
            }

            return;
          }
          const message = JSON.parse(event.data);
          this.handleJsonMessage(message);
        } catch (error) {
          console.error('Error processing message:', error);
          if (error.message?.includes('fatal') || error.message?.includes('connection')) {
            websocket.close();
          }
        }
      };

      websocket.onerror = (event) => {
        console.error('WebSocket TTS error:', event);
        this.disconnect();
      };

      websocket.onclose = (event) => {
        console.log(`Connection WebSocket TTS closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
        this.disconnect();
        if (event.code === 1000) alert(`Error connecting to TTS: Connection timeout`);
      };
    } catch (error) {
      console.error('Error connecting to TTS:', error);
      alert(`Error connecting to TTS: ${error.message}`);
    }
  }

  disconnect() {
    if (this.wsRef && this.wsRef.readyState === WebSocket.OPEN) {
      this.wsRef.close();
      this.wsRef = null;
    }
    this.audioChunks = [];
  }

  sendText(text) {
    if (!text || !this.wsRef?.readyState === WebSocket.OPEN) {
      throw new Error('Cannot send text');
    }

    const queryMessage = {
      query: text,
      normalization: this.config.normalization || 'basic',
      language: this.config.language || 'vi',
      audio_format: this.config.audioFormat || 'mp3',
      audio_quality: this.config.audioQuality || 32,
      audio_speed: this.config.audioSpeed || '1',
      speaker_id: this.speakerId,
    };
    this.wsRef.send(JSON.stringify(queryMessage));
  }

  handleJsonMessage(message) {
    switch (message?.type) {
      case 'successful-connection':
        console.log('Connection successful, sending authentication...');
        if (this.wsRef?.readyState === WebSocket.OPEN) {
          const authMessage = {
            token: this.authToken,
            strategy: 'token',
          };
          this.wsRef.send(JSON.stringify(authMessage));
        }
        break;

      case 'successful-authentication':
        if (this.wsRef?.readyState === WebSocket.OPEN) {
          setTimeout(() => {
            this.sendText('Xin chào,');
          }, 100);

          setTimeout(() => {
            this.sendText('Tôi là một trợ lý ảo. Bạn có thể giúp tôi với một số thông tin không?');
          }, 500);
        }
        break;

      case 'started-byte-stream':
        break;

      case 'finished-byte-stream':
        console.log('Audio stream finished, processing audio...');
        break;

      default:
        console.log('Unhandled message type:', message?.type);
    }
  }

  setAuthToken(token) {
    this.authToken = token;
  }

  setSpeakerId(speakerId) {
    this.speakerId = speakerId;
  }
}

export {TTSManager};