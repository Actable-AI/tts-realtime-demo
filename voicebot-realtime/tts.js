class TTSManager {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '';
    this.authToken = options.authToken || '';
    this.speakerId = options.speakerId || '';
    this.onAudioReceived = options.onAudioReceived || (() => {
    });
    this.wsRef = null;
    this.audioChunks = [];
    this.config = options.config || {};
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

  connect() {
    try {
      const websocket = new WebSocket(this.getWebSocketUrl());
      this.wsRef = websocket;

      const connectionTimeout = setTimeout(() => {
        if (websocket.readyState !== WebSocket.OPEN) {
          websocket.close();
        }
      }, 5000);

      websocket.onopen = () => {
        console.log('Connection established, waiting for success message...');
        clearTimeout(connectionTimeout);
      };

      websocket.onmessage = async (event) => {
        try {
          if (event.data instanceof Blob) {
            this.audioChunks = [...this.audioChunks, event.data];
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
      };
    } catch (error) {
      console.error('Error connecting to TTS:', error);
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
        this.audioChunks = [];
        break;

      case 'finished-byte-stream':
        console.log('Audio stream finished, processing audio...');
        const currentChunks = [...this.audioChunks];
        const audioBlob = new Blob(currentChunks, {type: 'audio/mp3'});
        const audioUrl = URL.createObjectURL(audioBlob);
        this.onAudioReceived(audioUrl);
        this.audioChunks = [];
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