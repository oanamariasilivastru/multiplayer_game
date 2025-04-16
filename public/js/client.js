// client.js

// 1) Conexiune la server
const socket = io()

// Referințe la elemente
const startScreen = document.getElementById('startScreen')
const gameContainer = document.getElementById('gameContainer')
const hostBtn = document.getElementById('hostBtn')
const joinBtn = document.getElementById('joinBtn')
const joinRoomIdInput = document.getElementById('joinRoomId')
const statusDiv = document.getElementById('status')
const displayText = document.getElementById('displayText')
const timerElement = document.getElementById('timer')
const pauseModal = document.getElementById('pauseModal')

// Variabile globale
let roomId = null
let paused = false
let timer = 60
let timerId = null
let myRole = null // 'player1' / 'player2'

// 2) Butoane Host/Join
hostBtn.addEventListener('click', () => {
  socket.emit('hostGame')
})

socket.on('gameHosted', data => {
  roomId = data.roomId
  myRole = data.role  // => 'player1'
  statusDiv.innerText = `Room creat: ${roomId} (aștept adversar...)`
})

joinBtn.addEventListener('click', () => {
  const rid = joinRoomIdInput.value.trim()
  if (!rid) return
  socket.emit('joinGame', rid)
})

socket.on('joinError', data => {
  statusDiv.innerText = `Eroare la Join: ${data.message}`
})

socket.on('gameJoined', data => {
  roomId = data.roomId
  myRole = data.role  // => 'player2'
  statusDiv.innerText = `Ai intrat în room: ${roomId}`
})

socket.on('startGame', data => {
  statusDiv.innerText = `Game started (room: ${data.roomId})`
  startMultiplayerGame()
})

// Dacă adversarul iese
socket.on('opponentLeft', () => {
  statusDiv.innerText = 'Adversarul a părăsit jocul!'
})

// 3) Canvas
const canvas = document.getElementById('gameCanvas')
const c = canvas.getContext('2d')
canvas.width = 1024
canvas.height = 576

function clearScreen() {
  c.fillStyle = 'black'
  c.fillRect(0, 0, canvas.width, canvas.height)
}

// 4) Creăm 2 Fighteri: "fighter1" = player1, "fighter2" = player2
const gravity = 0.7

// Background + shop
const background = new Sprite({
  position: { x: 0, y: 0 },
  imageSrc: 'img/background.png'
})
const shop = new Sprite({
  position: { x: 600, y: 128 },
  imageSrc: 'img/shop.png',
  scale: 2.75,
  framesMax: 6
})

// Player1
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
})

// Player2
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
})

// Vom stoca "localFighter" și "remoteFighter" după ce aflăm myRole
let localFighter = null
let remoteFighter = null

// 5) Taste
const keys = {
  a: { pressed: false },
  d: { pressed: false }
}

// 6) Key events
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    paused = !paused
    if (paused) {
      if (timerId) clearTimeout(timerId)
      pauseModal.style.display = 'flex'
    } else {
      pauseModal.style.display = 'none'
      decreaseTimer()
    }

    if (roomId) {
      socket.emit('togglePause', {
        roomId: roomId,
        isPaused: paused
      })
    }
    return
  }

  // Verificăm dacă localFighter există și e viu
  if (localFighter && !localFighter.dead) {
    switch (e.key) {
      case 'd':
        keys.d.pressed = true
        localFighter.lastKey = 'd'
        break
      case 'a':
        keys.a.pressed = true
        localFighter.lastKey = 'a'
        break
      case 'w':
        localFighter.velocity.y = -20
        break
      case ' ':
        localFighter.attack()
        break
    }
  }
})

window.addEventListener('keyup', e => {
  switch (e.key) {
    case 'd':
      keys.d.pressed = false
      break
    case 'a':
      keys.a.pressed = false
      break
  }
})

// 7) Trimitem starea locală
function sendPlayerState() {
  if (!roomId || !localFighter) return
  socket.emit('playerState', {
    roomId,
    x: localFighter.position.x,
    y: localFighter.position.y,
    health: localFighter.health,
    isAttacking: localFighter.isAttacking,
    spriteName: localFighter.currentSpriteName,
    framesCurrent: localFighter.framesCurrent
  })
}

// 8) Primim update adversar
socket.on('opponentUpdate', data => {
  if (!remoteFighter) return

  const s = data.state
  remoteFighter.position.x = s.x
  remoteFighter.position.y = s.y
  remoteFighter.health = s.health
  remoteFighter.isAttacking = s.isAttacking

  // Sincronizăm animația
  remoteFighter.switchSprite(s.spriteName)
  remoteFighter.framesCurrent = s.framesCurrent
  
})

// 8b) Pauză de la adversar
socket.on('pauseUpdate', data => {
  paused = data.isPaused
  if (paused) {
    if (timerId) clearTimeout(timerId)
    pauseModal.style.display = 'flex'
  } else {
    pauseModal.style.display = 'none'
    decreaseTimer()
  }
})

// 8c) Lovit => scade HP (enemyWasHit)
socket.on('enemyWasHit', data => {
  // localFighter e victima
  if (localFighter) {
    localFighter.takeHit(data.damage)
  }
})

// 9) Timer
function decreaseTimer() {
  if (paused) return
  if (timer > 0) {
    timerId = setTimeout(decreaseTimer, 1000)
    timer--
    timerElement.textContent = timer
  } else {
    endGame()
  }
}

function endGame() {
  const result = determineWinner(fighter1, fighter2)
  displayText.innerText = result
  displayText.style.display = 'flex'
}

// 10) Bucla animație
function animate() {
  requestAnimationFrame(animate)
  if (paused) return

  // **Evitatăm eroarea**: dacă localFighter e null
  if (!localFighter || !remoteFighter) return

  clearScreen()
  background.update(c)
  shop.update(c)

  c.fillStyle = 'rgba(255,255,255,0.15)'
  c.fillRect(0, 0, canvas.width, canvas.height)

  // localFighter
  localFighter.velocity.x = 0
  if (!localFighter.dead) {
    if (keys.a.pressed && localFighter.lastKey === 'a') {
      localFighter.velocity.x = -5
      localFighter.switchSprite('run')
    } else if (keys.d.pressed && localFighter.lastKey === 'd') {
      localFighter.velocity.x = 5
      localFighter.switchSprite('run')
    } else {
      localFighter.switchSprite('idle')
    }

    if (localFighter.velocity.y < 0) {
      localFighter.switchSprite('jump')
    } else if (localFighter.velocity.y > 0) {
      localFighter.switchSprite('fall')
    }
  }

  localFighter.update(c, canvas.height, gravity)
  remoteFighter.update(c, canvas.height, gravity)

  // Coliziuni => localFighter lovește adversarul
  if (
    rectangularCollision({ rectangle1: localFighter, rectangle2: remoteFighter }) &&
    localFighter.isAttacking &&
    localFighter.framesCurrent === 4
  ) {
    // Notificăm serverul că am lovit
    socket.emit('hitEnemy', {
      roomId: roomId,
      damage: 20
    })
    localFighter.isAttacking = false
  }

  if (localFighter.isAttacking && localFighter.framesCurrent === 4) {
    localFighter.isAttacking = false
  }

  // Verificăm HP => final
  if (fighter1.health <= 0 || fighter2.health <= 0) {
    endGame()
  }

  // Trimitem starea locală
  sendPlayerState()
}

// 11) startMultiplayerGame
function startMultiplayerGame() {
  startScreen.style.display = 'none'
  gameContainer.style.display = 'block'

  // Stabilim cine e localFighter si cine e remoteFighter
  if (myRole === 'player1') {
    localFighter = fighter1
    remoteFighter = fighter2
  } else {
    localFighter = fighter2
    remoteFighter = fighter1
  }

  // Pornim timerul
  timer = 60
  decreaseTimer()

  // Pornim animația
  animate()
}
