class STTManager {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '';
    this.authToken = options.authToken || '';
    this.onTextReceived = options.onTextReceived || (() => {
    });
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

      const response = await fetch(`${this.baseUrl}/stt/execute?lazy_process=false`, {
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
      alert(`STT Error: ${error.message}`);
    }
  }

  setAuthToken(token) {
    this.authToken = token;
  }
}

export {STTManager};