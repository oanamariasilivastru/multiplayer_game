// 1) Conexiune la server
const socket = io();

// Referințe la elemente din HTML
const startScreen = document.getElementById('startScreen');
const gameContainer = document.getElementById('gameContainer');
const hostBtn = document.getElementById('hostBtn');
const joinBtn = document.getElementById('joinBtn');
const joinRoomIdInput = document.getElementById('joinRoomId');
const statusDiv = document.getElementById('status');
const displayText = document.getElementById('displayText');
const timerElement = document.getElementById('timer');
const pauseModal = document.getElementById('pauseModal');

// Bare de viață
const playerHealthDiv = document.getElementById('playerHealth');
const enemyHealthDiv = document.getElementById('enemyHealth');

// Variabile globale
let roomId = null;
let paused = false;
let timer = 60;
let timerId = null;
let myRole = null; // 'player1' sau 'player2'

// Controale
const keys = {
  // Player1
  a: { pressed: false },
  d: { pressed: false },
  w: { pressed: false },
  // Player2
  ArrowLeft: { pressed: false },
  ArrowRight: { pressed: false },
  ArrowUp: { pressed: false }
};

// ------------------ 2) Butoane Host/Join ------------------
hostBtn.addEventListener('click', () => {
  socket.emit('hostGame');
});

socket.on('gameHosted', data => {
  roomId = data.roomId;
  myRole = data.role;  // => 'player1'
  statusDiv.innerText = `Room creat: ${roomId} (aștept adversar...)`;
});

joinBtn.addEventListener('click', () => {
  const rid = joinRoomIdInput.value.trim();
  if (!rid) return;
  socket.emit('joinGame', rid);
});

socket.on('joinError', data => {
  statusDiv.innerText = `Eroare la Join: ${data.message}`;
});

socket.on('gameJoined', data => {
  roomId = data.roomId;
  myRole = data.role;  // => 'player2'
  statusDiv.innerText = `Ai intrat în room: ${roomId}`;
});

socket.on('startGame', data => {
  statusDiv.innerText = `Game started (room: ${data.roomId})`;
  startMultiplayerGame();
});

// Dacă adversarul iese
socket.on('opponentLeft', () => {
  statusDiv.innerText = 'Adversarul a părăsit jocul!';
});

// ------------------ 3) Canvas ------------------
const canvas = document.getElementById('gameCanvas');
const c = canvas.getContext('2d');
canvas.width = 1024;
canvas.height = 576;

function clearScreen() {
  c.fillStyle = 'black';
  c.fillRect(0, 0, canvas.width, canvas.height);
}

// ------------------ 4) Creăm 2 Fighteri ------------------
// Folosește configurațiile din classes.js. Asigură-te că în configurație
// pentru fiecare fighter ai inclus toate sprite-urile necesare, inclusiv "death".

const gravity = 0.7;

// Exemplu de creare a fighterilor (completează calea imaginilor și framesMax conform proiectului tău):
const background = new Sprite({
  position: { x: 0, y: 0 },
  imageSrc: 'img/background.png'
});
const shop = new Sprite({
  position: { x: 600, y: 128 },
  imageSrc: 'img/shop.png',
  scale: 2.75,
  framesMax: 6
});

const fighter1 = new Fighter({
  position: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  imageSrc: 'img/samuraiMack/Idle.png',
  framesMax: 8,
  scale: 2.5,
  offset: { x: 215, y: 157 },
  sprites: {
    idle: { imageSrc: 'img/samuraiMack/Idle.png', framesMax: 8 },
    run: { imageSrc: 'img/samuraiMack/Run.png', framesMax: 8 },
    jump: { imageSrc: 'img/samuraiMack/Jump.png', framesMax: 2 },
    fall: { imageSrc: 'img/samuraiMack/Fall.png', framesMax: 2 },
    attack1: { imageSrc: 'img/samuraiMack/Attack1.png', framesMax: 6 },
    takeHit: { imageSrc: 'img/samuraiMack/Take Hit - white silhouette.png', framesMax: 4 },
    death: { imageSrc: 'img/samuraiMack/Death.png', framesMax: 6 }
  },
  attackBox: {
    offset: { x: 100, y: 50 },
    width: 160,
    height: 50
  }
});

const fighter2 = new Fighter({
  position: { x: 400, y: 100 },
  velocity: { x: 0, y: 0 },
  color: 'blue',
  imageSrc: 'img/kenji/Idle.png',
  framesMax: 4,
  scale: 2.5,
  offset: { x: 215, y: 167 },
  sprites: {
    idle: { imageSrc: 'img/kenji/Idle.png', framesMax: 4 },
    run: { imageSrc: 'img/kenji/Run.png', framesMax: 8 },
    jump: { imageSrc: 'img/kenji/Jump.png', framesMax: 2 },
    fall: { imageSrc: 'img/kenji/Fall.png', framesMax: 2 },
    attack1: { imageSrc: 'img/kenji/Attack1.png', framesMax: 4 },
    takeHit: { imageSrc: 'img/kenji/Take hit.png', framesMax: 3 },
    death: { imageSrc: 'img/kenji/Death.png', framesMax: 7 }
  },
  attackBox: {
    offset: { x: -170, y: 50 },
    width: 170,
    height: 50
  }
});

let localFighter = null;
let remoteFighter = null;

// ------------------ 5) Key events ------------------
window.addEventListener('keydown', e => {
  // Pauză
  if (e.key === 'Escape') {
    paused = !paused;
    if (paused) {
      if (timerId) clearTimeout(timerId);
      pauseModal.style.display = 'flex';
    } else {
      pauseModal.style.display = 'none';
      decreaseTimer();
    }
    if (roomId) {
      socket.emit('togglePause', { roomId, isPaused: paused });
    }
    return;
  }

  if (!localFighter || localFighter.dead) return;

  if (myRole === 'player1') {
    switch (e.key) {
      case 'd':
        keys.d.pressed = true;
        localFighter.lastKey = 'd';
        break;
      case 'a':
        keys.a.pressed = true;
        localFighter.lastKey = 'a';
        break;
      case 'w':
        if (!keys.w.pressed) {
          localFighter.velocity.y = -20;
          keys.w.pressed = true;
        }
        break;
      case ' ':
        localFighter.attack();
        break;
    }
  } else {
    switch (e.key) {
      case 'ArrowLeft':
        keys.ArrowLeft.pressed = true;
        localFighter.lastKey = 'ArrowLeft';
        break;
      case 'ArrowRight':
        keys.ArrowRight.pressed = true;
        localFighter.lastKey = 'ArrowRight';
        break;
      case 'ArrowUp':
        if (!keys.ArrowUp.pressed) {
          localFighter.velocity.y = -20;
          keys.ArrowUp.pressed = true;
        }
        break;
      case 'ArrowDown':
        localFighter.attack();
        break;
    }
  }
});

window.addEventListener('keyup', e => {
  if (myRole === 'player1') {
    switch (e.key) {
      case 'd':
        keys.d.pressed = false;
        break;
      case 'a':
        keys.a.pressed = false;
        break;
      case 'w':
        keys.w.pressed = false;
        break;
    }
  } else {
    switch (e.key) {
      case 'ArrowRight':
        keys.ArrowRight.pressed = false;
        break;
      case 'ArrowLeft':
        keys.ArrowLeft.pressed = false;
        break;
      case 'ArrowUp':
        keys.ArrowUp.pressed = false;
        break;
    }
  }
});

// ------------------ 6) Actualizare Health Bars ------------------
function updateHealthBars() {
  playerHealthDiv.style.width = fighter1.health + '%';
  enemyHealthDiv.style.width = fighter2.health + '%';
}

// ------------------ 7) Trimitem starea locală ------------------
function sendPlayerState() {
  if (!roomId || !localFighter) return;
  socket.emit('playerState', {
    roomId,
    x: localFighter.position.x,
    y: localFighter.position.y,
    health: localFighter.health,
    isAttacking: localFighter.isAttacking,
    spriteName: localFighter.currentSpriteName,
    framesCurrent: localFighter.framesCurrent
  });
}

// ------------------ 8) Evenimente de la server ------------------
socket.on('opponentUpdate', data => {
  if (!remoteFighter) return;
  const s = data.state;
  remoteFighter.position.x = s.x;
  remoteFighter.position.y = s.y;
  remoteFighter.health = s.health;
  remoteFighter.isAttacking = s.isAttacking;
  remoteFighter.switchSprite(s.spriteName);
  remoteFighter.framesCurrent = s.framesCurrent;
});

socket.on('pauseUpdate', data => {
  paused = data.isPaused;
  if (paused) {
    if (timerId) clearTimeout(timerId);
    pauseModal.style.display = 'flex';
  } else {
    pauseModal.style.display = 'none';
    decreaseTimer();
  }
});

socket.on('enemyWasHit', data => {
  if (localFighter) {
    localFighter.takeHit(data.damage);
  }
});

// ------------------ 9) Timer ------------------
function decreaseTimer() {
  if (paused) return;
  if (timer > 0) {
    timerId = setTimeout(decreaseTimer, 1000);
    timer--;
    timerElement.textContent = timer;
  } else {
    endGame();
  }
}

function endGame() {
  const result = determineWinner(fighter1, fighter2);
  displayText.innerText = result;
  displayText.style.display = 'flex';
}

// ------------------ 10) Bucla de animație ------------------
function animate() {
  requestAnimationFrame(animate);
  if (paused) return;
  if (!localFighter || !remoteFighter) return;

  clearScreen();
  background.update(c);
  shop.update(c);

  c.fillStyle = 'rgba(255,255,255,0.15)';
  c.fillRect(0, 0, canvas.width, canvas.height);

  localFighter.velocity.x = 0;

  if (myRole === 'player1' && !localFighter.dead) {
    if (keys.a.pressed && localFighter.lastKey === 'a') {
      localFighter.velocity.x = -5;
      localFighter.switchSprite('run');
    } else if (keys.d.pressed && localFighter.lastKey === 'd') {
      localFighter.velocity.x = 5;
      localFighter.switchSprite('run');
    } else {
      localFighter.switchSprite('idle');
    }
    if (localFighter.velocity.y < 0) {
      localFighter.switchSprite('jump');
    } else if (localFighter.velocity.y > 0) {
      localFighter.switchSprite('fall');
    }
  } else if (myRole === 'player2' && !localFighter.dead) {
    if (keys.ArrowLeft.pressed && localFighter.lastKey === 'ArrowLeft') {
      localFighter.velocity.x = -5;
      localFighter.switchSprite('run');
    } else if (keys.ArrowRight.pressed && localFighter.lastKey === 'ArrowRight') {
      localFighter.velocity.x = 5;
      localFighter.switchSprite('run');
    } else {
      localFighter.switchSprite('idle');
    }
    if (localFighter.velocity.y < 0) {
      localFighter.switchSprite('jump');
    } else if (localFighter.velocity.y > 0) {
      localFighter.switchSprite('fall');
    }
  }

  localFighter.update(c, canvas.height, gravity);
  remoteFighter.update(c, canvas.height, gravity);

  // Coliziune și lovitură
  if (
    rectangularCollision({ rectangle1: localFighter, rectangle2: remoteFighter }) &&
    localFighter.isAttacking &&
    localFighter.framesCurrent === 4
  ) {
    socket.emit('hitEnemy', { roomId, damage: 20 });
    localFighter.isAttacking = false;
  }
  if (localFighter.isAttacking && localFighter.framesCurrent === 4) {
    localFighter.isAttacking = false;
  }

  if (fighter1.health <= 0 || fighter2.health <= 0) {
    endGame();
  }

  updateHealthBars();
  sendPlayerState();
}

// ------------------ 11) Start multiplayer ------------------
function startMultiplayerGame() {
  startScreen.style.display = 'none';
  gameContainer.style.display = 'block';

  if (myRole === 'player1') {
    localFighter = fighter1;
    remoteFighter = fighter2;
  } else {
    localFighter = fighter2;
    remoteFighter = fighter1;
  }

  timer = 60;
  fighter1.health = 100;
  fighter2.health = 100;
  updateHealthBars();

  decreaseTimer();
  animate();
}
