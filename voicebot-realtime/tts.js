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
    this.resetAndPrepareAudio()
    this.isStreamFinished = false;
    this.sentenceCount = 0;
    this.finishedSentenceCount = 0;
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

  // --- Audio Management ---

  resetAndPrepareAudio() {
    // Stop and clean up any previous audio playback
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
    }

    // Create new audio and media source objects for a clean start
    this.mediaSource = new MediaSource();
    this.audio = new Audio();
    this.audio.src = URL.createObjectURL(this.mediaSource);
    this.sourceBuffer = null;
    this.firstChunkAppended = false;
    this.isStreamFinished = false;

    // Re-attach listeners for the new objects
    this.audio.onended = () => {
      this.onQueueDone();
    };

    this.mediaSource.addEventListener("sourceopen", () => {
      if (!this.sourceBuffer) {
        this.sourceBuffer = this.mediaSource.addSourceBuffer('audio/mpeg');
      }

      // Listen for the 'updateend' event to know when the source buffer is empty
      this.sourceBuffer.addEventListener("updateend", () => {
        if (!this.sourceBuffer.updating && this.mediaSource.readyState === "open" && this.isStreamFinished) {
          if (this.sentenceCount === this.finishedSentenceCount) this.mediaSource.endOfStream();
        }
      });
    }, { once: true });
  }

  onQueueProcessingRequest = () => {
    this.sttManager.stop()
    this.setMicrophoneStatus(this.MicrophoneStatusEnum.talking);
  };

  onQueueDone = () => {
    this.sentenceCount = 0;
    this.finishedSentenceCount = 0;
    this.sttManager.start();
    this.setMicrophoneStatus(this.MicrophoneStatusEnum.recording);
    this.resetAndPrepareAudio()
  };

  appendChunk(data) {
    return new Promise((resolve, reject) => {
      if (!this.sourceBuffer) {
        // SourceBuffer is not ready, retry after a short delay
        setTimeout(() => this.appendChunk(data).then(resolve).catch(reject), 50);
        return;
      }
      if (this.sourceBuffer.updating) {
        this.sourceBuffer.addEventListener("updateend", () => this.appendChunk(data).then(resolve).catch(reject), { once: true });
        return;
      }
      try {
        this.sourceBuffer.appendBuffer(data);
        this.sourceBuffer.addEventListener("updateend", resolve, { once: true });
      } catch (e) {
        console.error("Error appending buffer:", e);
        reject(e);
      }
    });
  }

  // --- WebSocket Connection ---

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
            this.appendChunk(event.data);
            this.onQueueProcessingRequest()

            if (!this.firstChunkAppended) {
              this.firstChunkAppended = true;
              this.audio.play().catch(err => console.log("Autoplay blocked:", err));
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
  }

  // --- Messaging and State Handling ---

  sendText(text) {
    if (!text || !this.wsRef || this.wsRef.readyState !== WebSocket.OPEN) {
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
            this.sentenceCount++
            this.sendText('Xin chào, Tôi là một trợ lý ảo. Bạn có thể giúp tôi với một số thông tin không?');
          }, 100);
        }
        break;

      case 'started-byte-stream':
        break;

      case 'finished-byte-stream':
        console.log('Audio stream finished, processing audio...');
        this.finishedSentenceCount++;
        this.isStreamFinished = true;
        break;

      default:
        console.log('Unhandled message type:', message?.type);
    }
  }

  // --- Configuration Setters ---

  setAuthToken(token) {
    this.authToken = token;
  }

  setSpeakerId(speakerId) {
    this.speakerId = speakerId;
  }

  setSentenceCount(sentenceCount) {
    this.sentenceCount = sentenceCount;
  }
}

export {TTSManager};