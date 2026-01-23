// Game configuration constants

export const GAME_CONFIG = {
  boardWidth: 360,
  boardHeight: 640,
  birdWidth: 34,
  birdHeight: 24,
  pipeWidth: 64,
  pipeHeight: 512,
  gravity: 0.3,
  velocityX: -2,
  initialVelocityY: -4,
  victoryLevel: 2,
};

export const AUDIO_CONFIG = {
  bgmVolume: 0.2,
  sfxWinVolume: 0.2,
};

export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const CONFETTI_COLORS = [
  "#f2d74e",
  "#95c3de",
  "#ff9a91",
  "#f2d74e",
  "#a1cc85",
  "#be91ff",
];

export const AUDIO_PATHS = {
  bgm: "./SFX/bgm_mario.mp3",
  wing: "./SFX/sfx_wing.wav",
  point: "./SFX/sfx_point.wav",
  hit: "./SFX/sfx_hit.wav",
  die: "./SFX/sfx_die.wav",
  swooshing: "./SFX/sfx_swooshing.wav",
  win: "./SFX/win.mp3",
};

export const IMAGE_PATHS = {
  bird: "./Images/flappybird.png",
  topPipe: "./Images/toppipe.png",
  bottomPipe: "./Images/bottompipe.png",
  background: "./Images/flappybirdbg.png",
};
