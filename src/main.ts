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

let isUIThresholdMet = false;

function startGameStateMonitor(): void {
  setInterval(() => {
    if (game.isGameOver() && !isUIThresholdMet) {
      isUIThresholdMet = true;
      const score = game.getScore();

      if (game.isVictory()) {
        ui.showVictory(score);
      } else {
        // Delay Game Over screen to show splash first
        setTimeout(() => {
          game.hideSplash();
          ui.showGameOver(score);
        }, 2000);
      }
    }

    // Reset monitor flag if game is restarted
    if (!game.isGameOver()) {
      isUIThresholdMet = false;
    }
  }, 100);
}

// Initialize when DOM is loaded
window.addEventListener("DOMContentLoaded", init);
