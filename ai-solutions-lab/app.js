// DOM Elements
export const messageTextarea = document.getElementById('message');
export const startButton = document.getElementById('startButton');
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
export let authToken = '518d2578c05685d9316dc64c380ceee96bc3cbcd';
export let openApiKey = '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';
export let prompt = '';
export let currentSpeaker = 'HN-Nu-2-BL';
export let arrAudioChunks = [];
export let isProcessingTts = false;
export const arrAbortControllers = [];

// Helper Functions
export const setMicrophoneStatus = (status) => {
  microphoneStatus = status;
  updateUI();
};

export const setAuthToken = (token) => {
  authToken = token;
  updateUI();
};

export const setOpenApiKey = (apiKey) => {
  openApiKey = apiKey;
  updateUI();
};

export const setPrompt = (prompt) => {
  openApiKey = prompt;
  updateUI();
};

export const setCurrentSpeaker = (speakerId) => {
  currentSpeaker = speakerId;
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
  // Disable input fields when recording
  startButton.disabled = checkRecordingConditions() || isLoading;

  const faMicrophoneIcon = document.getElementById('faMicrophone');
  const faPauseIcon = document.getElementById('faPause');
  if (isStartRecording) {
    startButton.classList.add('active');
    faMicrophoneIcon.classList.remove('active');
    faPauseIcon.classList.add('active');
  } else {
    startButton.classList.remove('active');
    faMicrophoneIcon.classList.add('active');
    faPauseIcon.classList.remove('active');
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

// Initialize APP
export const initializeApp = () => {
  prompt = window.APP_CONFIG.llm.defaultPrompt;
}; 

export const clearArrAudioChunks = () => {
  while (arrAbortControllers.length) {
    const ctrl = arrAbortControllers.pop();
    if (ctrl) ctrl.abort();
  }
  arrAudioChunks = [];
};