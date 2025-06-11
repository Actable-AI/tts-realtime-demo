// DOM Elements
export const authTokenInput = document.getElementById('authToken');
export const openApiKeyInput = document.getElementById('openApiKey');
export const promptTextarea = document.getElementById('prompt');
export const speakerSelect = document.getElementById('speaker');
export const messageTextarea = document.getElementById('message');
export const startButton = document.getElementById('startButton');
export const resetButton = document.getElementById('resetButton');
export const audioElement = document.getElementById('audioElement');

export const MicrophoneStatusEnum = {
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

// State Management
export let isStartRecording = false;
export let microphoneStatus = MicrophoneStatusEnum.idle;
export let authToken = '';
export let openApiKey = '';
export let prompt = '';
export let currentSpeaker = '';
export let arrAudioChunks = [];
export let isProcessingTts = false;

// Helper Functions
export const setMicrophoneStatus = (status) => {
  microphoneStatus = status;
  updateUI();
};

export const setCurrentSpeaker = (speakerId) => {
  currentSpeaker = speakerId;
  updateUI();
};

export const setAuthToken = (token) => {
  authToken = token;
  updateUI();
};

export const setIsStartRecording = (value) => {
  isStartRecording = value;
  updateUI();
};

const checkRecordingConditions = () => {
  return disabledMicrophoneStatuses.includes(microphoneStatus) ||
    !authToken ||
    !currentSpeaker ||
    !openApiKey ||
    !prompt;
};

// Helper Functions
export const updateUI = () => {
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

// Audio State Management
export const addAudioChunk = (audioUrl) => {
  arrAudioChunks.push(audioUrl);
};

export const getNextAudioChunk = () => {
  return arrAudioChunks.shift();
};

export const hasAudioChunks = () => {
  return arrAudioChunks.length > 0;
};

export const setProcessingTTS = (value) => {
  isProcessingTts = value;
};

export const isProcessingTTS = () => {
  return isProcessingTts;
};

// Event Listeners
export const initializeEventListeners = () => {
  openApiKeyInput.addEventListener('input', (e) => {
    openApiKey = e.target.value.trim();
    updateUI();
  });

  promptTextarea.addEventListener('input', (e) => {
    prompt = e.target.value.trim();
    updateUI();
  });

  speakerSelect.addEventListener('change', (e) => {
    currentSpeaker = e.target.value;
  });
};

// Initialize APP
export const initializeApp = () => {
  promptTextarea.value = window.APP_CONFIG.llm.defaultPrompt;
  prompt = window.APP_CONFIG.llm.defaultPrompt;
}; 