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

const PUBLIC_ROOMS = [
  {
    id: "sample_game_1",
    name: "🎓 Sample Game",
    host: "GameMaster_AI",
    hostId: "__sample_host__",
    icon: "🎓",
    type: "open",
    tag: "fast",
    tagLabel: "🎓 PRACTICE",
    stake: 50,
    players: ["GameMaster_AI", "TrailBlazer_AI", "SilverHoof_AI", "IronJockey_AI", "DustDevil_AI"],
    playerList: [
      { id: "bot_gm",    name: "GameMaster_AI",  ready: true, joinedAt: Date.now(), isBot: true },
      { id: "bot_trail", name: "TrailBlazer_AI",  ready: true, joinedAt: Date.now(), isBot: true },
      { id: "bot_silver",name: "SilverHoof_AI",   ready: true, joinedAt: Date.now(), isBot: true },
      { id: "bot_iron",  name: "IronJockey_AI",   ready: true, joinedAt: Date.now(), isBot: true },
      { id: "bot_dust",  name: "DustDevil_AI",    ready: true, joinedAt: Date.now(), isBot: true },
    ],
    maxPlayers: 6,
    track: "Training Grounds",
    distance: "1200m",
    password: null,
    isSampleGame: true,
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
        lastActivity: Date.now()
      }).then(function() {
        room.players    = updatedPlayers;
        room.playerList = updatedPlayerList;
        room.lastActivity = Date.now();
        resolve(room);
      });
    }).catch(reject);
  });
}

/**
 * Mark a room as started in Firebase and set the betting timer.
 */
function startFirebaseRoom(code) {
  if (!db) return Promise.resolve();
  const roomRef = db.ref("rooms/" + code.toUpperCase());
  return roomRef.once("value").then(snapshot => {
    const room = snapshot.val();
    if (!room) return;
    
    // Filter out players who are no longer present to avoid "ghost" players blocking the next race
    const presence = room.presence || {};
    const updatedList = (room.playerList || [])
      .filter(p => presence[p.id] || p.isBot || p.id === room.hostId) // Keep present players, bots, and the host
      .map(p => ({
        ...p,
        betConfirmed: false,
        horseIndex: -1,
        amount: 0
      }));

    return roomRef.update({
      started: true,
      cancelled: false, // Ensure it's not cancelled
      lastActivity: Date.now(),
      bettingEndTime: Date.now() + 30000, // 30s for betting
      raceSeed: Math.random(), // Seed for synchronized race outcome
      playerList: updatedList
    });
  });
}

/**
 * Mark a room as finished (not started) to prevent new joiners from jumping into an old race state.
 */
function endFirebaseRoom(code) {
  if (!db || !code) return Promise.resolve();
  const roomRef = db.ref("rooms/" + code.toUpperCase());
  return roomRef.update({
    started: false,
    bettingEndTime: null,
    lastActivity: Date.now()
  });
}

function resetFirebaseRoomForNextRace(code) {
  return startFirebaseRoom(code); // Reuse the same logic
}

/**
 * Update a specific player's betting status in Firebase.
 */
function updatePlayerBetInFirebase(code, playerId, horseIndex, amount) {
  if (!db) return Promise.resolve();
  const roomRef = db.ref("rooms/" + code.toUpperCase());
  return roomRef.once("value").then(snapshot => {
    const room = snapshot.val();
    if (!room || !room.playerList) return;
    
    const updatedList = room.playerList.map(p => {
      if (p.id === playerId) {
        return { 
          ...p, 
          betConfirmed: true, 
          horseIndex: horseIndex, 
          amount: amount 
        };
      }
      return p;
    });

    return roomRef.update({ 
      playerList: updatedList,
      lastActivity: Date.now()
    });
  });
}

function leaveFirebaseRoom(code, playerId) {
  if (!db) return Promise.resolve();
  const roomRef = db.ref("rooms/" + code.toUpperCase());
  return roomRef.once("value").then(snapshot => {
    const room = snapshot.val();
    if (!room) return;

    if (room.hostId === playerId) {
      // Host is leaving - cancel the room for everyone
      db.ref(`rooms/${code.toUpperCase()}/presence/${playerId}`).remove();
      return roomRef.update({
        cancelled: true,
        cancelledReason: "Host left the session",
        lastActivity: Date.now()
      });
    } else {
      // Regular player leaving - just remove them
      db.ref(`rooms/${code.toUpperCase()}/presence/${playerId}`).remove();
      const updatedList = (room.playerList || []).filter(p => p.id !== playerId);
      const updatedNames = (room.players || []).filter(n => n !== room.playerList.find(p => p.id === playerId)?.name);
      return roomRef.update({
        playerList: updatedList,
        players: updatedNames,
        lastActivity: Date.now()
      });
    }
  });
}

function setupOnDisconnect(code, playerId, isHost) {
  if (!db || !code) return;
  const roomRef = db.ref("rooms/" + code.toUpperCase());
  
  // Track presence for all players
  const presenceRef = db.ref(`rooms/${code.toUpperCase()}/presence/${playerId}`);
  presenceRef.set(true);
  presenceRef.onDisconnect().remove();

  if (isHost) {
    roomRef.onDisconnect().update({
      cancelled: true,
      cancelledReason: "Host lost connection",
      lastActivity: Date.now()
    });
  }
}

/**
 * Subscribe to all rooms for the public room list.
 */
function listenToAllRooms(onUpdate) {
  if (!db) return function() {};
  var ref = db.ref("rooms");
  ref.on("value", function(snapshot) {
    var data = snapshot.val() || {};
    var roomsArray = Object.values(data);
    onUpdate(roomsArray);
    
    // Automatically trigger a cleanup check when room data changes
    cleanupExpiredRooms(roomsArray);
  });
  return function() { ref.off("value"); };
}

/**
 * Deletes rooms that haven't shown activity for 2 hours.
 */
function cleanupExpiredRooms(rooms) {
  if (!db || !rooms.length) return;
  var EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours
  var now = Date.now();
  
  rooms.forEach(function(room) {
    var activity = room.lastActivity || room.createdAt || 0;
    if (now - activity > EXPIRY_MS) {
      console.log("🧹 Inactivity cleanup: removing room " + room.code);
      db.ref("rooms/" + room.code.toUpperCase()).remove();
    }
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
function createMultiplayerRoom(roomName, stake, icon, isPrivate, password) {
  var roomCode = generateInviteCodeString(8);
  return {
    id:         "mp_" + Date.now(),
    code:       roomCode,
    name:       roomName,
    host:       playerName,
    hostId:     playerId,
    icon:       icon,
    type:       isPrivate ? "private" : "open",
    tag:        isPrivate ? "private" : "fast",
    tagLabel:   isPrivate ? "🔒 PRIVATE" : "⚡ FAST PLAY",
    stake:      stake,
    players:    [playerName],
    playerList: [
      { id: playerId, name: playerName, ready: false, joinedAt: Date.now() }
    ],
    maxPlayers: 8,
    track:      "Thunder Downs",
    distance:   "1200m",
    password:   isPrivate ? password : null,
    createdAt:  Date.now(),
    lastActivity: Date.now(),
    started:    false,
  };
}

// ── PHYSICS ENGINE (Seeded for Multiplayer Sync) ────────────
var _rngSeed = 1;
function seededRandom() {
  var x = Math.sin(_rngSeed++) * 10000;
  return x - Math.floor(x);
}

function syncSeed(seed) {
  _rngSeed = seed || 1;
}

function initVelocities() {
  return horses.map(function(h) {
    var base = (h.speed * 0.6 + h.stamina * 0.4) / 100;
    return base * 0.55 + seededRandom() * 0.1;
  });
}

function tickHorse(i, tick) {
  var wobble  = (seededRandom() - 0.5) * 0.22;
  var burst   = seededRandom() < 0.035 ? 0.25 : 0;
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
