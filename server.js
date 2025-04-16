const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servim fișierele statice din folderul "public"
app.use(express.static(path.join(__dirname, 'public')));

// Structura: rooms[roomId] = { players: { socketId: { ... } } }
const rooms = {};

io.on('connection', socket => {
  console.log('Client connected:', socket.id);

  // ------------------ 1) Host Game ------------------
  socket.on('hostGame', () => {
    const roomId = Math.random().toString(36).substr(2, 5);
    rooms[roomId] = { players: {} };

    // Setăm jucătorul host ca "player1"
    rooms[roomId].players[socket.id] = {
      x: 0,
      y: 0,
      health: 100,
      role: 'player1',
      dead: false
    };

    socket.join(roomId);
    socket.emit('gameHosted', { roomId, role: 'player1' });
    console.log(`Host a creat room: ${roomId}`);
  });

  // ------------------ 2) Join Game ------------------
  socket.on('joinGame', roomId => {
    const room = rooms[roomId];
    if (!room) {
      socket.emit('joinError', { message: 'Camera inexistentă' });
      return;
    }
    if (Object.keys(room.players).length >= 2) {
      socket.emit('joinError', { message: 'Camera este plină' });
      return;
    }

    rooms[roomId].players[socket.id] = {
      x: 400,
      y: 100,
      health: 100,
      role: 'player2',
      dead: false
    };

    socket.join(roomId);
    socket.emit('gameJoined', { roomId, role: 'player2' });

    // Când există 2 jucători, se pornește jocul
    if (Object.keys(room.players).length === 2) {
      io.to(roomId).emit('startGame', { roomId });
      console.log(`Room ${roomId} a pornit jocul!`);
    }
  });

  // ------------------ 3) Actualizarea stării jucătorului ------------------
  socket.on('playerState', data => {
    // data = { roomId, x, y, health, isAttacking, spriteName, framesCurrent }
    const room = rooms[data.roomId];
    if (!room || !room.players[socket.id]) return;

    rooms[data.roomId].players[socket.id] = {
      ...rooms[data.roomId].players[socket.id],
      ...data
    };

    // Transmitem starea actualizată către adversar
    socket.to(data.roomId).emit('opponentUpdate', {
      socketId: socket.id,
      state: rooms[data.roomId].players[socket.id]
    });
  });

  // ------------------ 4) Pauză Sincronizată ------------------
  socket.on('togglePause', data => {
    socket.to(data.roomId).emit('pauseUpdate', { isPaused: data.isPaused });
  });

  // ------------------ 5) Hit - Scădem HP adversarului ------------------
  socket.on('hitEnemy', data => {
    socket.to(data.roomId).emit('enemyWasHit', { damage: data.damage });
  });

  // ------------------ 6) Restart Game ------------------
  socket.on('restartGame', data => {
    const room = rooms[data.roomId];
    if (room) {
      // Resetează starea pentru toți jucătorii din cameră
      for (const playerId in room.players) {
        const player = room.players[playerId];
        player.x = player.role === 'player1' ? 0 : 400;
        player.y = player.role === 'player1' ? 0 : 100;
        player.health = 100;
        player.dead = false;
      }
    }
    io.to(data.roomId).emit('gameRestart');
    console.log(`Room ${data.roomId} a primit restartGame și starea a fost resetată!`);
  });

  // ------------------ 7) Deconectare ------------------
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        socket.to(roomId).emit('opponentLeft');
        if (Object.keys(rooms[roomId].players).length === 0) {
          delete rooms[roomId];
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
