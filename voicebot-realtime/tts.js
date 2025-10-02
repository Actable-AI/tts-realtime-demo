class TTSManager {
  // Audio constants
  static AUDIO_CONFIG = {
    SAMPLE_RATE: 24000,
    CHANNELS: 1,
    FADE_DURATION: 0.01, // 10ms
    DEFAULT_VOLUME: 1,
    CONNECTION_TIMEOUT: 5000
  };

  constructor(options = {}) {
    // API Configuration
    this.baseUrl = options.baseUrl || '';
    this.authToken = options.authToken || '';
    this.speakerId = options.speakerId || '';
    this.config = options.config || {};

    // Dependencies
    this.sttManager = options.sttManager;
    this.MicrophoneStatusEnum = options.MicrophoneStatusEnum;
    this.setMicrophoneStatus = options.setMicrophoneStatus;

    // WebSocket
    this.wsRef = null;

    // Audio System
    this.audioContext = null;
    this.gainNode = null;
    this.audioQueue = [];
    this.currentAudioSource = null;
    this.isPlaying = false;

    // Initialize audio system
    this.resetAndPrepareAudio();
  }

  getWebSocketUrl() {
    return this.baseUrl?.replace(/^https?/, (protocol) => (protocol === 'https' ? 'wss' : 'ws')) + '/tts/realtime';
  }

  // --- API Methods ---
  
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
    this._cleanupAudioContext();
    this._initializeAudioContext();
    this._resetAudioState();
    this._resumeAudioContext();
    this._createGainNode();
  }

  _cleanupAudioContext() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }

  _initializeAudioContext() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  _resetAudioState() {
    this.isPlaying = false;
    this.audioQueue = [];
    this.gainNode = null;
  }

  _createGainNode() {
    try {
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = TTSManager.AUDIO_CONFIG.DEFAULT_VOLUME;
    } catch (error) {
      console.error('Error creating gain node:', error);
      this.gainNode = null;
    }
  }

  _resumeAudioContext() {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  onQueueProcessingRequest = () => {
    this.sttManager.stop()
    this.setMicrophoneStatus(this.MicrophoneStatusEnum.talking);
  };

  onQueueDone = () => {
    this.sttManager.start();
    this.setMicrophoneStatus(this.MicrophoneStatusEnum.recording);
    // Reset audio state
    this._resetAudioState();
  };

  // --- Audio Processing ---

  async processPCMData(pcmData) {
    try {
      const processedData = this._processPCMChunk(pcmData);
      const audioBuffer = this._createAudioBuffer(processedData);
      this._queueAndPlayAudio(audioBuffer);
    } catch (error) {
      console.error('Error processing PCM data:', error);
    }
  }

  _processPCMChunk(pcmData) {
    const validatedData = this._validatePCMData(pcmData);
    const pcmArray = new Int16Array(validatedData);
    const floatArray = this._convertPCMToFloat(pcmArray);
    this._applyFadeEffects(floatArray);
    return floatArray;
  }

  _validatePCMData(pcmData) {
    if (pcmData.byteLength % 2 !== 0) {
      console.warn('PCM data length is not multiple of 2, truncating...');
      const truncatedLength = pcmData.byteLength - (pcmData.byteLength % 2);
      const truncatedData = new ArrayBuffer(truncatedLength);
      new Uint8Array(truncatedData).set(new Uint8Array(pcmData, 0, truncatedLength));
      return truncatedData;
    }
    return pcmData;
  }

  _convertPCMToFloat(pcmArray) {
    const floatArray = new Float32Array(pcmArray.length);
    for (let i = 0; i < pcmArray.length; i++) {
      floatArray[i] = pcmArray[i] / 32768.0;
    }
    return floatArray;
  }

  _applyFadeEffects(floatArray) {
    this.applyFadeIn(floatArray, TTSManager.AUDIO_CONFIG.FADE_DURATION);
    this.applyFadeOut(floatArray, TTSManager.AUDIO_CONFIG.FADE_DURATION);
  }

  _createAudioBuffer(floatArray) {
    const audioBuffer = this.audioContext.createBuffer(
      TTSManager.AUDIO_CONFIG.CHANNELS,
      floatArray.length,
      TTSManager.AUDIO_CONFIG.SAMPLE_RATE
    );
    audioBuffer.copyToChannel(floatArray, 0);
    return audioBuffer;
  }

  _queueAndPlayAudio(audioBuffer) {
    this.audioQueue.push(audioBuffer);
    this.playNextInQueue();
  }

  // --- Audio Playback ---

  async playNextInQueue() {
    if (!this._canPlayNext()) return;

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift();

    try {
      await this.playAudioBuffer(audioBuffer);
    } catch (error) {
      console.error('Error playing audio:', error);
    } finally {
      this._handlePlaybackComplete();
    }
  }

  _canPlayNext() {
    return this.audioQueue.length > 0 && !this.isPlaying;
  }

  _handlePlaybackComplete() {
    this.isPlaying = false;
    if (this.audioQueue.length > 0) {
      this.playNextInQueue();
    } else {
      this.onQueueDone();
    }
  }

  // --- Audio Effects ---

  applyFadeIn(audioData, fadeTime) {
    const fadeLength = this._calculateFadeLength(fadeTime, audioData.length);
    
    for (let i = 0; i < fadeLength; i++) {
      const fadeGain = i / fadeLength;
      audioData[i] *= fadeGain;
    }
  }

  applyFadeOut(audioData, fadeTime) {
    const fadeLength = this._calculateFadeLength(fadeTime, audioData.length);
    const startIndex = audioData.length - fadeLength;
    
    for (let i = startIndex; i < audioData.length; i++) {
      const fadeGain = (audioData.length - i) / fadeLength;
      audioData[i] *= fadeGain;
    }
  }

  _calculateFadeLength(fadeTime, dataLength) {
    const fadeSamples = Math.floor(fadeTime * TTSManager.AUDIO_CONFIG.SAMPLE_RATE);
    return Math.min(fadeSamples, dataLength);
  }

  async playAudioBuffer(audioBuffer) {
    return new Promise(async (resolve) => {
      await this._ensureAudioContextResumed();
      
      const source = this._createAudioSource(audioBuffer);
      source.onended = () => resolve();
      source.start();
    });
  }

  async _ensureAudioContextResumed() {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  _createAudioSource(audioBuffer) {
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Ensure gainNode exists before connecting
    if (this.gainNode) {
      source.connect(this.gainNode);
    } else {
      // Fallback to direct connection if gainNode is not available
      source.connect(this.audioContext.destination);
    }
    
    return source;
  }

  // --- WebSocket Connection ---

  connect() {
    try {
      const websocket = this._createWebSocket();
      this._setupWebSocketHandlers(websocket);
    } catch (error) {
      console.error('Error connecting to TTS:', error);
      alert(`Error connecting to TTS: ${error.message}`);
    }
  }

  _createWebSocket() {
    const websocket = new WebSocket(this.getWebSocketUrl());
    this.wsRef = websocket;
    websocket.binaryType = "arraybuffer";
    return websocket;
  }

  _setupWebSocketHandlers(websocket) {
    const connectionTimeout = this._createConnectionTimeout(websocket);
    
    websocket.onopen = () => {
      console.log('Connection established, waiting for success message...');
      clearTimeout(connectionTimeout);
    };

    websocket.onmessage = (event) => this._handleWebSocketMessage(event);
    websocket.onerror = (event) => this._handleWebSocketError(event);
    websocket.onclose = (event) => this._handleWebSocketClose(event);
  }

  _createConnectionTimeout(websocket) {
    return setTimeout(() => {
      if (websocket.readyState !== WebSocket.OPEN) {
        websocket.close();
        alert('TTS Connection timeout after 5 seconds');
      }
    }, TTSManager.AUDIO_CONFIG.CONNECTION_TIMEOUT);
  }

  async _handleWebSocketMessage(event) {
    try {
      if (event.data instanceof ArrayBuffer) {
        await this.processPCMData(event.data);
        this.onQueueProcessingRequest();
        return;
      }
      const message = JSON.parse(event.data);
      this.handleJsonMessage(message);
    } catch (error) {
      console.error('Error processing message:', error);
      if (this._isFatalError(error)) {
        this.wsRef?.close();
      }
    }
  }

  _isFatalError(error) {
    return error.message?.includes('fatal') || error.message?.includes('connection');
  }

  _handleWebSocketError(event) {
    console.error('WebSocket TTS error:', event);
    this.disconnect();
  }

  _handleWebSocketClose(event) {
    console.log(`Connection WebSocket TTS closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
    this.disconnect();
    if (event.code === 1000) {
      alert('Error connecting to TTS: Connection timeout');
    }
  }

  disconnect() {
    this._closeWebSocket();
    this._stopCurrentAudio();
    this._cleanupAudioContext();
    this._resetAudioState();
  }

  _closeWebSocket() {
    if (this.wsRef && this.wsRef.readyState === WebSocket.OPEN) {
      this.wsRef.close();
      this.wsRef = null;
    }
  }

  _stopCurrentAudio() {
    if (this.currentAudioSource) {
      this.currentAudioSource.stop();
      this.currentAudioSource = null;
    }
  }

  // --- Messaging and State Handling ---

  sendText(text) {
    if (!this._canSendText(text)) {
      throw new Error('Cannot send text');
    }

    const queryMessage = this._createQueryMessage(text);
    this.wsRef.send(JSON.stringify(queryMessage));
  }

  _canSendText(text) {
    return text && this.wsRef && this.wsRef.readyState === WebSocket.OPEN;
  }

  _createQueryMessage(text) {
    return {
      query: text,
      normalization: this.config.normalization || 'basic',
      language: this.config.language || 'vi',
      audio_format: this.config.audioFormat || 'pcm',
      audio_quality: this.config.audioQuality || 32,
      audio_speed: this.config.audioSpeed || '1',
      speaker_id: this.speakerId,
    };
  }

  handleJsonMessage(message) {
    const messageHandlers = {
      'successful-connection': () => this._handleSuccessfulConnection(),
      'successful-authentication': () => this._handleSuccessfulAuthentication(),
      'started-byte-stream': () => this._handleStartedByteStream(),
      'finished-byte-stream': () => this._handleFinishedByteStream(),
    };

    const handler = messageHandlers[message?.type];
    if (handler) {
      handler();
    } else {
      console.log('Unhandled message type:', message?.type);
    }
  }

  _handleSuccessfulConnection() {
    console.log('Connection successful, sending authentication...');
    if (this.wsRef?.readyState === WebSocket.OPEN) {
      const authMessage = {
        token: this.authToken,
        strategy: 'token',
      };
      this.wsRef.send(JSON.stringify(authMessage));
    }
  }

  _handleSuccessfulAuthentication() {
    if (this.wsRef?.readyState === WebSocket.OPEN) {
      this._sendInitialMessages();
    }
  }

  _sendInitialMessages() {
    setTimeout(() => {
      this.sendText('Xin chào, tôi là một trợ lý ảo.');
    }, 100);
    
    setTimeout(() => {
      this.sendText('Bạn có thể giúp tôi với một số thông tin không?');
    }, 500);
  }

  _handleStartedByteStream() {
    // No action needed
  }

  _handleFinishedByteStream() {
    console.log('Audio stream finished, processing audio...');
    
  }

  // --- Configuration Setters ---

  setAuthToken(token) {
    this.authToken = token;
  }

  setSpeakerId(speakerId) {
    this.speakerId = speakerId;
  }
}

export {TTSManager};
