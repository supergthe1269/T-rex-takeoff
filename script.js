// --- SETUP CANVAS ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 400;

// --- HTML UI ELEMENTS ---
const scoreEl = document.getElementById('score-display');
const modeEl = document.getElementById('mode-display');
const finalScoreEl = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');

// --- AUDIO SETUP ---
const sounds = {
    jump: new Audio('assets/jump.mp3'),
    collect: new Audio('assets/collect.mp3'),
    bg: new Audio('assets/bg-music.mp3'),
    over: new Audio('assets/game-over.mp3')
};

// Configure Volume & Loop
try {
    sounds.jump.volume = 0.3;
    sounds.collect.volume = 0.4;
    sounds.bg.volume = 0.2;
    sounds.over.volume = 0.4;
    sounds.bg.loop = true;
} catch (e) {
    console.log("Audio configuration failed", e);
}

// Helper function to play sound safely
function playSound(sound) {
    if (sound.readyState >= 2) {
        sound.cloneNode().play().catch(() => {});
    }
}

// --- GAME VARIABLES ---
let score = 0;
let gameFrame = 0;
let gameSpeed = 5;
let isGameOver = false;
let gameRunning = false;

// Entities Arrays
let obstaclesArray = [];
let powerupsArray = [];

// Game States
let isInverted = false; // Is gravity flipped?
let hasShield = false;  // Is Shield active?
let isGhost = false;    // Is Ghost Mode active?

// Timers
let shieldTimer = 0;
let ghostTimer = 0;

// --- DINO OBJECT ---
// --- DINO OBJECT ---
const dino = {
    x: 50,
    y: 200,
    width: 40,
    height: 40,
    dy: 0,
    jumpPower: 13,
    flapPower: 9,
    gravity: 0.6,
    grounded: false,
    mode: 'ground', 

    draw: function() {
        ctx.save();

        if (isInverted) {
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.scale(1, -1);
            ctx.translate(-(this.x + this.width / 2), -(this.y + this.height / 2));
        }

        if (isGhost) ctx.globalAlpha = 0.5;

        if (hasShield) {
            ctx.shadowBlur = 20; ctx.shadowColor = "cyan"; ctx.strokeStyle = 'cyan'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 35, 0, Math.PI * 2);
            ctx.stroke(); ctx.shadowBlur = 0;
        }

        ctx.fillStyle = (this.mode === 'ground') ? '#5D9C59' : '#5DA7DB';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillRect(this.x + 20, this.y - 10, 30, 20); // Head
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x + 35, this.y - 5, 5, 5); // Eye

        if (this.mode === 'air') {
            ctx.fillStyle = 'white';
            ctx.fillRect(this.x - 5, this.y + 15, 25, 10); // Wing
        }

        ctx.restore();
    },

    update: function() {
        this.y += this.dy;

        if (!isInverted) {
            if (this.y + this.height < canvas.height) {
                this.dy += this.gravity;
                this.grounded = false;
            } else {
                this.dy = 0;
                this.grounded = true;
                this.y = canvas.height - this.height;
            }
            if (this.y < 0) { this.y = 0; this.dy = 0; }
        } else {
            if (this.y > 0) {
                this.dy -= this.gravity;
                this.grounded = false;
            } else {
                this.dy = 0;
                this.grounded = true;
                this.y = 0;
            }
            if (this.y + this.height > canvas.height) {
                this.y = canvas.height - this.height;
                this.dy = 0;
            }
        }
        this.draw();
    },

    action: function() {
        playSound(sounds.jump);
        let jumpStrength = this.mode === 'ground' ? this.jumpPower : this.flapPower;

        if (!isInverted) {
            if ((this.mode === 'ground' && this.grounded) || this.mode === 'air') {
                this.dy = -jumpStrength;
                this.grounded = false;
            }
        } else {
            if ((this.mode === 'ground' && this.grounded) || this.mode === 'air') {
                this.dy = jumpStrength;
                this.grounded = false;
            }
        }
    },

    toggleMode: function() {
        if (this.mode === 'ground') {
            // Switching TO Air Mode
            this.mode = 'air';
            this.dy = isInverted ? 5 : -5;
            
            // SAFETY HOP: Instantly move Dino away from the spikes!
            // If Normal: Move Up (-30). If Inverted: Move Down (+30)
            this.y += isInverted ? 40 : -40;
            this.grounded = false;
        } else {
            // Switching TO Ground Mode
            this.mode = 'ground';
        }
    }
};

// --- CLASSES ---

class Obstacle {
    constructor() {
        this.x = canvas.width;
        this.width = 40;
        this.height = 40;
        this.markedForDeletion = false;

        // Difficulty Modifiers
        this.isQuantum = (score > 15 && Math.random() > 0.5);
        this.isMoving = (score > 5 && Math.random() < 0.3);

        // Type: Cactus (Ground) or Bird (Air)
        let isGroundSpawn = Math.random() < 0.6;
        this.type = isGroundSpawn ? 'cactus' : 'bird';

        // Spawn Height Logic
        if (!isInverted) {
            this.y = isGroundSpawn ? canvas.height - this.height : Math.random() * (canvas.height - 150);
        } else {
            this.y = isGroundSpawn ? 0 : Math.random() * (canvas.height - 150) + 50;
        }

        this.originalY = this.y;
        this.color = this.isQuantum ? '#800080' : (isGroundSpawn ? '#8B4513' : '#FF4444');
    }

    update() {
        this.x -= gameSpeed;

        // Sine Wave Movement for Birds
        if (this.isMoving) {
            this.y = this.originalY + Math.sin(gameFrame * 0.05) * 50;
        }

        // Remove if off-screen
        if (this.x < 0 - this.width) {
            this.markedForDeletion = true;
            score++;
            checkLevelUp();
        }
        this.draw();
    }

    draw() {
        // Quantum Invisibility
        if (this.isQuantum) {
            let distance = Math.abs(this.x - dino.x);
            if (distance > 250) ctx.globalAlpha = 0;
            else if (distance > 150) ctx.globalAlpha = 0.3;
            else ctx.globalAlpha = 1.0;
        }

        // Draw Cactus or Bird
        ctx.fillStyle = this.color;
        if (this.type === 'cactus') {
            ctx.fillRect(this.x + 10, this.y, 20, 40);
            ctx.fillRect(this.x, this.y + 10, 10, 20);
            ctx.fillRect(this.x + 30, this.y + 10, 10, 20);
        } else {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + 40, this.y + 20);
            ctx.lineTo(this.x, this.y + 40);
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.fillRect(this.x + 10, this.y + 15, 10, 10);
        }
        ctx.globalAlpha = 1.0; // Reset alpha
    }
}

class PowerUp {
    constructor() {
        this.x = canvas.width;
        this.y = Math.random() * (canvas.height - 100) + 50;
        this.width = 30;
        this.height = 30;
        this.type = Math.random() < 0.5 ? 'shield' : 'ghost';
        this.markedForDeletion = false;
    }

    update() {
        this.x -= gameSpeed;
        if (this.x < -this.width) this.markedForDeletion = true;
        this.draw();
    }

    draw() {
        ctx.fillStyle = this.type === 'shield' ? 'cyan' : 'white';
        ctx.beginPath();
        ctx.arc(this.x + 15, this.y + 15, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.fillText(this.type === 'shield' ? 'S' : 'G', this.x + 11, this.y + 20);
    }
}

// --- GAME LOGIC FUNCTIONS ---

function startGame() {
    startScreen.classList.remove('active');
    gameRunning = true;
    
    // Reset Music
    if (sounds.bg.readyState >= 2) {
        sounds.bg.currentTime = 0;
        sounds.bg.play().catch(() => {});
    }
    animate();
}

function stopGame() {
    isGameOver = true;
    gameRunning = false;
    
    // Stop BG Music, Play Game Over
    sounds.bg.pause();
    sounds.over.currentTime = 0;
    playSound(sounds.over);
    
    finalScoreEl.innerText = score;
    gameOverScreen.classList.add('active');
}

function checkLevelUp() {
    // TRIGGER INVERSION (Score 10 to 20)
    if (score >= 10 && score < 20) {
        if (!isInverted) {
            isInverted = true;
            obstaclesArray = []; // Clear for fairness

            // FIX: Don't snap to ceiling if in Air Mode (Lava!)
            if (dino.mode === 'air') {
                dino.y = canvas.height / 2;
                dino.dy = 0;
            } else {
                dino.y = 0;
                dino.dy = 0;
            }
        }
    } 
    // REVERT TO NORMAL
    else {
        if (isInverted) {
            isInverted = false;
            obstaclesArray = [];

            if (dino.mode === 'air') {
                dino.y = canvas.height / 2;
                dino.dy = 0;
            } else {
                dino.y = canvas.height - dino.height;
                dino.dy = 0;
            }
        }
    }
}

function drawSpikes() {
    // Only draw spikes if in AIR mode
    if (dino.mode === 'air') {
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();

        let baseY = isInverted ? 0 : canvas.height;
        let spikeHeight = isInverted ? 20 : -20;

        for (let i = 0; i < canvas.width; i += 30) {
            ctx.lineTo(i, baseY);
            ctx.lineTo(i + 15, baseY + spikeHeight);
            ctx.lineTo(i + 30, baseY);
        }
        ctx.fill();
    }
}

function updateStatusEffects() {
    if (hasShield) {
        shieldTimer--;
        if (shieldTimer <= 0) hasShield = false;
    }
    if (isGhost) {
        ghostTimer--;
        if (ghostTimer <= 0) isGhost = false;
    }
}

function handleEntities() {
    // Spawn Obstacles
    if (gameFrame % 100 === 0) obstaclesArray.push(new Obstacle());
    
    // Spawn Powerups (rarely)
    if (score >= 5 && gameFrame % 600 === 0) powerupsArray.push(new PowerUp());

    // Update Obstacles
    for (let i = 0; i < obstaclesArray.length; i++) {
        obstaclesArray[i].update();
    }
    obstaclesArray = obstaclesArray.filter(obs => !obs.markedForDeletion);

    // Update Powerups
    for (let i = 0; i < powerupsArray.length; i++) {
        powerupsArray[i].update();
    }
    powerupsArray = powerupsArray.filter(p => !p.markedForDeletion);
}

function checkCollision() {
    // 1. Check Powerups (Collect even if ghost)
    for (let p of powerupsArray) {
        if (dino.x < p.x + p.width && dino.x + dino.width > p.x &&
            dino.y < p.y + p.height && dino.y + dino.height > p.y) {
            
            playSound(sounds.collect);
            if (p.type === 'shield') { hasShield = true; shieldTimer = 300; }
            if (p.type === 'ghost') { isGhost = true; ghostTimer = 300; }
            p.markedForDeletion = true;
        }
    }

    // 2. Ghost Immunity (Safe from everything below)
    if (isGhost) return false;

    // 3. Lava/Spike Check (Air Mode Floor/Ceiling)
    if (dino.mode === 'air') {
        if (!isInverted && dino.y + dino.height >= canvas.height - 1) return true;
        if (isInverted && dino.y <= 1) return true;
    }

    // 4. Obstacle Check
    for (let obs of obstaclesArray) {
        if (dino.x < obs.x + obs.width - 5 && dino.x + dino.width - 5 > obs.x &&
            dino.y < obs.y + obs.height - 5 && dino.y + dino.height - 5 > obs.y) {
            
            if (hasShield) {
                hasShield = false;
                obs.markedForDeletion = true;
                return false;
            }
            return true;
        }
    }
    return false;
}

function updateUI() {
    scoreEl.innerText = score;
    modeEl.innerText = dino.mode.toUpperCase();

    // Background Color Change
    document.body.style.backgroundColor = isInverted ? '#500' : '#202028';

    // Inverted Warning Text
    if (isInverted) {
        ctx.save();
        ctx.fillStyle = 'red';
        ctx.font = '20px "Press Start 2P", cursive, Arial';
        ctx.textAlign = 'center';
        ctx.fillText("⚠ GRAVITY INVERTED ⚠", canvas.width / 2, 50);
        ctx.restore();
    }

    // Powerup Timers
    ctx.save();
    ctx.font = '20px Arial';
    if (isGhost) {
        ctx.fillStyle = 'white';
        ctx.fillText("GHOST: " + Math.ceil(ghostTimer / 60), canvas.width - 120, 60);
    }
    if (hasShield) {
        ctx.fillStyle = 'cyan';
        ctx.fillText("SHIELD: " + Math.ceil(shieldTimer / 60), canvas.width - 120, 30);
    }
    ctx.restore();
}

// --- INPUT HANDLING ---

window.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        if (!gameRunning && !isGameOver) startGame();
        else if (isGameOver) location.reload();
    }
    
    if (gameRunning) {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
            dino.action();
        }
        if (e.key === ' ') {
            dino.toggleMode();
            e.preventDefault(); // Prevent page scrolling
        }
    }
});

startScreen.addEventListener('click', startGame);

// --- MAIN LOOP ---

function animate() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background Sky
    ctx.fillStyle = isInverted ? '#222' : '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawSpikes();
    dino.update();
    handleEntities();
    updateStatusEffects();
    updateUI();

    if (checkCollision()) {
        stopGame();
    } else {
        gameFrame++;
        requestAnimationFrame(animate);
    }
}

