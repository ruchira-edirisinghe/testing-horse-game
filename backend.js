// ═══════════════════════════════════════════════════════════
//  BACKEND.JS — Data Layer, Game State, Physics & Payout
//  MULTIPLAYER ENABLED — Firebase Realtime Database Integration
// ═══════════════════════════════════════════════════════════

// ── FIREBASE CONFIG ──────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBNZ0_YOUR_API_KEY_HERE",
  authDomain: "horse-racing-game.firebaseapp.com",
  databaseURL: "https://horse-racing-game-default-rtdb.firebaseio.com",
  projectId: "horse-racing-game",
  storageBucket: "horse-racing-game.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ── MULTIPLAYER STATE ────────────────────────────────────────
let playerName = null;
let playerId = null;
let currentRoomCode = null;
let currentPlayers = [];
let playerListenersActive = {};
let db = null;  // Firebase Realtime Database reference

// ── ROOM DATA ────────────────────────────────────────────────
const PUBLIC_ROOMS = [
  {
    id: 1,
    name: "Cyber_Viper's Arena",
    host: "Cyber_Viper",
    icon: "🎮",
    type: "open",
    tag: "fast",
    tagLabel: "⚡ FAST PLAY",
    stake: 50,
    players: ["Cyber_Viper", "ShadowRider", "NeonGhost"],
    maxPlayers: 8,
    track: "Thunder Downs",
    distance: "1200m",
    password: null,
  },
  {
    id: 2,
    name: "Neon_Ghost_99",
    host: "Neon_Ghost_99",
    icon: "🎮",
    type: "ranked",
    tag: "ranked",
    tagLabel: "★ RANKED",
    stake: 50,
    players: ["Neon_Ghost_99", "IronJockey", "BlazeStar", "RapidRider"],
    maxPlayers: 8,
    track: "Galactic Mile",
    distance: "2000m",
    password: null,
  },
  {
    id: 3,
    name: "Private Match #482",
    host: "DarkHorsePro",
    icon: "🔒",
    type: "private",
    tag: "ranked",
    tagLabel: "★ RANKED",
    stake: 50,
    players: ["DarkHorsePro", "VaultRider"],
    maxPlayers: 8,
    track: "Midnight Circuit",
    distance: "1600m",
    password: "derby99",
  },
  {
    id: 4,
    name: "Blazing_Saddle_Club",
    host: "Blazing_Saddle",
    icon: "🎮",
    type: "open",
    tag: "fast",
    tagLabel: "⚡ FAST PLAY",
    stake: 100,
    players: ["Blazing_Saddle", "QuickWhip", "DustDevil", "SteelSpurs", "TrailBlazer"],
    maxPlayers: 8,
    track: "Dust Bowl Flats",
    distance: "800m",
    password: null,
  },
];

// ── HORSE DATA ───────────────────────────────────────────────
const horses = [
  { name:"Thunder Bolt", color:"#e74c3c", jockey:"J. Smith",  odds:2.5,  form:["W","W","P","W"], speed:88, stamina:82 },
  { name:"Silver Wind",  color:"#b0bec5", jockey:"A. Jones",  odds:3.2,  form:["P","W","W","L"], speed:85, stamina:87 },
  { name:"Golden Star",  color:"#f39c12", jockey:"R. Brown",  odds:4.0,  form:["L","P","W","W"], speed:90, stamina:75 },
  { name:"Dark Moon",    color:"#546e7a", jockey:"M. Davis",  odds:6.5,  form:["W","L","L","P"], speed:82, stamina:90 },
  { name:"Rose Fire",    color:"#e91e8c", jockey:"C. Lee",    odds:8.0,  form:["L","L","W","W"], speed:87, stamina:80 },
  { name:"Blue Storm",   color:"#2980b9", jockey:"T. Wilson", odds:12.0, form:["L","L","L","W"], speed:83, stamina:85 },
];

// ── GAME STATE ───────────────────────────────────────────────
let balance       = 1250;
let selectedHorse = -1;
let racing        = false;
let positions     = [];
let velocities    = [];
let animFrame     = null;
let raceCount     = 0;
let history       = [];
let activeRoom    = null;

const TRACK_START = 3;
const TRACK_END   = 85;
const MAX_HISTORY = 10;

// ── NAVIGATION STACK ─────────────────────────────────────────
let screenStack = ["screen-home"];

// ── UTILITY: GENERATE INVITE CODES ──────────────────────────
function generateInviteCode(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ── UTILITY: GENERATE UNIQUE PLAYER ID ──────────────────────
function generatePlayerId() {
  return "player_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

// ── PLAYER NAME VALIDATION ──────────────────────────────────
function validatePlayerName(name) {
  if (!name || name.trim().length === 0) {
    return { valid: false, reason: "Player name cannot be empty." };
  }
  if (name.length > 20) {
    return { valid: false, reason: "Player name must be 20 characters or less." };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return { valid: false, reason: "Player name can only contain letters, numbers, underscore, and hyphen." };
  }
  if (currentPlayers.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    return { valid: false, reason: "This player name is already taken in this room!" };
  }
  return { valid: true };
}

// ── SET PLAYER NAME (called when joining) ──────────────────
function setPlayerName(name) {
  const validation = validatePlayerName(name);
  if (!validation.valid) {
    return validation;
  }
  playerName = name;
  if (!playerId) {
    playerId = generatePlayerId();
  }
  return { valid: true };
}

// ── PHYSICS ENGINE ───────────────────────────────────────────
function initVelocities() {
  return horses.map(h => {
    const base = (h.speed * 0.6 + h.stamina * 0.4) / 100;
    return base * 0.55 + Math.random() * 0.1;
  });
}

function tickHorse(i, tick) {
  const wobble  = (Math.random() - 0.5) * 0.22;
  const burst   = Math.random() < 0.035 ? 0.25 : 0;
  const fatigue = tick > 120 ? -0.002 : 0;
  velocities[i] = Math.max(0.18, Math.min(1.2, velocities[i] + wobble + burst + fatigue));
  positions[i] += velocities[i] * 0.2;
  if (positions[i] >= TRACK_END) { positions[i] = TRACK_END; return true; }
  return false;
}

// ── PAYOUT ───────────────────────────────────────────────────
function calcPayout(horseIndex, betAmount) {
  const gross  = Math.floor(betAmount * horses[horseIndex].odds);
  const profit = gross - betAmount;
  return { gross, profit };
}

function validateBet(horseIndex, betAmount) {
  if (horseIndex < 0)      return { valid: false, reason: "Please pick a horse first!" };
  if (betAmount < 10)      return { valid: false, reason: "Minimum bet is $10." };
  if (betAmount > balance) return { valid: false, reason: "Insufficient credits!" };
  return { valid: true };
}

// ── HISTORY ──────────────────────────────────────────────────
function recordResult(horse, won, net, bet, allBets = []) {
  history.unshift({ horse, won, net, bet, allBets, playerName });
  if (history.length > MAX_HISTORY) history.pop();
}

// ── COLOR UTILITY ────────────────────────────────────────────
function darken(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgb(${Math.floor(r*0.65)},${Math.floor(g*0.65)},${Math.floor(b*0.65)})`;
}

// ── MULTIPLAYER ROOM CREATION ────────────────────────────────
function createMultiplayerRoom(roomName, stake, icon) {
  const roomCode = generateInviteCode(8);
  const newRoom = {
    id: "mp_" + Date.now(),
    code: roomCode,
    name: roomName,
    host: playerName,
    hostId: playerId,
    icon: icon,
    type: "open",
    tag: "fast",
    tagLabel: "⚡ FAST PLAY",
    stake: stake,
    players: [playerName],
    playerList: [{ id: playerId, name: playerName, ready: false, joinedAt: Date.now() }],
    maxPlayers: 8,
    track: "Dynamic Track",
    distance: "2000m",
    password: null,
    createdAt: Date.now(),
    started: false,
  };
  return newRoom;
}

// ── MULTIPLAYER ROOM JOIN ───────────────────────────────────
function joinMultiplayerRoom(roomCode, nameToJoin) {
  const validation = validatePlayerName(nameToJoin);
  if (!validation.valid) {
    return validation;
  }
  playerName = nameToJoin;
  if (!playerId) {
    playerId = generatePlayerId();
  }
  currentRoomCode = roomCode;
  return { valid: true };
}
