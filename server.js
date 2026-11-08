// Blocky multiplayer server
// Keeps track of online players, rooms (hosted games), positions, chat, and name search.
// Run with:  node server.js   (listens on the PORT environment variable, default 8080)

const http = require('http');
const { WebSocketServer } = require('ws');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const MAX_ROOM_PLAYERS = 12;
const MAX_CHAT = 200;
const POS_PER_SECOND = 20;

const BAD_WORDS = ['fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'crap', 'piss'];
function censor(text) {
  let out = String(text);
  BAD_WORDS.forEach(w => {
    out = out.replace(new RegExp(w, 'gi'), m => '#'.repeat(m.length));
  });
  return out;
}
function cleanText(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}
function cleanName(v) {
  const n = cleanText(v, 20);
  return n || 'Player';
}
function cleanAvatar(a) {
  if (!a || typeof a !== 'object') return {};
  const keep = ['shirt', 'pants', 'skin', 'hat', 'rig', 'face', 'shirtPattern', 'pantsPattern', 'gear', 'emote'];
  const out = {};
  keep.forEach(k => { if (typeof a[k] === 'string') out[k] = a[k].slice(0, 40); });
  return out;
}

const players = new Map();   // id -> { id, name, avatar, room, ws, posCount, posWindow }
const rooms = new Map();     // roomId -> { id, game, host, members:Set }

function send(ws, msg) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}
function sendTo(id, msg) {
  const p = players.get(id);
  if (p) send(p.ws, msg);
}
function roomInfo(room) {
  const host = players.get(room.host);
  return {
    id: room.id,
    game: room.game,
    hostName: host ? host.name : 'Player',
    players: room.members.size,
    max: MAX_ROOM_PLAYERS
  };
}
function onlineSnapshot() {
  const users = [];
  players.forEach(p => users.push({ id: p.id, name: p.name, room: p.room }));
  const roomList = [];
  rooms.forEach(r => roomList.push(roomInfo(r)));
  return { t: 'online', users, rooms: roomList };
}
function broadcastOnline() {
  const snap = onlineSnapshot();
  players.forEach(p => send(p.ws, snap));
}
function leaveRoom(p) {
  if (!p.room) return;
  const room = rooms.get(p.room);
  p.room = null;
  if (!room) return;
  room.members.delete(p.id);
  if (room.host === p.id) {
    // the host left: the room closes and everyone in it is sent out
    room.members.forEach(mid => {
      const m = players.get(mid);
      if (m) { m.room = null; send(m.ws, { t: 'roomClosed' }); }
    });
    rooms.delete(room.id);
  } else {
    room.members.forEach(mid => sendTo(mid, { t: 'left', id: p.id, name: p.name }));
    if (room.members.size === 0) rooms.delete(room.id);
  }
}
function rateOk(p) {
  const now = Date.now();
  if (!p.posWindow || now - p.posWindow > 1000) { p.posWindow = now; p.posCount = 0; }
  p.posCount++;
  return p.posCount <= POS_PER_SECOND;
}

const httpServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, name: 'Blocky server', online: players.size, rooms: rooms.size }));
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

const wss = new WebSocketServer({ server: httpServer, maxPayload: 16 * 1024 });

wss.on('connection', (ws) => {
  const p = { id: crypto.randomBytes(6).toString('hex'), name: 'Player', avatar: {}, room: null, ws: ws, posCount: 0, posWindow: 0 };
  players.set(p.id, p);
  send(ws, { t: 'welcome', id: p.id });

  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(String(raw)); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;

    switch (m.t) {
      case 'hello': {
        p.name = cleanName(m.name);
        p.avatar = cleanAvatar(m.avatar);
        send(ws, { t: 'welcome', id: p.id, name: p.name });
        broadcastOnline();
        break;
      }
      case 'host': {
        leaveRoom(p);
        const g = m.game || {};
        const room = {
          id: p.id,
          game: { id: cleanText(g.id, 40) || 'blocky', name: cleanText(g.name, 40) || 'Blocky World' },
          host: p.id,
          members: new Set([p.id])
        };
        rooms.set(room.id, room);
        p.room = room.id;
        send(ws, { t: 'roomCreated', room: roomInfo(room) });
