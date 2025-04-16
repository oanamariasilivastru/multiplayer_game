const express = require('express')
const http = require('http')
const path = require('path')
const socketIo = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = socketIo(server)

// Servim conținutul din folderul "public"
app.use(express.static(path.join(__dirname, 'public')))

// Structura: rooms[roomId] = { players: { socketId1: {...}, socketId2: {...} } }
const rooms = {}

io.on('connection', socket => {
  console.log('Client connected:', socket.id)

  // 1) Când cineva face Host
  socket.on('hostGame', () => {
    const roomId = Math.random().toString(36).substr(2, 5)
    rooms[roomId] = { players: {} }

    // Marcam jucătorul host ca "player1"
    rooms[roomId].players[socket.id] = {
      x: 0,
      y: 0,
      health: 100,
      role: 'player1'
    }

    socket.join(roomId)
    socket.emit('gameHosted', { roomId, role: 'player1' })
    console.log(`Host created room: ${roomId}`)
  })

  // 2) Când cineva face Join
  socket.on('joinGame', roomId => {
    const room = rooms[roomId]
    if (!room) {
      socket.emit('joinError', { message: 'Camera inexistentă' })
      return
    }

    if (Object.keys(room.players).length >= 2) {
      socket.emit('joinError', { message: 'Camera este plină' })
      return
    }

    rooms[roomId].players[socket.id] = {
      x: 400,
      y: 100,
      health: 100,
      role: 'player2'
    }

    socket.join(roomId)
    socket.emit('gameJoined', { roomId, role: 'player2' })

    // Dacă avem 2 jucători, startGame
    if (Object.keys(room.players).length === 2) {
      io.to(roomId).emit('startGame', { roomId })
      console.log(`Room ${roomId} startGame!`)
    }
  })

  // 3) Jucătorul trimite starea locală
  socket.on('playerState', data => {
    // data = { roomId, x, y, health, isAttacking, spriteName, framesCurrent, ... }
    const room = rooms[data.roomId]
    if (!room) return
    if (!room.players[socket.id]) return

    // Updatăm starea jucătorului în server
    rooms[data.roomId].players[socket.id] = {
      ...rooms[data.roomId].players[socket.id],
      ...data
    }

    // Trimitem adversarului
    socket.to(data.roomId).emit('opponentUpdate', {
      socketId: socket.id,
      state: rooms[data.roomId].players[socket.id]
    })
  })

  // 4) Pauză sincronizată
  socket.on('togglePause', data => {
    socket.to(data.roomId).emit('pauseUpdate', {
      isPaused: data.isPaused
    })
  })

  // 5) Lovitură => scădem HP adversar
  socket.on('hitEnemy', data => {
    // data = { roomId, damage }
    // Anunțăm direct adversarul că a fost lovit
    socket.to(data.roomId).emit('enemyWasHit', { damage: data.damage })
  })

  // 6) Deconectare
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id]
        socket.to(roomId).emit('opponentLeft')
        if (Object.keys(rooms[roomId].players).length === 0) {
          delete rooms[roomId]
        }
        break
      }
    }
  })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
