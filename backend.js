// ═══════════════════════════════════════════════════════════
//  BACKEND.JS — Data Layer, Game State, Physics & Payout
//  MULTIPLAYER ENABLED — Firebase Realtime Database Integration
// ═══════════════════════════════════════════════════════════

// ── FIREBASE CONFIG ──────────────────────────────────────────
// ⚠️  REPLACE THESE VALUES WITH YOUR OWN FIREBASE PROJECT CONFIG
// Steps: console.firebase.google.com → New project → Realtime Database
//        → Create database (test mode) → Project Settings → Your apps → Config
const firebaseConfig = {

  apiKey: "AIzaSyDqfETGHkrlF-_eLeidqvOHQIZRaNFJDf0",
  authDomain: "testing-horse-game.firebaseapp.com",  
  projectId: "testing-horse-game",
  databaseURL: "https://testing-horse-game-default-rtdb.asia-southeast1.firebasedatabase.app/",
  storageBucket: "testing-horse-game.firebasestorage.app",
  messagingSenderId: "158202919680",
  appId: "1:158202919680:web:e7197b239d7fefd6dad1e5",
  measurementId: "G-713DJRXSN2"
};

// ── FIREBASE INIT ────────────────────────────────────────────
let db = null;

function initFirebase() {
  try {
    // Check if the user has replaced the default placeholders
    const isConfigured = firebaseConfig.apiKey && 
                         firebaseConfig.apiKey !== "YOUR_API_KEY" && 
                         !firebaseConfig.apiKey.includes("YOUR_") &&
                         firebaseConfig.databaseURL && 
                         !firebaseConfig.databaseURL.includes("console.firebase.google.com");
    
    if (!isConfigured) {
      console.warn("⚠️ Firebase not correctly configured (check databaseURL) — multiplayer will be local-only");
      return;
    }

    if (typeof firebase !== "undefined" && !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      db = firebase.database();
      console.log("✅ Firebase connected");
    } else if (typeof firebase !== "undefined") {
      db = firebase.database();
      console.log("✅ Firebase already initialized");
    } else {
      console.warn("⚠️ Firebase SDK not loaded — multiplayer will be local-only");
    }
  } catch (e) {
    console.error("Firebase init failed:", e);
  }
}

// ── MULTIPLAYER STATE ────────────────────────────────────────
let playerName = null;
let playerId   = null;
let currentRoomCode = null;
let currentPlayers  = [];
let activeRoom      = null;
let _lobbyUnsubscribe = null;  // call this to detach the live listener

// ── ROOM DATA (public demo rooms) ────────────────────────────
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

const TRACK_START = 3;
const TRACK_END   = 85;
const MAX_HISTORY = 10;

// ── NAVIGATION STACK ─────────────────────────────────────────
let screenStack = ["screen-home"];

// ── UTILITY: GENERATE INVITE CODE ───────────────────────────
function generateInviteCodeString(length) {
  length = length || 8;
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
  if (!name || name.trim().length === 0)
    return { valid: false, reason: "Player name cannot be empty." };
  if (name.length > 20)
    return { valid: false, reason: "Player name must be 20 characters or less." };
  if (!/^[a-zA-Z0-9_-]+$/.test(name))
    return { valid: false, reason: "Player name can only contain letters, numbers, underscore, and hyphen." };
  return { valid: true };
}

// ── SET PLAYER NAME ─────────────────────────────────────────
function setPlayerName(name) {
  const v = validatePlayerName(name);
  if (!v.valid) return v;
  playerName = name;
  if (!playerId) playerId = generatePlayerId();
  return { valid: true };
}

// ═══════════════════════════════════════════════════════════
//  FIREBASE ROOM FUNCTIONS
//  All rooms live at:  /rooms/{CODE}  in Firebase Realtime DB
// ═══════════════════════════════════════════════════════════

/**
 * Save a brand-new room to Firebase.
 * Always resolves — Firebase failure is logged but never blocks room creation.
 */
function saveRoomToFirebase(roomData) {
  return new Promise(function(resolve) {
    if (!db) {
      console.warn("No Firebase db — room stored locally only");
      resolve(roomData.code);
      return;
    }
    db.ref("rooms/" + roomData.code)
      .set(roomData)
      .then(function() {
        console.log("✅ Room saved to Firebase:", roomData.code);
        resolve(roomData.code);
      })
      .catch(function(err) {
        // Log the error but still let the game continue locally
        console.warn("Firebase save failed (room still created locally):", err.message || err);
        resolve(roomData.code);
      });
  });
}

/**
 * Fetch a room from Firebase by invite code.
 * Returns Promise<room | null>.  Always resolves.
 */
function fetchRoomFromFirebase(code) {
  return new Promise(function(resolve) {
    if (!db) {
      var local = (window.multiplayerRooms || []).find(function(r) {
        return r.code.toUpperCase() === code.toUpperCase();
      });
      resolve(local || null);
      return;
    }
    db.ref("rooms/" + code.toUpperCase())
      .once("value")
      .then(function(snapshot) {
        resolve(snapshot.val() || null);
      })
      .catch(function(err) {
        console.warn("Firebase fetch failed, trying local cache:", err.message || err);
        var local = (window.multiplayerRooms || []).find(function(r) {
          return r.code.toUpperCase() === code.toUpperCase();
        });
        resolve(local || null);
      });
  });
}

/**
 * Add the current player to an existing room in Firebase
 * (called by joiners, not the host).
 * Returns Promise<updatedRoom>.
 */
function addPlayerToFirebaseRoom(code, playerObj) {
  return new Promise(function(resolve, reject) {
    if (!db) { resolve(null); return; }
    var roomRef = db.ref("rooms/" + code.toUpperCase());
    roomRef.once("value").then(function(snapshot) {
      var room = snapshot.val();
      if (!room) { reject(new Error("Room not found")); return; }

      // Avoid duplicates
      var already = (room.playerList || []).find(function(p) {
        return p.id === playerObj.id;
      });
      if (already) { resolve(room); return; }

      var updatedPlayers    = (room.players    || []).concat([playerObj.name]);
      var updatedPlayerList = (room.playerList || []).concat([playerObj]);

      return roomRef.update({
        players:    updatedPlayers,
        playerList: updatedPlayerList,
      }).then(function() {
        room.players    = updatedPlayers;
        room.playerList = updatedPlayerList;
        resolve(room);
      });
    }).catch(reject);
  });
}

/**
 * Subscribe to live updates for a room.
 * onUpdate(room) is called every time Firebase data changes.
 * Returns an unsubscribe function — call it when leaving the lobby.
 */
function listenToRoom(code, onUpdate) {
  if (!db) return function() {};
  var ref = db.ref("rooms/" + code.toUpperCase());
  ref.on("value", function(snapshot) {
    var room = snapshot.val();
    if (room) onUpdate(room);
  });
  return function() { ref.off("value"); };
}

// ── MULTIPLAYER ROOM CREATION (builds the object) ────────────
function createMultiplayerRoom(roomName, stake, icon) {
  var roomCode = generateInviteCodeString(8);
  return {
    id:         "mp_" + Date.now(),
    code:       roomCode,
    name:       roomName,
    host:       playerName,
    hostId:     playerId,
    icon:       icon,
    type:       "open",
    tag:        "fast",
    tagLabel:   "⚡ FAST PLAY",
    stake:      stake,
    players:    [playerName],
    playerList: [{ id: playerId, name: playerName, ready: false, joinedAt: Date.now() }],
    maxPlayers: 8,
    track:      "Dynamic Track",
    distance:   "2000m",
    password:   null,
    createdAt:  Date.now(),
    started:    false,
  };
}

// ── PHYSICS ENGINE ───────────────────────────────────────────
function initVelocities() {
  return horses.map(function(h) {
    var base = (h.speed * 0.6 + h.stamina * 0.4) / 100;
    return base * 0.55 + Math.random() * 0.1;
  });
}

function tickHorse(i, tick) {
  var wobble  = (Math.random() - 0.5) * 0.22;
  var burst   = Math.random() < 0.035 ? 0.25 : 0;
  var fatigue = tick > 120 ? -0.002 : 0;
  velocities[i] = Math.max(0.18, Math.min(1.2, velocities[i] + wobble + burst + fatigue));
  positions[i] += velocities[i] * 0.2;
  if (positions[i] >= TRACK_END) { positions[i] = TRACK_END; return true; }
  return false;
}

// ── PAYOUT ───────────────────────────────────────────────────
function calcPayout(horseIndex, betAmount) {
  var gross  = Math.floor(betAmount * horses[horseIndex].odds);
  var profit = gross - betAmount;
  return { gross: gross, profit: profit };
}

function validateBet(horseIndex, betAmount) {
  if (horseIndex < 0)      return { valid: false, reason: "Please pick a horse first!" };
  if (betAmount < 10)      return { valid: false, reason: "Minimum bet is $10." };
  if (betAmount > balance) return { valid: false, reason: "Insufficient credits!" };
  return { valid: true };
}

// ── HISTORY ──────────────────────────────────────────────────
function recordResult(horse, won, net, bet) {
  history.unshift({ horse: horse, won: won, net: net, bet: bet, playerName: playerName });
  if (history.length > MAX_HISTORY) history.pop();
}

// ── COLOR UTILITY ────────────────────────────────────────────
function darken(hex) {
  var r = parseInt(hex.slice(1,3),16);
  var g = parseInt(hex.slice(3,5),16);
  var b = parseInt(hex.slice(5,7),16);
  return "rgb(" + Math.floor(r*0.65) + "," + Math.floor(g*0.65) + "," + Math.floor(b*0.65) + ")";
}
