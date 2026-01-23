import { GAME_CONFIG, IMAGE_PATHS, CONFETTI_COLORS } from "./config";
import { detectCollision } from "./utils";
import type { GameState, Pipe, Confetti } from "./types";
import * as audio from "./audio";
import * as firebase from "./firebase";

// Game state
export const gameState: GameState = {
  bird: {
    x: GAME_CONFIG.boardWidth / 8,
    y: GAME_CONFIG.boardHeight / 2,
    width: GAME_CONFIG.birdWidth,
    height: GAME_CONFIG.birdHeight,
    velocity: GAME_CONFIG.initialVelocityY,
  },
  pipes: [],
  confetti: [],
  score: 0,
  gameStarted: false,
  gameOver: false,
  gameWon: false,
};

// Canvas and images
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let birdImg: HTMLImageElement;
let topPipeImg: HTMLImageElement;
let bottomPipeImg: HTMLImageElement;

// Intervals
let pipeInterval: number | null = null;
let animationFrameId: number | null = null;

export function initGame(canvasElement: HTMLCanvasElement): void {
  canvas = canvasElement;
  ctx = canvas.getContext("2d")!;

  // Load images
  birdImg = new Image();
  birdImg.src = IMAGE_PATHS.bird;
  birdImg.onload = () => {
    ctx.drawImage(
      birdImg,
      gameState.bird.x,
      gameState.bird.y,
      gameState.bird.width,
      gameState.bird.height
    );
  };

  topPipeImg = new Image();
  topPipeImg.src = IMAGE_PATHS.topPipe;

  bottomPipeImg = new Image();
  bottomPipeImg.src = IMAGE_PATHS.bottomPipe;
}

export function startGame(): void {
  if (!gameState.gameStarted) {
    gameState.gameStarted = true;
    // Give a stronger headstart impulse
    gameState.bird.velocity = GAME_CONFIG.initialVelocityY * 1.5;

    // Start pipe generation
    pipeInterval = window.setInterval(() => {
      placePipes();
    }, 2700);

    // Only start the loop if it's not already running
    if (!animationFrameId) {
      update();
    }
  }
}

export function resetGame(): void {
  // Clear any existing animation loop first
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  gameState.bird.y = GAME_CONFIG.boardHeight / 2;
  gameState.bird.velocity = GAME_CONFIG.initialVelocityY;
  gameState.pipes = [];
  gameState.confetti = [];
  gameState.score = 0;
  gameState.gameOver = false;
  gameState.gameWon = false;
  gameState.gameStarted = false;

  if (pipeInterval) {
    clearInterval(pipeInterval);
    pipeInterval = null;
  }
}

export function stopGame(): void {
  gameState.gameStarted = false;
  if (pipeInterval) {
    clearInterval(pipeInterval);
    pipeInterval = null;
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function update(): void {
  animationFrameId = requestAnimationFrame(update);

  if (gameState.gameOver && !gameState.gameWon) {
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Victory state
  if (gameState.gameWon) {
    ctx.drawImage(
      birdImg,
      gameState.bird.x,
      gameState.bird.y,
      gameState.bird.width,
      gameState.bird.height
    );

    for (const pipe of gameState.pipes) {
      ctx.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);
    }

    updateAndDrawConfetti();
    return;
  }

  // Not started
  if (!gameState.gameStarted) {
    ctx.drawImage(
      birdImg,
      gameState.bird.x,
      gameState.bird.y,
      gameState.bird.width,
      gameState.bird.height
    );
    return;
  }

  // Process voice input
  const voiceInput = audio.getVoiceInput();
  if (voiceInput) {
    const VOLUME_THRESHOLD = 0.2;

    if (voiceInput.volume > VOLUME_THRESHOLD) {
      const baseForce = -4;
      const sharpnessMultiplier = 0.8 + voiceInput.sharpness * 0.6;
      gameState.bird.velocity = baseForce * sharpnessMultiplier;
      audio.playSFX(audio.sfxWing);
    }
  }

  // Update bird
  gameState.bird.velocity += GAME_CONFIG.gravity;
  gameState.bird.y = Math.max(gameState.bird.y + gameState.bird.velocity, 0);
  ctx.drawImage(
    birdImg,
    gameState.bird.x,
    gameState.bird.y,
    gameState.bird.width,
    gameState.bird.height
  );

  // Check if bird fell off screen
  if (gameState.bird.y > canvas.height) {
    handleGameOver();
  }

  // Update pipes
  for (let i = gameState.pipes.length - 1; i >= 0; i--) {
    const pipe = gameState.pipes[i];
    pipe.x += GAME_CONFIG.velocityX;
    ctx.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);

    // Score when passing pipe
    if (!pipe.passed && gameState.bird.x > pipe.x + pipe.width) {
      gameState.score += 0.5;
      pipe.passed = true;
      if (gameState.score % 1 === 0) {
        audio.playSFX(audio.sfxPoint);
      }
    }

    // Collision detection
    if (detectCollision(gameState.bird, pipe)) {
      handleGameOver();
    }

    // Remove off-screen pipes
    if (pipe.x < -GAME_CONFIG.pipeWidth) {
      gameState.pipes.splice(i, 1);
    }
  }

  // Draw score
  ctx.fillStyle = "white";
  ctx.font = "45px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(gameState.score.toString(), 5, 45);

  // Check for victory
  if (!gameState.gameWon && gameState.score >= GAME_CONFIG.victoryLevel) {
    handleVictory();
  }
}

function placePipes(): void {
  if (gameState.gameOver || !gameState.gameStarted) {
    return;
  }

  const randomPipeY =
    -GAME_CONFIG.pipeHeight / 4 - Math.random() * (GAME_CONFIG.pipeHeight / 2);
  const openingSpace = canvas.height / 3;

  // Top pipe
  gameState.pipes.push({
    img: topPipeImg,
    x: GAME_CONFIG.boardWidth,
    y: randomPipeY,
    width: GAME_CONFIG.pipeWidth,
    height: GAME_CONFIG.pipeHeight,
    passed: false,
  });

  // Bottom pipe
  gameState.pipes.push({
    img: bottomPipeImg,
    x: GAME_CONFIG.boardWidth,
    y: randomPipeY + GAME_CONFIG.pipeHeight + openingSpace,
    width: GAME_CONFIG.pipeWidth,
    height: GAME_CONFIG.pipeHeight,
    passed: false,
  });
}

function handleGameOver(): void {
  if (gameState.gameOver) return;

  gameState.gameOver = true;
  audio.pauseBGM();
  audio.playSFX(audio.sfxHit);
  setTimeout(() => audio.playSFX(audio.sfxDie), 500);

  firebase.saveScore(gameState.score);

  if (pipeInterval) {
    clearInterval(pipeInterval);
    pipeInterval = null;
  }
}

function handleVictory(): void {
  if (gameState.gameOver) return;

  gameState.gameOver = true;
  gameState.gameWon = true;
  audio.pauseBGM();
  audio.playSFX(audio.sfxWin);
  initConfetti();

  firebase.saveScore(gameState.score);

  if (pipeInterval) {
    clearInterval(pipeInterval);
    pipeInterval = null;
  }
}

function initConfetti(): void {
  gameState.confetti = [];
  for (let i = 0; i < 100; i++) {
    gameState.confetti.push({
      x: Math.random() * GAME_CONFIG.boardWidth,
      y: Math.random() * GAME_CONFIG.boardHeight - GAME_CONFIG.boardHeight,
      size: Math.random() * 7 + 5,
      color:
        CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      speedY: Math.random() * 3 + 2,
      speedX: Math.random() * 2 - 1,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 10 - 5,
    });
  }
}

function updateAndDrawConfetti(): void {
  for (const particle of gameState.confetti) {
    particle.y += particle.speedY;
    particle.x += particle.speedX;
    particle.rotation += particle.rotationSpeed;

    if (particle.y > GAME_CONFIG.boardHeight) {
      particle.y = -20;
      particle.x = Math.random() * GAME_CONFIG.boardWidth;
    }

    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate((particle.rotation * Math.PI) / 180);
    ctx.fillStyle = particle.color;
    ctx.fillRect(
      -particle.size / 2,
      -particle.size / 2,
      particle.size,
      particle.size
    );
    ctx.restore();
  }
}

export function getScore(): number {
  return Math.floor(gameState.score);
}

export function isGameOver(): boolean {
  return gameState.gameOver;
}

export function isVictory(): boolean {
  return gameState.gameWon;
}
