//board
let board;
let boardWidth = 360;
let boardHeight = 640;
let context;

//bird
let birdWidth = 34; //width/height ratio = 408/228 = 17/12
let birdHeight = 24;
let birdX = boardWidth / 8;
let birdY = boardHeight / 2;
let birdImg;

let bird = {
  x: birdX,
  y: birdY,
  width: birdWidth,
  height: birdHeight,
};

//pipes
let pipeArray = [];
let pipeWidth = 64; //width/height ratio = 384/3072 = 1/8
let pipeHeight = 512;
let pipeX = boardWidth;
let pipeY = 0;

let topPipeImg;
let bottomPipeImg;

//physics
let velocityX = -2; //pipes moving left speed
let velocityY = -4; //bird jump speed - starts with upward momentum
let gravity = 0.3; // Balanced gravity for controllable gameplay

let gameOver = false;
let gameStarted = false; // Prevents the bird from falling until player is ready
let score = 0;

//audio
let audioContext;
let analyser;
let microphone;
let dataArray;
let bufferLength;
let audioInitialized = false;

// Firebase & User State
let db;
let currentUser = null;
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCS6VViqCQ9GE8IUbfFF3hLW82w64VUpF0",
  authDomain: "voice-controlled-flappy-bird.firebaseapp.com",
  projectId: "voice-controlled-flappy-bird",
  storageBucket: "voice-controlled-flappy-bird.firebasestorage.app",
  messagingSenderId: "911227757692",
  appId: "1:911227757692:web:cbf7d173aa1d1043fc15f9",
  measurementId: "G-L68R69FRVY",
};

let isUsernameValid = false;
let usernameCheckInProgress = false;

// Debounce Utility for entering the username
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Initialize Firebase if config is present
function initFirebase() {
  // Basic check if config is filled (at least apiKey)
  if (FIREBASE_CONFIG.apiKey) {
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.firestore();
      console.log("Firebase initialized");
    } catch (e) {
      console.error("Firebase init error:", e);
      alert("Firebase Error: Check console.");
    }
  } else {
    console.warn(
      "Firebase config missing. Registration will be local-only or fail."
    );
  }
}

async function loadLeaderboards() {
  const mostGamesContainer = document.getElementById("most-games-list");
  const highestScoreContainer = document.getElementById("highest-score-list");

  if (!db) {
    mostGamesContainer.innerHTML =
      '<p class="leaderboard-error">Offline mode - leaderboards unavailable</p>';
    highestScoreContainer.innerHTML =
      '<p class="leaderboard-error">Offline mode - leaderboards unavailable</p>';
    return;
  }

  try {
    // Load Most Games Played
    const usersSnapshot = await db
      .collection("users")
      .orderBy("totalGames", "desc")
      .limit(5)
      .get();

    if (usersSnapshot.empty) {
      mostGamesContainer.innerHTML =
        '<p class="leaderboard-empty">No data yet. Be the first to play!</p>';
    } else {
      let gamesHTML = '<ol class="leaderboard-list">';
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        gamesHTML += `
          <li class="leaderboard-item">
            <span class="lb-username" title="${data.username}">${
          data.username
        }</span>
            <span class="lb-value">${data.totalGames || 0} games</span>
          </li>
        `;
      });
      gamesHTML += "</ol>";
      mostGamesContainer.innerHTML = gamesHTML;
    }

    // Load Highest Scores
    const scoresSnapshot = await db
      .collection("scores")
      .orderBy("score", "desc")
      .limit(5)
      .get();

    if (scoresSnapshot.empty) {
      highestScoreContainer.innerHTML =
        '<p class="leaderboard-empty">No scores yet. Be the first!</p>';
    } else {
      let scoresHTML = '<ol class="leaderboard-list">';
      scoresSnapshot.forEach((doc) => {
        const data = doc.data();
        scoresHTML += `
          <li class="leaderboard-item">
            <span class="lb-username" title="${data.username}">${data.username}</span>
            <span class="lb-value">${data.score} pts</span>
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

window.onload = function () {
  initFirebase();

  board = document.getElementById("board");
  board.height = boardHeight;
  board.width = boardWidth;
  context = board.getContext("2d"); //used for drawing on the board

  //load images
  birdImg = new Image();
  birdImg.src = "./flappybird.png";
  birdImg.onload = function () {
    context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
  };

  topPipeImg = new Image();
  topPipeImg.src = "./toppipe.png";

  bottomPipeImg = new Image();
  bottomPipeImg.src = "./bottompipe.png";

  requestAnimationFrame(update);
  setInterval(placePipes, 2700); //every 2.7 seconds

  // --- UI Elements ---
  const signupScreen = document.getElementById("signup-screen");
  const signupBtn = document.getElementById("signup-btn");
  const usernameInput = document.getElementById("username");
  const emailInput = document.getElementById("email");
  const signupError = document.getElementById("signup-error");
  const authToggle = document.getElementById("auth-toggle");
  const authActionLink = authToggle.querySelector(".action-link");

  const startScreen = document.getElementById("start-screen");
  const playBtn = document.getElementById("play-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const leaderboardBtn = document.getElementById("leaderboard-btn");

  const leaderboardScreen = document.getElementById("leaderboard-screen");
  const backBtn = document.getElementById("back-btn");
  const tabGames = document.getElementById("tab-games");
  const tabScores = document.getElementById("tab-scores");
  const tabContentGames = document.getElementById("tab-content-games");
  const tabContentScores = document.getElementById("tab-content-scores");

  const gameOverScreen = document.getElementById("game-over-screen");
  const restartBtn = document.getElementById("restart-btn");
  const homeBtn = document.getElementById("home-btn");
  const logoutBtnGameover = document.getElementById("logout-btn-gameover");

  // State for Auth Mode
  let isLoginMode = false;

  // --- Helper Functions ---
  function toggleAuthMode() {
    isLoginMode = !isLoginMode;

    // Reset Inputs/Errors
    signupError.classList.add("hidden");
    signupError.innerText = "";
    usernameInput.value = "";
    emailInput.value = "";
    signupBtn.disabled = false;

    if (isLoginMode) {
      // Switch to Login UI
      emailInput.classList.add("hidden"); // Hide email for login
      signupBtn.innerText = "LOGIN";
      authToggle.innerHTML = `New player? <span class="action-link">Sign Up</span>`;
      // Re-attach listener to new span
      authToggle
        .querySelector(".action-link")
        .addEventListener("click", toggleAuthMode);
    } else {
      // Switch to Signup UI
      emailInput.classList.remove("hidden");
      signupBtn.innerText = "ENTER GAME";
      authToggle.innerHTML = `Already have an account? <span class="action-link">Log In</span>`;
      authToggle
        .querySelector(".action-link")
        .addEventListener("click", toggleAuthMode);
    }
  }

  function logoutUser() {
    currentUser = null;
    // Reset Game State
    gameStarted = false;
    gameOver = false;
    score = 0;
    pipeArray = [];
    bird.y = birdY;

    // Show Signup Screen
    startScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    leaderboardScreen.classList.add("hidden");
    signupScreen.classList.remove("hidden");
  }

  function goHome() {
    // Reset Game State
    gameStarted = false;
    gameOver = false;
    score = 0;
    pipeArray = [];
    bird.y = birdY;
    velocityY = -4;

    // UI Transition
    gameOverScreen.classList.add("hidden");
    leaderboardScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
  }

  // --- Event Listeners ---

  // 0. Toggle Auth Mode
  authActionLink.addEventListener("click", toggleAuthMode);
  // 1. Navigation Buttons
  logoutBtn.addEventListener("click", logoutUser);
  logoutBtnGameover.addEventListener("click", logoutUser);
  homeBtn.addEventListener("click", goHome);

  // Tab switching
  tabGames.addEventListener("click", function () {
    tabGames.classList.add("active");
    tabScores.classList.remove("active");
    tabContentGames.classList.remove("hidden");
    tabContentGames.classList.add("active");
    tabContentScores.classList.add("hidden");
    tabContentScores.classList.remove("active");
  });

  tabScores.addEventListener("click", function () {
    tabScores.classList.add("active");
    tabGames.classList.remove("active");
    tabContentScores.classList.remove("hidden");
    tabContentScores.classList.add("active");
    tabContentGames.classList.add("hidden");
    tabContentGames.classList.remove("active");
  });

  // Leaderboard navigation
  leaderboardBtn.addEventListener("click", function () {
    startScreen.classList.add("hidden");
    leaderboardScreen.classList.remove("hidden");
    loadLeaderboards();
  });

  backBtn.addEventListener("click", function () {
    leaderboardScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
  });

  usernameInput.addEventListener(
    "input",
    debounce(async function () {
      const username = usernameInput.value.trim();

      // Reset state
      signupError.classList.add("hidden");
      signupBtn.disabled = false;
      isUsernameValid = false;

      if (!username) return;

      if (db) {
        usernameCheckInProgress = true;

        try {
          const snapshot = await db
            .collection("users")
            .where("username", "==", username)
            .get();
          const userExists = !snapshot.empty;

          if (isLoginMode) {
            // LOGIN MODE: Valid if user EXISTS
            if (!userExists) {
              signupError.innerText = "User not found";
              signupError.classList.remove("hidden");
              signupError.classList.remove("success-msg");
              isUsernameValid = false;
            } else {
              isUsernameValid = true;
              signupError.innerText = "Welcome back!";
              signupError.classList.add("success-msg");
              signupError.classList.remove("hidden");

              // Store user data for login
              const doc = snapshot.docs[0];
              currentUser = { id: doc.id, ...doc.data() };
            }
          } else {
            // SIGNUP MODE: Valid if user DOES NOT EXIST
            if (userExists) {
              signupError.innerText = "This username is already taken";
              signupError.classList.remove("hidden");
              signupError.classList.remove("success-msg");
              isUsernameValid = false;
            } else {
              isUsernameValid = true;
              signupError.innerText = "Username available!";
              signupError.classList.add("success-msg");
              signupError.classList.remove("hidden");
            }
          }
        } catch (e) {
          console.error("Check username error:", e);
          isUsernameValid = true;
        } finally {
          usernameCheckInProgress = false;
        }
      } else {
        // Offline mode - assume valid
        isUsernameValid = true;
      }
    }, 500)
  );

  // 3. Login / Sign Up Action
  signupBtn.addEventListener("click", async function () {
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();

    // Clear previous errors
    signupError.innerText = "";
    signupError.classList.add("hidden");

    if (!username) {
      signupError.innerText = "Please enter a username!";
      signupError.classList.remove("hidden");
      return;
    }

    // Check if we are still waiting for a check
    if (usernameCheckInProgress) {
      signupError.innerText = "Checking...";
      signupError.classList.remove("hidden");
      return;
    }

    // If not checked yet (fast typing), do strict check
    if (db && !isUsernameValid) {
      try {
        const snapshot = await db
          .collection("users")
          .where("username", "==", username)
          .get();
        const userExists = !snapshot.empty;

        if (isLoginMode && !userExists) {
          signupError.innerText = "User not found";
          signupError.classList.remove("hidden");
          return;
        }
        if (!isLoginMode && userExists) {
          signupError.innerText = "Taken";
          signupError.classList.remove("hidden");
          return;
        }
        // Set current user if login (late check)
        if (isLoginMode && userExists) {
          const doc = snapshot.docs[0];
          currentUser = { id: doc.id, ...doc.data() };
        }
      } catch (e) {}
    }

    if (db) {
      if (isLoginMode) {
        // LOGIN FLOW
        // currentUser should ideally be set by the check, but verify
        if (!currentUser || currentUser.username !== username) {
          // Fallback fetch if check missed it
          try {
            const snapshot = await db
              .collection("users")
              .where("username", "==", username)
              .get();
            if (!snapshot.empty) {
              const doc = snapshot.docs[0];
              currentUser = { id: doc.id, ...doc.data() };
            } else {
              signupError.innerText = "User not found";
              signupError.classList.remove("hidden");
              return;
            }
          } catch (e) {
            console.error("Login fetch error:", e);
            // Fallback offline logic if DB fails? Rare.
          }
        }
        // Proceed to game
        console.log("Logged in as:", currentUser.username);
      } else {
        // SIGNUP FLOW
        try {
          signupBtn.innerText = "LOADING...";
          const docRef = await db.collection("users").add({
            username: username,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            totalGames: 0,
          });
          currentUser = { id: docRef.id, username: username };
          console.log("User registered with ID: ", docRef.id);
        } catch (e) {
          console.error("Error adding user: ", e);
          signupError.innerText = "Error. Playing offline.";
          signupError.classList.remove("hidden");

          signupBtn.innerText = "ENTER GAME";
          currentUser = { id: "offline_" + Date.now(), username: username };
        }
      }
    } else {
      // Offline fallback
      currentUser = { id: "local_" + Date.now(), username: username };
    }

    // Transition to Start Screen
    signupScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
  });

  // 2. Play Game
  playBtn.addEventListener("click", function () {
    if (!audioInitialized) {
      initAudio();
    }
    // Start the game immediately
    startScreen.classList.add("hidden");
    if (!gameStarted) {
      gameStarted = true;
      velocityY = -4; // Head start
    }
  });

  // 3. Restart Game
  restartBtn.addEventListener("click", function () {
    resetGame();
    gameOverScreen.classList.add("hidden");

    // Ensure game starts immediately after restart
    if (!gameStarted) {
      gameStarted = true;
      velocityY = -4;
    }
  });
};

async function initAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);

    audioInitialized = true;
    console.log("Audio initialized successfully!");
  } catch (err) {
    console.error("Error accessing microphone:", err);
    alert("Please allow microphone access to use voice control!");
  }
}

function update() {
  requestAnimationFrame(update);
  if (gameOver) {
    return;
  }
  context.clearRect(0, 0, board.width, board.height);

  if (!gameStarted) {
    // Keep bird at start position until player starts
    context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
    context.fillStyle = "white";
    context.font = "20px sans-serif";
    return;
  }

  // Process audio input for voice control
  if (audioInitialized && analyser) {
    analyser.getByteFrequencyData(dataArray);

    // Calculate volume (RMS - Root Mean Square)
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    let rms = Math.sqrt(sum / bufferLength);
    let volume = rms / 128.0; // Normalize to 0-2 range

    // Calculate pitch/sharpness (Spectral Centroid)
    let weightedSum = 0;
    let magnitudeSum = 0;
    for (let i = 0; i < bufferLength; i++) {
      weightedSum += dataArray[i] * i;
      magnitudeSum += dataArray[i];
    }
    let spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
    let sharpness = spectralCentroid / bufferLength; // Normalize to 0-1 range

    // Voice activation threshold
    const VOLUME_THRESHOLD = 0.2;

    if (volume > VOLUME_THRESHOLD) {
      if (!gameStarted) {
        gameStarted = true;
      }
      // Reduced base jump force for gentler control
      let baseForce = -4;

      // Sharpness multiplier (higher pitch = stronger jump)
      // Map sharpness from 0-1 to 0.8-1.4 multiplier
      let sharpnessMultiplier = 0.8 + sharpness * 0.6;
      // Apply voice-controlled jump (direct, no smoothing)
      velocityY = baseForce * sharpnessMultiplier;
    }
  }

  //bird
  velocityY += gravity;
  bird.y = Math.max(bird.y + velocityY, 0); //apply gravity to current bird.y, limit the bird.y
  context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);

  if (bird.y > board.height) {
    handleGameOver();
  }

  //pipes
  for (let i = 0; i < pipeArray.length; i++) {
    let pipe = pipeArray[i];
    pipe.x += velocityX;
    context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);

    if (!pipe.passed && bird.x > pipe.x + pipe.width) {
      score += 0.5; //0.5 because there are 2 pipes! so 0.5*2 = 1, 1 for each set of pipes
      pipe.passed = true;
    }

    if (detectCollision(bird, pipe)) {
      handleGameOver();
    }
  }

  //clear pipes
  while (pipeArray.length > 0 && pipeArray[0].x < -pipeWidth) {
    pipeArray.shift(); //removes first element from the array
  }

  //score
  context.fillStyle = "white";
  context.font = "45px sans-serif";
  context.textAlign = "left"; // Set alignment for score display
  context.fillText(score, 5, 45);

  if (gameOver) {
    // context.fillText("GAME OVER", 5, 90); // Removed in favor of screen
    const gameOverScreen = document.getElementById("game-over-screen");
    const finalScoreText = document.getElementById("final-score");

    if (gameOverScreen.classList.contains("hidden")) {
      // Update UI
      finalScoreText.innerText = "Score: " + Math.floor(score);
      gameOverScreen.classList.remove("hidden");
    }
  }
}

function handleGameOver() {
  if (gameOver) return; // Prevent double firing
  gameOver = true;

  // Save score to Firebase
  if (
    db &&
    currentUser &&
    currentUser.id &&
    !currentUser.id.startsWith("local_")
  ) {
    const finalScore = Math.floor(score);
    console.log(`Saving score ${finalScore} for user ${currentUser.username}`);

    // Save score
    db.collection("scores")
      .add({
        userId: currentUser.id,
        username: currentUser.username,
        score: finalScore,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      })
      .then(() => {
        console.log("Score saved successfully!");
      })
      .catch((e) => {
        console.error("Error saving score:", e);
      });

    // Update total games played user stat
    db.collection("users")
      .doc(currentUser.id)
      .update({
        totalGames: firebase.firestore.FieldValue.increment(1),
      })
      .catch((e) => {
        console.error("Error updating totalGames:", e);
      });
  }
}

function placePipes() {
  if (gameOver || !gameStarted) {
    return;
  }

  //(0-1) * pipeHeight/2.
  // 0 -> -128 (pipeHeight/4)
  // 1 -> -128 - 256 (pipeHeight/4 - pipeHeight/2) = -3/4 pipeHeight
  let randomPipeY = pipeY - pipeHeight / 4 - Math.random() * (pipeHeight / 2);
  let openingSpace = board.height / 3;

  let topPipe = {
    img: topPipeImg,
    x: pipeX,
    y: randomPipeY,
    width: pipeWidth,
    height: pipeHeight,
    passed: false,
  };
  pipeArray.push(topPipe);

  let bottomPipe = {
    img: bottomPipeImg,
    x: pipeX,
    y: randomPipeY + pipeHeight + openingSpace,
    width: pipeWidth,
    height: pipeHeight,
    passed: false,
  };
  pipeArray.push(bottomPipe);
}

function detectCollision(a, b) {
  return (
    a.x < b.x + b.width && //a's top left corner doesn't reach b's top right corner
    a.x + a.width > b.x && //a's top right corner passes b's top left corner
    a.y < b.y + b.height && //a's top left corner doesn't reach b's bottom left corner
    a.y + a.height > b.y
  ); //a's bottom left corner passes b's top left corner
}

function resetGame() {
  bird.y = birdY;
  pipeArray = [];
  score = 0;
  gameOver = false;
  velocityY = -4;
}
