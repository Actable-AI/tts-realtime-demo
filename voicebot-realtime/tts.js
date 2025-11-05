class TTSManager {
  static AUDIO_CONFIG = {
    SAMPLE_RATE: 24000,
    CHANNELS: 1,
    FADE_DURATION: 0.01, // 10ms
    DEFAULT_VOLUME: 1,
    CONNECTION_TIMEOUT: 5000
  };

  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '';
    this.authToken = options.authToken || '';
    this.speakerId = options.speakerId || '';
    this.onAudioReceived = options.onAudioReceived || (() => {});
    this.wsRef = null;
    this.config = options.config || {};

    // Dependencies
    this.sttManager = options.sttManager;
    this.MicrophoneStatusEnum = options.MicrophoneStatusEnum;
    this.setMicrophoneStatus = options.setMicrophoneStatus;

    // MP3 state (chunks for blob assembly)
    this.audioChunks = [];

    // PCM state (AudioContext and queue)
    this.audioContext = null;
    this.gainNode = null;
    this.audioQueue = [];
    this.currentAudioSource = null;
    this.isPlaying = false;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getWebSocketUrl() {
    return this.baseUrl?.replace(/^https?/, (protocol) => (protocol === 'https' ? 'wss' : 'ws')) + '/tts/realtime';
  }

  getAudioFormat() {
    return this.config.audioFormat || 'mp3';
  }

  isPCMFormat() {
    return this.getAudioFormat() === 'pcm';
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

  // ============================================================================
  // PCM AUDIO CONTEXT MANAGEMENT
  // ============================================================================

  _initializePCMAudioSystem() {
    this._cleanupAudioContext();
    this._createAudioContext();
    this._resetPCMState();
    this._resumeAudioContext();
    this._createGainNode();
  }

  _cleanupAudioContext() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.audioContext = null;
  }

  _createAudioContext() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  _resetPCMState() {
    this.isPlaying = false;
    this.audioQueue = [];
    this.gainNode = null;
    this.currentAudioSource = null;
  }

  _createGainNode() {
    try {
      if (!this.audioContext) return;
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = TTSManager.AUDIO_CONFIG.DEFAULT_VOLUME;
    } catch (error) {
      console.error('Error creating gain node:', error);
      this.gainNode = null;
    }
  }

  _resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  _stopCurrentAudio() {
    if (this.currentAudioSource) {
      this.currentAudioSource.stop();
      this.currentAudioSource = null;
    }
  }

  // ============================================================================
  // PCM AUDIO PROCESSING
  // ============================================================================

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
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }
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
    this._playNextInQueue();
  }

  // ============================================================================
  // PCM AUDIO PLAYBACK
  // ============================================================================

  async _playNextInQueue() {
    if (!this._canPlayNext()) return;

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift();

    try {
      await this._playAudioBuffer(audioBuffer);
    } catch (error) {
      console.error('Error playing audio:', error);
    } finally {
      this._handlePlaybackComplete();
    }
  }

  _canPlayNext() {
    return this.audioQueue.length > 0 && !this.isPlaying && this.audioContext;
  }

  _handlePlaybackComplete() {
    this.isPlaying = false;
    if (this.audioQueue.length > 0) {
      this._playNextInQueue();
    } else {
      this._onPCMQueueDone();
    }
  }

  _onPCMQueueDone() {
    if (this.sttManager) {
      this.sttManager.start();
    }
    if (this.setMicrophoneStatus && this.MicrophoneStatusEnum) {
      this.setMicrophoneStatus(this.MicrophoneStatusEnum.recording);
    }
    this._resetPCMState();
  }

  _onPCMQueueProcessing() {
    if (this.sttManager) {
      this.sttManager.stop();
    }
    if (this.setMicrophoneStatus && this.MicrophoneStatusEnum) {
      this.setMicrophoneStatus(this.MicrophoneStatusEnum.talking);
    }
  }

  async _playAudioBuffer(audioBuffer) {
    return new Promise(async (resolve) => {
      await this._ensureAudioContextResumed();
      
      const source = this._createAudioSource(audioBuffer);
      this.currentAudioSource = source;
      source.onended = () => resolve();
      source.start();
    });
  }

  async _ensureAudioContextResumed() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  _createAudioSource(audioBuffer) {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    if (this.gainNode) {
      source.connect(this.gainNode);
    } else {
      source.connect(this.audioContext.destination);
    }
    
    return source;
  }

  // ============================================================================
  // PCM AUDIO EFFECTS
  // ============================================================================

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

  // ============================================================================
  // MP3 AUDIO HANDLING
  // ============================================================================

  _handleMP3Blob(blob) {
    this.audioChunks.push(blob);
  }

  _handleMP3StreamStart() {
    this.audioChunks = [];
  }

  _handleMP3StreamFinish() {
    if (this.audioChunks.length === 0) return;
    
    const currentChunks = [...this.audioChunks];
    const audioBlob = new Blob(currentChunks, {type: 'audio/mp3'});
    const audioUrl = URL.createObjectURL(audioBlob);
    this.onAudioReceived(audioUrl);
    this.audioChunks = [];
  }

  // ============================================================================
  // WEBSOCKET MESSAGE HANDLING
  // ============================================================================

  _handleWebSocketMessage(event) {
    try {
      // Handle PCM binary data
      if (this.isPCMFormat() && event.data instanceof ArrayBuffer) {
        this.processPCMData(event.data);
        this._onPCMQueueProcessing();
        return;
      }

      // Handle MP3 blob data
      if (event.data instanceof Blob) {
        this._handleMP3Blob(event.data);
        return;
      }

      // Handle JSON messages
      const message = JSON.parse(event.data);
      this._handleJsonMessage(message);
    } catch (error) {
      console.error('Error processing message:', error);
      if (error.message?.includes('fatal') || error.message?.includes('connection')) {
        if (this.wsRef) {
          this.wsRef.close();
        }
      }
    }
  }

  _handleJsonMessage(message) {
    switch (message?.type) {
      case 'successful-connection':
        this._handleSuccessfulConnection();
        break;

      case 'successful-authentication':
        this._handleSuccessfulAuthentication();
        break;

      case 'started-byte-stream':
        this._handleStartedByteStream();
        break;

      case 'finished-byte-stream':
        this._handleFinishedByteStream();
        break;

      default:
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
      this.sendEvent('start-session');

      setTimeout(() => {
        this.sendText('Xin chào,');
      }, 100);

      setTimeout(() => {
        this.sendText('Tôi là một trợ lý ảo. Bạn có thể giúp tôi với một số thông tin không?');
      }, 500);

      this.sendEvent('end-session');
    }
  }

  _handleStartedByteStream() {
    if (this.isPCMFormat()) {
      return; // PCM doesn't use byte stream events
    }
    this._handleMP3StreamStart();
  }

  _handleFinishedByteStream() {
    if (this.isPCMFormat()) {
      return; // PCM doesn't use byte stream events
    }
    console.log('Audio stream finished, processing audio...');
    this._handleMP3StreamFinish();
  }

  // ============================================================================
  // WEBSOCKET CONNECTION MANAGEMENT
  // ============================================================================

  connect() {
    try {
      // Initialize PCM audio system if needed
      if (this.isPCMFormat()) {
        this._initializePCMAudioSystem();
      }
      
      const websocket = new WebSocket(this.getWebSocketUrl());
      this.wsRef = websocket;

      // Set binary type based on format
      if (this.isPCMFormat()) {
        websocket.binaryType = "arraybuffer";
      } else {
        websocket.binaryType = "blob";
      }

      const connectionTimeout = setTimeout(() => {
        if (websocket.readyState !== WebSocket.OPEN) {
          websocket.close();
          alert('TTS Connection timeout after 5 seconds');
        }
      }, TTSManager.AUDIO_CONFIG.CONNECTION_TIMEOUT);

      websocket.onopen = () => {
        console.log('Connection established, waiting for success message...');
        clearTimeout(connectionTimeout);
      };

      websocket.onmessage = (event) => {
        this._handleWebSocketMessage(event);
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
      alert(`Error connecting to TTS: ${error.message}`);
    }
  }

  disconnect() {
    // Close WebSocket
    if (this.wsRef && this.wsRef.readyState === WebSocket.OPEN) {
      this.wsRef.close();
    }
    this.wsRef = null;

    // Cleanup MP3 state
    this.audioChunks = [];

    // Cleanup PCM state
    this._stopCurrentAudio();
    this._cleanupAudioContext();
    this._resetPCMState();
  }

  // ============================================================================
  // WEBSOCKET MESSAGE SENDING
  // ============================================================================

  sendEvent(event) {
    if (!event || !this.wsRef || this.wsRef.readyState !== WebSocket.OPEN) {
      throw new Error('Cannot send event');
    }

    const queryEvent = { event };
    this.wsRef.send(JSON.stringify(queryEvent));
  }

  async sendText(text) {
    if (!text || !this.wsRef || this.wsRef.readyState !== WebSocket.OPEN) {
      throw new Error('Cannot send text');
    }

    const queryMessage = {
      query: text,
      normalization: this.config.normalization || 'basic',
      language: this.config.language || 'vi',
      audio_format: this.getAudioFormat(),
      audio_quality: this.config.audioQuality || 32,
      audio_speed: this.config.audioSpeed || '1',
      speaker_id: this.speakerId,
      model: this.config.model || 'v1.5_pro',
    };
    this.wsRef.send(JSON.stringify(queryMessage));
  }

  // ============================================================================
  // CONFIGURATION METHODS
  // ============================================================================

  setAuthToken(token) {
    this.authToken = token;
  }

  setSpeakerId(speakerId) {
    this.speakerId = speakerId;
  }

  setAudioFormat(format) {
    const wasPCM = this.isPCMFormat();
    this.config.audioFormat = format;
    const isPCM = this.isPCMFormat();
    
    // Only handle format change if WebSocket is connected
    if (!this.wsRef || this.wsRef.readyState !== WebSocket.OPEN) {
      return;
    }

    // Switching to PCM: initialize audio system
    if (isPCM && !wasPCM) {
      this._initializePCMAudioSystem();
      this.wsRef.binaryType = "arraybuffer";
    }
    
    // Switching from PCM to MP3: cleanup audio system
    if (!isPCM && wasPCM) {
      this._stopCurrentAudio();
      this._cleanupAudioContext();
      this._resetPCMState();
      this.wsRef.binaryType = "blob";
    }
  }
}

export {TTSManager};
