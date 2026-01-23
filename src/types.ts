// Type definitions

export type Position = {
  x: number;
  y: number;
};

export type Size = {
  width: number;
  height: number;
};

export type GameObject = Position & Size;

export type Bird = GameObject & {
  velocity: number;
};

export type Pipe = GameObject & {
  img: HTMLImageElement;
  passed: boolean;
};

export type Confetti = {
  x: number;
  y: number;
  size: number;
  color: string;
  speedY: number;
  speedX: number;
  rotation: number;
  rotationSpeed: number;
};

export type User = {
  id: string;
  username: string;
  email?: string;
  totalGames?: number;
};

export type GameState = {
  bird: Bird;
  pipes: Pipe[];
  confetti: Confetti[];
  score: number;
  gameStarted: boolean;
  gameOver: boolean;
  gameWon: boolean;
  crashLocation: Position | null;
};

export type AudioState = {
  context: AudioContext | null;
  analyser: AnalyserNode | null;
  microphone: MediaStreamAudioSourceNode | null;
  dataArray: Uint8Array | null;
  bufferLength: number;
  initialized: boolean;
  muted: boolean;
};
