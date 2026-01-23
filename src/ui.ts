import { debounce } from "./utils";
import * as firebase from "./firebase";
import * as audio from "./audio";
import * as game from "./game";

// UI state
let isLoginMode = true;
let isUsernameValid = false;
let usernameCheckInProgress = false;

// DOM elements
let signupScreen: HTMLElement;
let startScreen: HTMLElement;
let leaderboardScreen: HTMLElement;
let gameOverScreen: HTMLElement;
let victoryScreen: HTMLElement;
let usernameInput: HTMLInputElement;
let emailInput: HTMLInputElement;
let signupError: HTMLElement;
let signupBtn: HTMLButtonElement;
let authToggle: HTMLElement;
let playBtn: HTMLButtonElement;
let muteBtn: HTMLButtonElement;

function getElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Element with id '${id}' not found`);
  return element;
}

export function initUI(): void {
  // Get screen elements
  signupScreen = getElement("signup-screen");
  startScreen = getElement("start-screen");
  leaderboardScreen = getElement("leaderboard-screen");
  gameOverScreen = getElement("game-over-screen");
  victoryScreen = getElement("victory-screen");

  // Get input elements
  usernameInput = getElement("username") as HTMLInputElement;
  emailInput = getElement("email") as HTMLInputElement;
  signupError = getElement("signup-error");
  signupBtn = getElement("signup-btn") as HTMLButtonElement;
  authToggle = getElement("auth-toggle");
  playBtn = getElement("play-btn") as HTMLButtonElement;
  muteBtn = getElement("mute-btn") as HTMLButtonElement;

  setupEventListeners();
}

function setupEventListeners(): void {
  // Mute button
  muteBtn.addEventListener("click", () => {
    const isMuted = audio.toggleMute();
    muteBtn.innerText = isMuted ? "🔇" : "🔊";
  });

  // Auth toggle
  authToggle.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("action-link")) {
      toggleAuthMode();
    }
  });

  // Username input with debounced validation
  const checkUsername = debounce(async () => {
    await validateUsername();
  }, 500);

  usernameInput.addEventListener("input", () => {
    const username = usernameInput.value.trim();
    signupBtn.disabled = true;
    signupError.classList.add("hidden");
    isUsernameValid = false;

    if (username) {
      checkUsername();
    } else {
      signupBtn.disabled = false;
    }
  });

  // Signup/Login button
  signupBtn.addEventListener("click", async () => {
    await handleAuth();
  });

  // Play button
  playBtn.addEventListener("click", async () => {
    await handlePlay();
  });

  // Restart button
  getElement("restart-btn").addEventListener("click", () => {
    handleRestart();
  });

  // Home buttons
  getElement("home-btn").addEventListener("click", () => goHome());
  getElement("victory-home-btn").addEventListener("click", () => goHome());

  // Logout buttons
  getElement("logout-btn").addEventListener("click", () => handleLogout());
  getElement("logout-btn-gameover").addEventListener("click", () =>
    handleLogout()
  );
  getElement("victory-logout-btn").addEventListener("click", () =>
    handleLogout()
  );

  // Victory restart
  getElement("victory-restart-btn").addEventListener("click", () => {
    handleRestart();
    victoryScreen.classList.add("hidden");
  });

  // Leaderboard navigation
  getElement("leaderboard-btn").addEventListener("click", async () => {
    startScreen.classList.add("hidden");
    leaderboardScreen.classList.remove("hidden");
    await renderLeaderboards();
  });

  getElement("back-btn").addEventListener("click", () => {
    leaderboardScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
  });

  // Leaderboard tabs
  const tabGames = getElement("tab-games");
  const tabScores = getElement("tab-scores");
  const tabContentGames = getElement("tab-content-games");
  const tabContentScores = getElement("tab-content-scores");

  tabGames.addEventListener("click", () => {
    tabGames.classList.add("active");
    tabScores.classList.remove("active");
    tabContentGames.classList.remove("hidden");
    tabContentScores.classList.add("hidden");
  });

  tabScores.addEventListener("click", () => {
    tabScores.classList.add("active");
    tabGames.classList.remove("active");
    tabContentScores.classList.remove("hidden");
    tabContentGames.classList.add("hidden");
  });
}

function toggleAuthMode(): void {
  isLoginMode = !isLoginMode;
  signupError.classList.add("hidden");
  signupError.innerText = "";
  usernameInput.value = "";
  emailInput.value = "";
  signupBtn.disabled = false;

  if (isLoginMode) {
    emailInput.classList.add("hidden");
    signupBtn.innerText = "LOGIN";
    authToggle.innerHTML =
      'New player? <span class="action-link">Sign Up</span>';
  } else {
    emailInput.classList.remove("hidden");
    signupBtn.innerText = "ENTER GAME";
    authToggle.innerHTML =
      'Already have an account? <span class="action-link">Log In</span>';
  }
}

async function validateUsername(): Promise<void> {
  const username = usernameInput.value.trim();

  if (!username) {
    signupBtn.disabled = false;
    return;
  }

  if (!firebase.isOnline()) {
    isUsernameValid = true;
    signupBtn.disabled = false;
    return;
  }

  usernameCheckInProgress = true;
  signupError.innerText = "Checking...";
  signupError.classList.remove("hidden");
  signupError.classList.remove("success-msg");
  signupBtn.disabled = true;

  try {
    const userExists = await firebase.checkUsernameExists(username);

    if (isLoginMode) {
      if (!userExists) {
        signupError.innerText = "User not found";
        signupError.classList.remove("success-msg");
        isUsernameValid = false;
        signupBtn.disabled = true;
      } else {
        isUsernameValid = true;
        signupError.innerText = "Welcome back!";
        signupError.classList.add("success-msg");
        signupBtn.disabled = false;
      }
    } else {
      if (userExists) {
        signupError.innerText = "This username is already taken";
        signupError.classList.remove("success-msg");
        isUsernameValid = false;
        signupBtn.disabled = true;
      } else {
        isUsernameValid = true;
        signupError.innerText = "Username available!";
        signupError.classList.add("success-msg");
        signupBtn.disabled = false;
      }
    }

    signupError.classList.remove("hidden");
  } catch (e) {
    console.error("Validation error:", e);
    isUsernameValid = true;
    signupBtn.disabled = false;
  } finally {
    usernameCheckInProgress = false;
  }
}

async function handleAuth(): Promise<void> {
  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();

  signupError.innerText = "";
  signupError.classList.add("hidden");

  if (!username) {
    signupError.innerText = "Please enter a username!";
    signupError.classList.remove("hidden");
    return;
  }

  if (usernameCheckInProgress) {
    signupError.innerText = "Checking...";
    signupError.classList.remove("hidden");
    return;
  }

  let user;
  if (isLoginMode) {
    user = await firebase.loginUser(username);
    if (!user) {
      signupError.innerText = "User not found";
      signupError.classList.remove("hidden");
      return;
    }
  } else {
    signupBtn.innerText = "LOADING...";
    user = await firebase.registerUser(username, email);
    signupBtn.innerText = "ENTER GAME";
  }

  signupScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");

  // Proactively initialize audio and start BGM for the instruction screen
  if (!audio.audioState.initialized) {
    await audio.initAudio();
  }
  audio.playBGM();
}

async function handlePlay(): Promise<void> {
  if (!audio.audioState.initialized) {
    const originalText = playBtn.innerText;
    playBtn.innerText = "WAITING FOR MIC...";
    playBtn.disabled = true;

    await audio.initAudio();

    playBtn.innerText = originalText;
    playBtn.disabled = false;
  }

  if (audio.audioState.initialized) {
    // Ensure BGM is playing (it might have been started in handleAuth or goHome)
    audio.playBGM(false);
    startScreen.classList.add("hidden");
    game.startGame();
  } else {
    console.log("Audio not initialized. Game will not start.");
  }
}

function handleRestart(): void {
  game.resetGame();
  gameOverScreen.classList.add("hidden");
  victoryScreen.classList.add("hidden");
  audio.playBGM();
  game.startGame();
}

function goHome(): void {
  game.resetGame();
  audio.pauseBGM();
  audio.pauseWin();

  audio.playBGM();

  gameOverScreen.classList.add("hidden");
  victoryScreen.classList.add("hidden");
  leaderboardScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
}

function handleLogout(): void {
  firebase.logout();
  game.resetGame();
  game.stopGame();
  audio.pauseBGM();
  audio.pauseWin();

  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  victoryScreen.classList.add("hidden");
  leaderboardScreen.classList.add("hidden");
  signupScreen.classList.remove("hidden");

  isLoginMode = true;
  toggleAuthMode();
}

async function renderLeaderboards(): Promise<void> {
  const mostGamesContainer = getElement("most-games-list");
  const highestScoreContainer = getElement("highest-score-list");

  if (!firebase.isOnline()) {
    mostGamesContainer.innerHTML =
      '<p class="leaderboard-error">Offline mode - leaderboards unavailable</p>';
    highestScoreContainer.innerHTML =
      '<p class="leaderboard-error">Offline mode - leaderboards unavailable</p>';
    return;
  }

  try {
    const { mostGames, highestScores } = await firebase.loadLeaderboards();

    if (mostGames.length === 0) {
      mostGamesContainer.innerHTML =
        '<p class="leaderboard-empty">No data yet. Be the first to play!</p>';
    } else {
      let gamesHTML = '<ol class="leaderboard-list">';
      mostGames.forEach((entry) => {
        gamesHTML += `
          <li class="leaderboard-item">
            <span class="lb-username" title="${entry.username}">${entry.username}</span>
            <span class="lb-value">${entry.totalGames} games</span>
          </li>
        `;
      });
      gamesHTML += "</ol>";
      mostGamesContainer.innerHTML = gamesHTML;
    }

    if (highestScores.length === 0) {
      highestScoreContainer.innerHTML =
        '<p class="leaderboard-empty">No scores yet. Be the first!</p>';
    } else {
      let scoresHTML = '<ol class="leaderboard-list">';
      highestScores.forEach((entry) => {
        scoresHTML += `
          <li class="leaderboard-item">
            <span class="lb-username" title="${entry.username}">${entry.username}</span>
            <span class="lb-value">${entry.score} pts</span>
          </li>
        `;
      });
      scoresHTML += "</ol>";
      highestScoreContainer.innerHTML = scoresHTML;
    }
  } catch (e) {
    console.error("Error loading leaderboards:", e);
    mostGamesContainer.innerHTML =
      '<p class="leaderboard-error">Error loading data</p>';
    highestScoreContainer.innerHTML =
      '<p class="leaderboard-error">Error loading data</p>';
  }
}

export function showGameOver(score: number): void {
  const finalScoreText = getElement("final-score");
  finalScoreText.innerText = `Score: ${score}`;
  gameOverScreen.classList.remove("hidden");
}

export function showVictory(score: number): void {
  const victoryScoreText = getElement("victory-score");
  victoryScoreText.innerText = `Score: ${score}`;
  victoryScreen.classList.remove("hidden");
}
