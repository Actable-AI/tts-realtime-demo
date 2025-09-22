class STTManager {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '';
    this.authToken = options.authToken || '';
    this.onTextReceived = options.onTextReceived || (() => {
    });
    this.vadRef = null;
    this.config = options.config || {};
  }

  async handleStt(wavBuffer) {
    try {
      const headers = {
        Authorization: `Bearer ${this.authToken}`,
      };

      const audioBlob = new Blob([wavBuffer], {type: 'audio/wav'});
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'audio.wav');

      const response = await fetch(`${this.baseUrl}/stt/transcribe`, {
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
      const text = result?.result?.data?.raw_text;
      this.onTextReceived(text);
    } catch (error) {
      console.error('STT Error:', error);
    }
  }

  async initializeVAD() {
    try {
      this.vadRef = await vad.MicVAD.new({
        onSpeechStart: () => {
          console.log('Speech start detected');
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