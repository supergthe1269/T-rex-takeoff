const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 400;

// HTML Elements
const scoreEl = document.getElementById('score-display');
const modeEl = document.getElementById('mode-display');
const finalScoreEl = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');

// --- AUDIO SETUP ---
let jumpSound = new Audio();
let collectSound = new Audio();
let bgMusic = new Audio();
let gameOverSound = new Audio(); // 1. New Audio Object

try {
    jumpSound.src = 'assets/jump.mp3';
    collectSound.src = 'assets/powerup.mp3';
    bgMusic.src = 'assets/bg-music.mp3';
    gameOverSound.src = 'assets/game-over.mp3'; // 2. Load the file

    // Volume Settings
    jumpSound.volume = 0.3;
    collectSound.volume = 0.4;
    bgMusic.volume = 0.2; 
    gameOverSound.volume = 0.4; // Slightly louder than BG music

    bgMusic.loop = true;  
} catch (e) {
    console.log("Audio files not found, playing without sound.");
}

// --- GAME VARIABLES ---
let score = 0;
let gameFrame = 0;
let gameSpeed = 5; 
let isGameOver = false;
let gameRunning = false; 
let obstaclesArray = []; 
let powerupsArray = [];
let isInverted = false; 
let hasShield = false;  
let isSlowMotion = false; 
let shieldTimer = 0;
let slowTimer = 0;

// --- DINO OBJECT ---
const dino = {
    x: 50, y: 200, width: 40, height: 40, dy: 0,
    jumpPower: 15, flapPower: 7, gravity: 0.6,
    grounded: false, mode: 'ground',
    
    draw: function() {
        ctx.save();
        
        // Inverted Gravity Rotation
        if (isInverted) {
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            ctx.scale(1, -1);
            ctx.translate(-(this.x + this.width/2), -(this.y + this.height/2));
        }

        // Shield Glow
        if (hasShield) {
            ctx.shadowBlur = 20; ctx.shadowColor = "cyan";
            ctx.strokeStyle = 'cyan'; ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, 35, 0, Math.PI*2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Dino Body (Procedural Art)
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
        
        // Physics
        if (!isInverted) {
            if (this.y + this.height < canvas.height) { this.dy += this.gravity; this.grounded = false; }
            else { this.dy = 0; this.grounded = true; this.y = canvas.height - this.height; }
            if (this.y < 0) { this.y = 0; this.dy = 0; }
        } else {
            if (this.y > 0) { this.dy -= this.gravity; this.grounded = false; }
            else { this.dy = 0; this.grounded = true; this.y = 0; }
            if (this.y + this.height > canvas.height) { this.y = canvas.height - this.height; this.dy = 0; }
        }
        this.draw();
    },
    action: function() {
        let jP = Math.abs(this.jumpPower);
        let fP = Math.abs(this.flapPower);
        
        if (jumpSound.readyState >= 2) jumpSound.cloneNode().play().catch(()=>{});

        if (!isInverted) {
            if (this.mode === 'ground' && this.grounded) this.dy = -jP;
            else if (this.mode === 'air') { this.dy = -fP; this.grounded = false; }
        } else {
            if (this.mode === 'ground' && this.grounded) this.dy = jP;
            else if (this.mode === 'air') { this.dy = fP; this.grounded = false; }
        }
    },
    toggleMode: function() {
        this.mode = (this.mode === 'ground') ? 'air' : 'ground';
        this.dy = isInverted ? 5 : -5;
    }
};

// --- CLASSES ---
class Obstacle {
    constructor() {
        this.x = canvas.width;
        this.width = 40; this.height = 40;
        this.markedForDeletion = false;
        this.isQuantum = (score > 15 && Math.random() > 0.5); 
        this.isMoving = (score > 5 && Math.random() < 0.3);
        
        let isGroundSpawn = Math.random() < 0.6;
        this.type = isGroundSpawn ? 'cactus' : 'bird';
        
        if (!isInverted) this.y = isGroundSpawn ? canvas.height - this.height : Math.random() * (canvas.height - 150);
        else this.y = isGroundSpawn ? 0 : Math.random() * (canvas.height - 150) + 50;
        
        this.originalY = this.y;
        this.color = this.type === 'cactus' ? '#8B4513' : '#FF4444';
        if (this.isQuantum) this.color = '#800080'; 
    }
    update() {
        this.x -= gameSpeed;
        if (this.isMoving) this.y = this.originalY + Math.sin(gameFrame * 0.05) * 50;
        if (this.x < 0 - this.width) { this.markedForDeletion = true; score++; checkLevelUp(); }
        this.draw();
    }
    draw() {
        if (this.isQuantum) {
            let distance = this.x - dino.x;
            if (distance > 250) ctx.globalAlpha = 0;
            else if (distance > 150) ctx.globalAlpha = 0.3;
            else ctx.globalAlpha = 1.0;
        }
        if (this.type === 'cactus') {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x + 10, this.y, 20, 40); 
            ctx.fillRect(this.x, this.y + 10, 10, 20); 
            ctx.fillRect(this.x + 30, this.y + 10, 10, 20); 
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + 40, this.y + 20);
            ctx.lineTo(this.x, this.y + 40);
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.fillRect(this.x + 10, this.y + 15, 10, 10);
        }
        ctx.globalAlpha = 1.0;
    }
}

class PowerUp {
    constructor() {
        this.x = canvas.width;
        this.y = Math.random() * (canvas.height - 100) + 50;
        this.width = 30; this.height = 30;
        this.type = Math.random() < 0.5 ? 'shield' : 'slow';
        this.markedForDeletion = false;
    }
    update() {
        this.x -= gameSpeed;
        if (this.x < -this.width) this.markedForDeletion = true;
        this.draw();
    }
    draw() {
        ctx.fillStyle = this.type === 'shield' ? 'cyan' : 'orange';
        ctx.beginPath(); 
        ctx.arc(this.x + 15, this.y + 15, 15, 0, Math.PI*2); 
        ctx.fill();
        ctx.fillStyle = 'black'; 
        ctx.font = '12px Arial';
        ctx.fillText(this.type === 'shield' ? 'S' : 'T', this.x + 11, this.y + 20);
    }
}

// --- LOGIC ---

function startGame() {
    startScreen.classList.remove('active');
    gameRunning = true;
    
    // Play Music
    if (bgMusic.readyState >= 2) {
        bgMusic.currentTime = 0; 
        bgMusic.play().catch(e => console.log("Music failed to start", e));
    }
    
    animate();
}

function stopGame() {
    isGameOver = true;
    gameRunning = false;
    
    // 3. Stop BG Music & Play Game Over
    bgMusic.pause();
    bgMusic.currentTime = 0;
    
    if (gameOverSound.readyState >= 2) {
        gameOverSound.currentTime = 0;
        gameOverSound.play().catch(e => console.log("Game Over sound failed", e));
    }
    
    finalScoreEl.innerText = score;
    gameOverScreen.classList.add('active'); 
}

function handleObstacles() {
    let spawnRate = (isSlowMotion) ? 150 : 100;
    if (gameFrame % spawnRate === 0) obstaclesArray.push(new Obstacle());
    for (let i = 0; i < obstaclesArray.length; i++) { obstaclesArray[i].update(); }
    obstaclesArray = obstaclesArray.filter(obs => !obs.markedForDeletion);
}

function handlePowerUps() {
    if (score < 5) return;
    if (gameFrame % 600 === 0) powerupsArray.push(new PowerUp());
    for (let i = 0; i < powerupsArray.length; i++) { powerupsArray[i].update(); }
    powerupsArray = powerupsArray.filter(p => !p.markedForDeletion);
}

function checkLevelUp() {
    if (score >= 10 && score < 20) {
        if (!isInverted) { isInverted = true; dino.y = 0; dino.dy = 0; obstaclesArray = []; }
    } else {
        if (isInverted) { isInverted = false; dino.y = canvas.height - dino.height; obstaclesArray = []; }
    }
}

function updateStatusEffects() {
    if (hasShield) { shieldTimer--; if (shieldTimer <= 0) hasShield = false; }
    if (isSlowMotion) { slowTimer--; if (slowTimer <= 0) { isSlowMotion = false; gameSpeed = 5; } }
}

function checkCollision() {
    for (let obs of obstaclesArray) {
        if (dino.x < obs.x + obs.width - 5 && dino.x + dino.width - 5 > obs.x &&
            dino.y < obs.y + obs.height - 5 && dino.y + dino.height - 5 > obs.y) {
            if (hasShield) { hasShield = false; obs.markedForDeletion = true; return false; }
            return true;
        }
    }
    for (let p of powerupsArray) {
        if (dino.x < p.x + p.width && dino.x + dino.width > p.x &&
            dino.y < p.y + p.height && dino.y + dino.height > p.y) {
            
            if (collectSound.readyState >= 2) collectSound.cloneNode().play().catch(()=>{});

            if (p.type === 'shield') { hasShield = true; shieldTimer = 300; }
            else if (p.type === 'slow') { isSlowMotion = true; slowTimer = 300; gameSpeed = 2; }
            p.markedForDeletion = true;
        }
    }
    return false;
}

function updateUI() {
    scoreEl.innerText = score;
    modeEl.innerText = dino.mode.toUpperCase();
    if (isInverted) document.body.style.backgroundColor = '#400'; 
    else document.body.style.backgroundColor = '#202028';
}

// --- INPUTS ---
window.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        if (!gameRunning && !isGameOver) startGame();
        else if (isGameOver) location.reload();
    }
    if (!gameRunning) return; 
    
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dino.action();
    if (e.key === ' ') {
        dino.toggleMode();
        e.preventDefault();
    }
});

// Touch support
document.getElementById('start-btn').addEventListener('click', startGame);

// --- LOOP ---
function animate() {
    if (!gameRunning) return; 
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Sky
    ctx.fillStyle = isInverted ? '#222' : '#f0f0f0'; 
    ctx.fillRect(0,0, canvas.width, canvas.height);

    dino.update();
    handleObstacles();
    handlePowerUps();
    updateStatusEffects();
    updateUI();

    if (checkCollision()) {
        stopGame();
    } else {
        gameFrame++;
        requestAnimationFrame(animate);
    }
}
