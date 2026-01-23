# Wowbie - Voice-Controlled Flappy Bird Game

A modern TypeScript implementation of a voice-controlled Flappy Bird game with Firebase integration for user authentication and leaderboards.

## Features

- 🎤 **Voice Control**: Use your voice to control the bird - louder sounds make it jump higher
- 🔥 **Firebase Integration**: User authentication and persistent leaderboards
- 🏆 **Leaderboards**: Track top players by games played and highest scores
- 🎮 **Victory Condition**: Reach score 30 to win with confetti celebration
- 🔊 **Sound Effects**: Background music and sound effects for all game events
- 📱 **Responsive Design**: Clean, retro-styled UI with smooth animations

## Technology Stack

- **TypeScript**: Fully typed functional codebase for better maintainability
- **Vite**: Fast development server and optimized builds
- **Firebase**: Backend services for authentication and data persistence
- **Web Audio API**: Voice input analysis and game audio
- **Canvas API**: Game rendering
- **Functional Programming**: Module-level state with pure functions (no classes)

## Project Structure

```
src/
├── types.ts    # TypeScript type definitions and interfaces
├── config.ts   # Game configuration and constants
├── utils.ts    # Utility functions (debounce, collision detection)
├── audio.ts    # Audio and voice control management (functional)
├── firebase.ts # Firebase operations (functional)
├── game.ts     # Core game logic and rendering (functional)
├── ui.ts       # UI interactions and screen management (functional)
└── main.ts     # Application entry point
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open your browser to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## How to Play

1. **Sign Up/Login**: Create an account or log in with your username
2. **Allow Microphone**: Grant microphone permission when prompted
3. **Make Noise**: Use your voice to make the bird fly
   - Louder sounds = Higher jumps
   - Quiet = Bird falls
4. **Avoid Pipes**: Navigate through the gaps
5. **Score Points**: Pass through pipes to increase your score
6. **Win**: Reach score 30 to trigger the victory celebration!

## Game Controls

- **Voice**: Primary control - make noise to fly
- **Mute Button**: Toggle sound on/off
- **Leaderboard**: View top players
- **Home**: Return to main menu
- **Logout**: Sign out and return to login screen

## Code Architecture

### AudioManager

Handles all audio operations including:

- Microphone input analysis
- Voice volume and pitch detection
- Sound effects playback
- Background music control

### FirebaseService

Manages Firebase operations:

- User registration and login
- Score persistence
- Leaderboard data retrieval
- Offline fallback support

### GameEngine

Core game mechanics:

- Physics simulation (gravity, velocity)
- Collision detection
- Pipe generation
- Score tracking
- Victory/game over conditions
- Confetti animation

### UIManager

User interface management:

- Screen transitions
- Form validation
- Event handling
- Leaderboard rendering

## Configuration

Game settings can be adjusted in `src/config.ts`:

- Board dimensions
- Bird size and physics
- Pipe dimensions
- Gravity and velocity
- Victory score threshold
- Audio volumes

## Firebase Setup

The game uses Firebase for backend services. The configuration is included in `src/config.ts`. To use your own Firebase project:

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Firestore Database
3. Update `FIREBASE_CONFIG` in `src/config.ts` with your credentials

## License

This is a custom implementation created from scratch in TypeScript. All code is original and does not use any copyrighted source code.

## Credits

- Game concept inspired by Flappy Bird
- Built with TypeScript, Vite, and Firebase
- Voice control implementation using Web Audio API
