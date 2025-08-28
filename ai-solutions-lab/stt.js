class STTManager {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '';
    this.authToken = options.authToken || '';
    this.onTextReceived = options.onTextReceived || (() => {});
    this.vadRef = null;
    this.config = options.config || {};
    this.audioElement = options.audioElement;
    this.clearAudioChunks = options.clearAudioChunks;
    this.arrAbortControllers = options.arrAbortControllers;
  }

  async handleStt(wavBuffer) {
    try {
      const headers = {
        Authorization: `Bearer ${this.authToken}`,
      };

      const audioBlob = new Blob([wavBuffer], {type: 'audio/wav'});
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'audio.wav');

      let controller;
      if (Array.isArray(this.arrAbortControllers)) {
        controller = new AbortController();
        this.arrAbortControllers.push(controller);
      }

      const response = await fetch(`${this.baseUrl}/v1/stt/execute?lazy_process=${this.config.lazyProcess || false}`, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller ? controller.signal : undefined
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const text = result?.result?.data?.raw_text;
      this.onTextReceived(text);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('STT Error:', error);
    }
  }

  async initializeVAD() {
    try {
      this.vadRef = await vad.MicVAD.new({
        onSpeechStart: () => {
          console.log('Speech start detected');
          // Stop audioElement and clear arrAudioChunks via injected references
          try {
            if (this.audioElement) {
              this.audioElement.pause();
              this.audioElement.currentTime = 0;
            }
            if (typeof this.clearAudioChunks === 'function') {
              this.clearAudioChunks();
            }
          } catch (e) {
            console.error('Error stopping audio/clearing chunks:', e);
          }
        },
        onSpeechEnd: (audio) => {
          console.log('Speech end detected');
          const wavBuffer = vad.utils.encodeWAV(audio);
          this.handleStt(wavBuffer);
        },
      });
    } catch (error) {
      console.error('VAD initialization error:', error);
    }
  }

  async start() {
    if (this.vadRef) {
      await this.vadRef.start();
    } else {
      await this.initializeVAD();
      await this.vadRef.start();
    }
  }

  async stop() {
    if (this.vadRef) {
      await this.vadRef.destroy();
      this.vadRef = null;
    }
  }

  setAuthToken(token) {
    this.authToken = token;
  }
}

export {STTManager};