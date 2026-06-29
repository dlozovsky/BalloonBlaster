# Balloon Blaster

A browser-based first-person 3D arcade game. Look around the room, shoot floating balloons, build combos, and advance through 10 increasingly difficult levels before time runs out.

## Features

- **Dynamic levels** — 60 seconds per level with rising difficulty
- **Balloon types** — normal (+1), special (+5), and penalty (-3) balloons
- **Combo system** — chain hits for up to 4× score multiplier
- **Pause** — press Escape or lose window focus
- **Audio toggle** — mute/unmute with preference saved locally
- **High scores** — best score and level tracked in the browser
- **Score sharing** — copy or share your results, or download a score card image
- **Survival mode** — 90-second high-score challenge with ramping difficulty
- **Power-ups** — cyan double-score balloons from level 3
- **Achievements** — unlock milestones tracked in the browser
- **Mobile support** — drag to aim, tap to shoot, on-screen pause
- **Help page** — full rules at [`help.html`](help.html)

## Requirements

- A modern desktop browser with WebGL support
- Pointer Lock API support (Chrome, Firefox, Edge, Safari)
- Best experienced with mouse and keyboard

## Quick Start

### Option 1: npm script (recommended)

```bash
git clone https://github.com/dlozovsky/BalloonBlaster.git
cd BalloonBlaster
npm start
```

Then open [http://localhost:8080](http://localhost:8080).

### Option 2: Any static file server

```bash
npx serve . -p 8080
# or
python3 -m http.server 8080
```

### Option 3: Open directly

You can open `index.html` in a browser, but a local server is recommended for consistent behavior.

## Controls

| Input | Action |
|-------|--------|
| Mouse | Aim |
| Left click | Shoot (while pointer is locked) |
| Space | Shoot |
| WASD | Move (when pointer lock controls are active) |
| Escape | Pause / resume |
| 🔊 button | Toggle sound |

## Configuration

Edit [`js/config.js`](js/config.js):

| Option | Default | Description |
|--------|---------|-------------|
| `gameTitle` | `"Balloon Blaster"` | Page and UI title |
| `shareUrl` | GitHub repo URL | Link included in share text |
| `shareTitle` | `"My Balloon Blaster Score"` | Native share dialog title |
| `audioEnabled` | `true` | Default audio state on first visit |
| `showFPS` | `false` | Show FPS counter in bottom-left |
| `debugMode` | `false` | Enable debug logging to console |

## Project Structure

```
BalloonBlaster/
├── index.html              # Game shell (HTML + script entry)
├── css/styles.css          # Game styles
├── js/
│   ├── main.js             # Entry point
│   ├── config.js           # Runtime configuration
│   ├── constants.js        # Shared constants
│   ├── gameLogic.js        # Pure scoring/level logic (tested)
│   ├── state.js            # Centralized game state
│   ├── gameController.js   # Game flow and input
│   ├── world.js            # Three.js scene, balloons, particles
│   ├── audio.js            # Procedural audio
│   ├── ui.js               # DOM overlays and HUD
│   ├── storage.js          # localStorage helpers
│   └── utils.js            # Shared utilities
├── tests/gameLogic.test.js # Unit tests
├── help.html               # Player help / rules
├── vendor/                 # Vendored Three.js (offline play)
│   ├── three.min.js
│   └── PointerLockControls.js
└── package.json            # Dev server and test scripts
```

## Development

VS Code users can launch Chrome against `http://localhost:8080` using the included `.vscode/launch.json`. Start the server first with `npm start`.

Run unit tests with:

```bash
npm test
```

## License

See repository for license details.
