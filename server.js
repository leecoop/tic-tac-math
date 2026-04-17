const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;

const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function createRoom() {
  let code;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));
  
  const room = {
    code,
    host: null,
    guest: null,
    createdAt: Date.now()
  };
  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  return rooms.get(code);
}

function deleteRoom(code) {
  rooms.delete(code);
}

function broadcastToRoom(room, message, excludeWs = null) {
  const data = JSON.stringify(message);
  if (room.host && room.host !== excludeWs && room.host.readyState === 1) {
    room.host.send(data);
  }
  if (room.guest && room.guest !== excludeWs && room.guest.readyState === 1) {
    room.guest.send(data);
  }
}

function handleConnection(ws, req) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomCode = url.searchParams.get('room');
  
  ws.isAlive = true;
  ws.roomCode = null;
  ws.isHost = false;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(ws, message);
    } catch (err) {
      console.error('Invalid message:', err);
    }
  });

  ws.on('close', () => {
    handleDisconnect(ws);
  });

  ws.send(JSON.stringify({ type: 'connected' }));
}

function handleMessage(ws, message) {
  const { type, payload } = message;

  switch (type) {
    case 'createRoom':
      handleCreateRoom(ws, payload);
      break;
    case 'joinRoom':
      handleJoinRoom(ws, payload);
      break;
    case 'offer':
    case 'answer':
    case 'iceCandidate':
      relaySignaling(ws, type, payload);
      break;
    case 'gameState':
      relayGameState(ws, payload);
      break;
    case 'leaveRoom':
      handleLeaveRoom(ws);
      break;
    default:
      console.log('Unknown message type:', type);
  }
}

function handleCreateRoom(ws, payload) {
  const room = createRoom();
  room.host = ws;
  room.hostName = payload?.name || 'שחקן X';
  ws.roomCode = room.code;
  ws.isHost = true;
  
  ws.send(JSON.stringify({
    type: 'roomCreated',
    payload: { roomCode: room.code }
  }));
}

function handleJoinRoom(ws, payload) {
  const { roomCode, name } = payload || {};
  if (!roomCode) {
    ws.send(JSON.stringify({
      type: 'error',
      payload: { message: 'Room code required' }
    }));
    return;
  }

  const room = getRoom(roomCode);
  if (!room) {
    ws.send(JSON.stringify({
      type: 'error',
      payload: { message: 'Room not found' }
    }));
    return;
  }

  if (room.guest) {
    ws.send(JSON.stringify({
      type: 'error',
      payload: { message: 'Room is full' }
    }));
    return;
  }

  room.guest = ws;
  room.guestName = name || 'שחקן O';
  ws.roomCode = roomCode;
  ws.isHost = false;

  ws.send(JSON.stringify({
    type: 'roomJoined',
    payload: { roomCode }
  }));

  broadcastToRoom(room, { type: 'peerConnected', payload: { 
    hostName: room.hostName, 
    guestName: room.guestName 
  }});

  console.log(`Player joined room: ${roomCode}`);
}

function relaySignaling(ws, type, payload) {
  const room = getRoom(ws.roomCode);
  if (!room) return;

  const target = ws === room.host ? room.guest : room.host;
  if (target && target.readyState === 1) {
    target.send(JSON.stringify({ type, payload }));
  }
}

function relayGameState(ws, state) {
  const room = getRoom(ws.roomCode);
  if (!room) return;

  const target = ws === room.host ? room.guest : room.host;
  if (target && target.readyState === 1) {
    target.send(JSON.stringify({
      type: 'gameState',
      payload: state
    }));
  }
}

function handleDisconnect(ws) {
  handleLeaveRoom(ws);
  ws.isAlive = false;
}

function handleLeaveRoom(ws) {
  if (!ws.roomCode) return;

  const room = getRoom(ws.roomCode);
  if (!room) return;

  const other = ws === room.host ? room.guest : room.host;
  
  if (other && other.readyState === 1) {
    other.send(JSON.stringify({ type: 'peerDisconnected' }));
  }

  deleteRoom(ws.roomCode);
  console.log(`Player left room: ${ws.roomCode}, room deleted`);
}

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  
  const filePath = path.join(__dirname, urlPath);
  const ext = path.extname(filePath);
  const contentType = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json'
  }[ext] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  handleConnection(ws, req);
});

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      handleLeaveRoom(ws);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});