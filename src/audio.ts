import { AUDIO_CONFIG, AUDIO_PATHS } from "./config";
import type { AudioState } from "./types";

// Audio state
export const audioState: AudioState = {
  context: null,
  analyser: null,
  microphone: null,
  dataArray: null,
  bufferLength: 0,
  initialized: false,
  muted: false,
};

// Audio elements
export const bgm = new Audio(AUDIO_PATHS.bgm);
bgm.loop = true;
bgm.volume = AUDIO_CONFIG.bgmVolume;

export const sfxWing = new Audio(AUDIO_PATHS.wing);
export const sfxPoint = new Audio(AUDIO_PATHS.point);
export const sfxHit = new Audio(AUDIO_PATHS.hit);
export const sfxDie = new Audio(AUDIO_PATHS.die);
export const sfxSwooshing = new Audio(AUDIO_PATHS.swooshing);
export const sfxWin = new Audio(AUDIO_PATHS.win);
sfxWin.volume = AUDIO_CONFIG.sfxWinVolume;

export async function initAudio(): Promise<void> {
  if (audioState.initialized) return;

  try {
    audioState.context = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    audioState.analyser = audioState.context.createAnalyser();
    audioState.analyser.fftSize = 2048;
    audioState.bufferLength = audioState.analyser.frequencyBinCount;
    audioState.dataArray = new Uint8Array(audioState.bufferLength);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioState.microphone = audioState.context.createMediaStreamSource(stream);
    audioState.microphone.connect(audioState.analyser);

    audioState.initialized = true;
    console.log("Audio initialized successfully!");
  } catch (err) {
    console.error("Error accessing microphone:", err);
    alert("Please allow microphone access to use voice control!");
  }
}

export function getVoiceInput(): { volume: number; sharpness: number } | null {
  if (
    !audioState.initialized ||
    !audioState.analyser ||
    !audioState.dataArray
  ) {
    return null;
  }

  audioState.analyser.getByteFrequencyData(audioState.dataArray as any);

  // Calculate volume (RMS)
  let sum = 0;
  for (let i = 0; i < audioState.bufferLength; i++) {
    sum += audioState.dataArray[i] * audioState.dataArray[i];
  }
  const rms = Math.sqrt(sum / audioState.bufferLength);
  const volume = rms / 128.0;

  // Calculate sharpness (Spectral Centroid)
  let weightedSum = 0;
  let magnitudeSum = 0;
  for (let i = 0; i < audioState.bufferLength; i++) {
    weightedSum += audioState.dataArray[i] * i;
    magnitudeSum += audioState.dataArray[i];
  }
  const spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  const sharpness = spectralCentroid / audioState.bufferLength;

  return { volume, sharpness };
}

export function playSFX(audio: HTMLAudioElement): void {
  if (audioState.muted) return;
  audio.currentTime = 0;
  audio.play().catch((e) => console.log("SFX play error:", e));
}

export function toggleMute(): boolean {
  audioState.muted = !audioState.muted;
  bgm.muted = audioState.muted;
  return audioState.muted;
}

export function playBGM(restart: boolean = true): void {
  if (restart) {
    bgm.currentTime = 0;
  }
  bgm.play().catch((e) => console.log("BGM play error:", e));
}

export function pauseBGM(): void {
  bgm.pause();
  bgm.currentTime = 0;
}

export function pauseWin(): void {
  sfxWin.pause();
  sfxWin.currentTime = 0;
}
