# T-Rex Takeoff 🦖✈️

**T-Rex Takeoff** is a hybrid browser game that combines the classic mechanics of *Chrome Dino* (endless runner) and *Flappy Bird* (tap-to-fly). The game features a unique "Quantum" twist where obstacles become invisible, an inverted gravity level, and power-up mechanics.

## 🎮 How to Play

1.  **Open the Game:** Double-click `index.html` to launch the game in your web browser.
2.  **Start:** Press **Enter** or click the "Start" button on the screen.
3.  **Controls:**
    * **`W` or `Arrow Up`**: Jump (Ground Mode) / Flap (Air Mode).
    * **`Spacebar`**: Toggle between **Ground Mode** (Running) and **Air Mode** (Flying).
4.  **Objective:** Survive as long as possible to increase your score.

---

## 🌟 Features & Mechanics

### 1. Hybrid Physics Engine
Switch instantly between heavy gravity (running) and light gravity (flying). Use Ground Mode for precision and Air Mode to bypass tricky sections.

### 2. Quantum Obstacles
As your score increases (>15), some obstacles become **"Quantum"**—they are invisible until you get close! Keep your eyes peeled.

### 3. Moving Enemies
Watch out for birds that fly in a sine-wave pattern. Timing is key to avoid them.

### 4. Inverted World 🙃
Between **Score 10 and 20**, gravity flips! The ground becomes the ceiling. You must run upside down.

### 5. Power-ups
* 🔵 **Shield:** Protects you from one collision.
* 🟠 **Time Slow:** Slows down the game speed for 5 seconds.

---

## 📂 Project Structure

```text
/T-Rex-Takeoff
│
├── index.html      # The game container and UI overlays
├── style.css       # Retro styling and animations
├── script.js       # Game logic, physics engine, and procedural rendering
└── assets/         # Folder for audio files (Optional)
    ├── jump.mp3    # Jump sound effect
    └── powerup.mp3 # Power-up sound effect
    └── bg-music.mp3 # Background music
    └── game-over.mp3 # Game over sound effect
