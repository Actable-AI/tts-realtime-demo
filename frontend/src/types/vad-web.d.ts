declare module '@ricky0123/vad-web' {
  export class MicVAD {
    static new(options: {
      onSpeechStart: () => void;
      onSpeechEnd: (audio: Float32Array) => void;
    }): Promise<MicVAD>;
    start(): Promise<void>;
    stop(): Promise<void>;
  }
} 