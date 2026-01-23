// Main application entry point - functional approach

import { GAME_CONFIG } from "./config";
import * as firebase from "./firebase";
import * as game from "./game";
import * as ui from "./ui";

function init(): void {
  // Initialize Firebase
  firebase.initFirebase();

  // Initialize canvas
  const canvas = document.getElementById("board") as HTMLCanvasElement;
  if (!canvas) {
    throw new Error("Canvas element not found");
  }

  canvas.width = GAME_CONFIG.boardWidth;
  canvas.height = GAME_CONFIG.boardHeight;

  // Initialize game
  game.initGame(canvas);

  // Initialize UI
  ui.initUI();

  // Start monitoring game state
  startGameStateMonitor();
}

function startGameStateMonitor(): void {
  setInterval(() => {
    if (game.isGameOver()) {
      const score = game.getScore();

      if (game.isVictory()) {
        ui.showVictory(score);
      } else {
        ui.showGameOver(score);
      }
    }
  }, 100);
}

// Initialize when DOM is loaded
window.addEventListener("DOMContentLoaded", init);
