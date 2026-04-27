// ═══════════════════════════════════════════════════════════
//  SCRIPT.JS — UI Logic, Navigation, Screens
//  MULTIPLAYER ENABLED — Firebase Integration & Player Management
// ═══════════════════════════════════════════════════════════

// ── MULTIPLAYER INITIALIZATION ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initDottedSurface();
  // Show player name modal on first load
  setTimeout(() => {
    document.getElementById('modal-player-name').classList.add('open');
  }, 500);
});

// ── PLAYER NAME MODAL HANDLERS ──────────────────────────────
function submitPlayerName() {
  const nameInput = document.getElementById('playerNameInput');
  const playerNameError = document.getElementById('playerNameError');
  const name = nameInput.value.trim();
  
  const validation = validatePlayerName(name);
  
  if (!validation.valid) {
    playerNameError.textContent = validation.reason;
    nameInput.classList.add('shake');
    setTimeout(() => nameInput.classList.remove('shake'), 500);
    return;
  }
  
  setPlayerName(name);
  playerNameError.textContent = '';
  
  // Update UI with player name
  document.getElementById('playerBadge').style.display = 'flex';
  document.getElementById('playerNameBadge').textContent = name;
  const initials = name.slice(0, 2).toUpperCase();
  document.getElementById('playerAvatar').textContent = initials;
  
  // Close modal
  closePlayerNameModal();
  
  // Show home screen
  showScreen('screen-home');
}

function closePlayerNameModal() {
  document.getElementById('modal-player-name').classList.remove('open');
}

// Allow changing player name
function changePlayerName() {
  document.getElementById('playerNameInput').value = '';
  document.getElementById('playerNameError').textContent = '';
  document.getElementById('modal-player-name').classList.add('open');
  document.getElementById('playerNameInput').focus();
}

// ── MULTIPLAYER ROOM TRACKING ──────────────────────────────
let multiplayerRooms = [];  // Active multiplayer rooms
let createdRoomCode = null;
let createdRoomData = null;

// Store created room locally (in real app, would use Firebase)
function storeMultiplayerRoom(roomData) {
  multiplayerRooms.push(roomData);
  // In production, push to Firebase: db.ref('rooms/' + roomCode).set(roomData)
  return roomData.code;
}

// Find room by code
function findRoomByCode(code) {
  return multiplayerRooms.find(r => r.code.toUpperCase() === code.toUpperCase());
}

// ── NAVIGATION ───────────────────────────────────────────────

function showScreen(id) {
  // Hide all
  document.querySelectorAll(".screen").forEach(s => {
    s.style.display = "none";
    s.classList.remove("active");
  });
  const target = document.getElementById(id);
  if (!target) return;
  target.style.display = "flex";
  target.classList.add("active");

  // Handle screen-specific initializations
  if (id === "screen-create") {
    generateInviteCode();
    updateInviteCodeDisplay();
  }
  
  if (id === "screen-rooms") {
    renderRooms();
  }
  
  // Push to stack (avoid duplicates at top)
  if (screenStack[screenStack.length - 1] !== id) {
    screenStack.push(id);
  }
}

// Screens that require leave confirmation before navigating away
const CONFIRM_LEAVE_SCREENS = ["screen-lobby", "screen-game"];

function goBack() {
  if (screenStack.length <= 1) return;

  // Check if current screen needs a leave confirmation
  const currentScreen = screenStack[screenStack.length - 1];
  if (CONFIRM_LEAVE_SCREENS.includes(currentScreen)) {
    openLeaveModal();
    return;
  }

  // Otherwise navigate back immediately
  performGoBack();
}

function performGoBack() {
  if (screenStack.length <= 1) return;
  screenStack.pop(); // remove current
  const prev = screenStack[screenStack.length - 1];
  // Show previous without re-pushing
  document.querySelectorAll(".screen").forEach(s => {
    s.style.display = "none";
    s.classList.remove("active");
  });
  const target = document.getElementById(prev);
  if (target) {
    target.style.display = "flex";
    target.classList.add("active");
  }
}

// ── LEAVE CONFIRMATION MODAL ─────────────────────────────────

function openLeaveModal() {
  document.getElementById("modal-leave").classList.add("open");
}

function closeLeaveModal() {
  document.getElementById("modal-leave").classList.remove("open");
}

function handleLeaveBackdrop(e) {
  if (e.target === document.getElementById("modal-leave")) closeLeaveModal();
}

function confirmLeave() {
  closeLeaveModal();
  performGoBack();
}

// ── ROOMS LIST ───────────────────────────────────────────────

function renderRooms() {
  const list = document.getElementById("roomsList");
  if (!list) return;
  list.innerHTML = "";

  // Combine public rooms + multiplayer rooms
  const allRooms = [...PUBLIC_ROOMS, ...multiplayerRooms];

  allRooms.forEach(room => {
    const isPrivate = room.type === "private";
    const isRanked  = room.tag === "ranked";
    const joinClass = isPrivate ? "locked" : isRanked ? "ranked-btn" : "open";

    // Left accent class
    let cardAccent = "fast-play";
    if (isRanked)  cardAccent = "ranked";
    if (isPrivate) cardAccent = "private";

    const card = document.createElement("div");
    card.className = `room-card ${cardAccent}`;
    card.onclick = () => handleJoinRoom(room);

    const stakeIcon = `<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="0.5" y="0.5" width="10" height="10" rx="2" stroke="#6b7399" stroke-width="1"/><path d="M3 5.5h5M5.5 3v5" stroke="#6b7399" stroke-width="1" stroke-linecap="round"/></svg>`;

    const lockIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
    const gameIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="5" width="16" height="10" rx="3" stroke="currentColor" stroke-width="1.4"/><path d="M7 10h2M8 9v2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="13" cy="10" r="1" fill="currentColor"/></svg>`;

    const playerCount = `${room.players.length} / ${room.maxPlayers}`;
    
    card.innerHTML = `
      <div class="room-icon-wrap" style="color:${isPrivate ? 'var(--text-muted)' : isRanked ? 'var(--gold)' : 'var(--gold-light)'}">
        ${isPrivate ? lockIcon : gameIcon}
      </div>
      <div class="room-info">
        <div class="room-name">${room.name}</div>
        <div class="room-meta">
          <span class="room-stake">${stakeIcon} STAKE: ${room.stake}</span>
          <span class="room-tag ${isPrivate ? 'private' : isRanked ? 'ranked' : 'fast'}">${room.tagLabel}</span>
        </div>
        <div class="room-players-count">👥 ${playerCount}</div>
      </div>
      <button class="room-join-btn ${joinClass}" onclick="event.stopPropagation();handleJoinRoom(${JSON.stringify(room).replace(/"/g,'&quot;')})">
        ${isPrivate || room.type === 'multiplayer' ? 'ENTER' : 'JOIN'}
      </button>`;

    list.appendChild(card);
  });

  // Show "No rooms" message if both lists are empty
  if (allRooms.length === 0) {
    list.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No active arenas. Create one to start!</div>';
  }
}

// ── HANDLE JOIN ──────────────────────────────────────────────

let pendingRoom = null;

function handleJoinRoom(room) {
  if (typeof room === "string") room = JSON.parse(room);
  pendingRoom = room;

  // If multiplayer room, ask for player name confirmation
  if (room.code) {
    loadRoom(pendingRoom);
  } else {
    // Public room
    pendingRoom = PUBLIC_ROOMS.find(r => r.id === room.id) || room;
    loadRoom(pendingRoom);
  }
}

// ── LOADING SCREEN ───────────────────────────────────────────

function loadRoom(room) {
  activeRoom = room;
  // Show loading screen without pushing to nav stack (it's transitional)
  document.querySelectorAll(".screen").forEach(s => {
    s.style.display = "none";
    s.classList.remove("active");
  });
  const loadingScreen = document.getElementById("screen-loading");
  loadingScreen.style.display = "flex";
  loadingScreen.classList.add("active");
  document.getElementById("loadingLabel").textContent  = "ENTERING THE ARENA…";
  document.getElementById("loadingRoomName").textContent = room.name;
  document.getElementById("loadingBarFill").style.width = "0%";

  // Animate progress bar
  let progress = 0;
  const messages = [
    "SADDLING UP THE HORSES…",
    "CHECKING RACE CONDITIONS…",
    "SETTING THE TRACK…",
    "COUNTING JOCKEYS…",
    "GATES ARE OPENING…",
  ];
  let msgIdx = 0;

  const interval = setInterval(() => {
    progress += Math.random() * 18 + 5;
    if (progress > 100) progress = 100;
    document.getElementById("loadingBarFill").style.width = progress + "%";

    if (progress > (msgIdx + 1) * 20 && msgIdx < messages.length - 1) {
      msgIdx++;
      document.getElementById("loadingLabel").textContent = messages[msgIdx];
    }

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => renderLobby(room), 400);
    }
  }, 180);
}

// ── LOBBY ────────────────────────────────────────────────────

function renderLobby(room) {
  // Update room with current player if joining
  if (room.code && !room.playerList.find(p => p.id === playerId)) {
    room.playerList.push({
      id: playerId,
      name: playerName,
      ready: false,
      joinedAt: Date.now()
    });
    room.players.push(playerName);
  }

  // Banner
  const banner = document.getElementById("lobbyBanner");
  const isPrivate = room.type === "private";
  const isRanked  = room.tag === "ranked";
  const isMultiplayer = !!room.code;
  
  const lockIcon = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="4" y="10" width="14" height="9" rx="2" stroke="#6b7399" stroke-width="1.5"/><path d="M7 10V8a4 4 0 018 0v2" stroke="#6b7399" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  const gameIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="12" rx="3.5" stroke="${isRanked ? '#c9a227' : '#e8be45'}" stroke-width="1.5"/><path d="M8 12h3M9.5 10.5v3" stroke="${isRanked ? '#c9a227' : '#e8be45'}" stroke-width="1.5" stroke-linecap="round"/><circle cx="16" cy="12" r="1.5" fill="${isRanked ? '#c9a227' : '#e8be45'}"/></svg>`;

  const tagBadge = `<span class="room-tag ${isPrivate ? 'private' : isRanked ? 'ranked' : 'fast'}">${room.tagLabel}</span>`;

  const codeDisplay = isMultiplayer ? `<div class="lobby-room-code"><strong>CODE:</strong> ${room.code}</div>` : '';

  banner.innerHTML = `
    <div class="lobby-room-icon-wrap">${isPrivate ? lockIcon : gameIcon}</div>
    <div style="flex:1;min-width:0">
      <div class="lobby-room-title">${room.name}</div>
      <div class="lobby-room-host">Hosted by <strong style="color:var(--text-primary)">${room.host}</strong></div>
      <div class="lobby-room-badges" style="margin-top:5px">${tagBadge}</div>
      ${codeDisplay}
    </div>
    <div class="lobby-actions">
      <button class="btn-lobby-invite" onclick="openInviteModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>
        INVITE FRIENDS
      </button>
    </div>`;

  // Details grid
  const details = document.getElementById("lobbyDetails");
  const pwDisplay = `<span style="color:var(--gold-light)">Open Access</span>`;

  details.innerHTML = `
    <div class="detail-cell">
      <div class="detail-label">Track</div>
      <div class="detail-value">${room.track}</div>
    </div>
    <div class="detail-cell">
      <div class="detail-label">Distance</div>
      <div class="detail-value teal">${room.distance}</div>
    </div>
    <div class="detail-cell">
      <div class="detail-label">Stake</div>
      <div class="detail-value gold">${room.stake} 🪙</div>
    </div>
    <div class="detail-cell">
      <div class="detail-label">Capacity</div>
      <div class="detail-value">${room.players.length} / ${room.maxPlayers}</div>
    </div>
    <div class="detail-cell" style="grid-column:1/-1">
      <div class="detail-label">Password</div>
      <div class="detail-value password-cell" style="display:flex;align-items:center;gap:8px;font-size:14px">${pwDisplay}</div>
    </div>`;

  // Players - use playerList if available
  const playersDiv = document.getElementById("lobbyPlayers");
  playersDiv.innerHTML = "";
  document.getElementById("lobbyPlayerCount").textContent = room.players.length + "/" + room.maxPlayers;

  const playerList = room.playerList || room.players.map((name, i) => ({
    name,
    id: "player_" + i,
    ready: i % 2 === 0,
    joinedAt: Date.now()
  }));

  playerList.forEach((player, i) => {
    const isHost  = player.name === room.host;
    const isCurrentPlayer = player.id === playerId;
    const isReady = player.ready || (i % 2 === 0);
    const initials = (player.name || 'PL').slice(0, 2).toUpperCase();
    const row = document.createElement("div");
    row.className = "player-row";
    row.style.animationDelay = (i * 80) + "ms";
    row.innerHTML = `
      <div class="player-avatar ${isHost ? 'host-avatar' : ''} ${isCurrentPlayer ? 'current-player' : ''}">${initials}</div>
      <div class="player-name">${player.name}${isCurrentPlayer ? ' (You)' : ''}</div>
      ${isHost  ? '<span class="player-host-badge">HOST</span>' : ''}
      ${isReady ? '<span class="player-ready-badge">READY</span>' : ''}`;
    playersDiv.appendChild(row);
  });

  // Stake note
  document.getElementById("lobbyStakeNote").innerHTML =
    `Entry stake: <span>${room.stake} credits</span> will be deducted on race start`;

  showScreen("screen-lobby");
}

// ── START RACE FROM LOBBY ────────────────────────────────────

function startRaceFromLobby() {
  if (!activeRoom) return;
  // Deduct stake
  if (balance < activeRoom.stake) {
    alert("Insufficient credits to enter this arena!");
    return;
  }
  // Only host can start
  if (playerName !== activeRoom.host) {
    alert("Only the host can start the race!");
    return;
  }
  // Transition to game
  balance -= activeRoom.stake;
  // Jump to game (existing race page)
  showRaceGame();
}

// ── CREATE ROOM HANDLERS ─────────────────────────────────────

let selectedStake = 50;
let selectedIcon = "🎮";
let generatedInviteCode = null;

function toggleDropdown(id) {
  const dropdown = document.getElementById(id);
  dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
}

function selectStake(amount, event) {
  event.stopPropagation();
  selectedStake = amount;
  document.getElementById("selected-stake").textContent = amount + " CREDITS 🪙";
  document.getElementById("stake-options").style.display = "none";
}

function selectIcon(icon, event) {
  event.stopPropagation();
  selectedIcon = icon;
  document.getElementById("selected-icon").textContent = icon;
  document.getElementById("icon-options").style.display = "none";
}

function generateInviteCode() {
  if (!generatedInviteCode) {
    generatedInviteCode = generateInviteCode(8);
  }
  updateInviteCodeDisplay();
}

function updateInviteCodeDisplay() {
  if (generatedInviteCode) {
    document.getElementById("invite-code-val").value = generatedInviteCode;
    document.getElementById("inviteCodeRow").style.opacity = "1";
    document.querySelector(".btn-icon-copy").disabled = false;
    document.getElementById("shareInviteBtn").disabled = false;
  }
}

function handleCreateRoom() {
  const roomName = document.getElementById("create-room-name").value.trim();
  
  if (!roomName) {
    alert("Please enter a room name!");
    return;
  }

  if (!playerName) {
    alert("Please set your player name first!");
    return;
  }

  // Create multiplayer room
  const newRoom = createMultiplayerRoom(roomName, selectedStake, selectedIcon);
  newRoom.code = generatedInviteCode || generateInviteCode(8);
  
  // Store the room
  storeMultiplayerRoom(newRoom);
  createdRoomCode = newRoom.code;
  createdRoomData = newRoom;

  // Reset form
  document.getElementById("create-room-name").value = "";
  selectedStake = 50;
  selectedIcon = "🎮";
  generatedInviteCode = null;

  // Load the room
  loadRoom(newRoom);
}

function copyInviteCode() {
  const code = document.getElementById("invite-code-val").value;
  navigator.clipboard.writeText(code).then(() => {
    const btn = event.target.closest('button');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    setTimeout(() => {
      btn.innerHTML = originalHTML;
    }, 2000);
  });
}

function shareInviteLink() {
  const code = document.getElementById("invite-code-val").value;
  const link = `${window.location.origin}?invite=${code}`;
  
  if (navigator.share) {
    navigator.share({
      title: 'Join Horse Racing Elite!',
      text: `Join my arena with code: ${code}`,
      url: link
    });
  } else {
    navigator.clipboard.writeText(link).then(() => {
      alert("Invite link copied to clipboard!");
    });
  }
}

// ── JOIN BY CODE HANDLERS ────────────────────────────────────

function openJoinCodeModal() {
  document.getElementById("modal-join-code").classList.add("open");
  document.getElementById("joinCodeInput").focus();
  document.getElementById("joinCodeError").textContent = "";
}

function closeJoinCodeModal() {
  document.getElementById("modal-join-code").classList.remove("open");
}

function handleJoinCodeBackdrop(e) {
  if (e.target === document.getElementById("modal-join-code")) closeJoinCodeModal();
}

function submitJoinCode() {
  const code = document.getElementById("joinCodeInput").value.trim().toUpperCase();
  
  if (!code) {
    document.getElementById("joinCodeError").textContent = "Please enter an invite code.";
    return;
  }

  // Search for the room in multiplayer rooms
  const room = findRoomByCode(code);

  if (room) {
    if (room.players.length >= room.maxPlayers) {
      document.getElementById("joinCodeError").textContent = "This arena is full!";
      return;
    }
    closeJoinCodeModal();
    loadRoom(room);
  } else {
    document.getElementById("joinCodeError").textContent = "Invalid code. Arena not found.";
    document.getElementById("joinCodeInput").classList.add("shake");
    setTimeout(() => document.getElementById("joinCodeInput").classList.remove("shake"), 500);
  }
}

// ── INVITE MODAL ─────────────────────────────────────────────

function openInviteModal() {
  if (activeRoom && activeRoom.code) {
    document.getElementById("lobby-invite-code-val").value = activeRoom.code;
  }
  document.getElementById("modal-invite").classList.add("open");
}

function closeInviteModal() {
  document.getElementById("modal-invite").classList.remove("open");
}

function handleInviteBackdrop(e) {
  if (e.target === document.getElementById("modal-invite")) closeInviteModal();
}

function copyLobbyInviteCode() {
  const code = document.getElementById("lobby-invite-code-val").value;
  navigator.clipboard.writeText(code).then(() => {
    const btn = event.target.closest('button');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    setTimeout(() => {
      btn.innerHTML = originalHTML;
    }, 2000);
  });
}

function shareLobbyInviteLink() {
  const code = document.getElementById("lobby-invite-code-val").value;
  const link = `${window.location.origin}?invite=${code}`;
  
  if (navigator.share) {
    navigator.share({
      title: 'Join Horse Racing Elite!',
      text: `Join my arena with code: ${code}`,
      url: link
    });
  } else {
    navigator.clipboard.writeText(link).then(() => {
      alert("Invite link copied to clipboard!");
    });
  }
}

// ── RACE GAME (existing engine) ──────────────────────────────

function showRaceGame() {
  let gameScreen = document.getElementById("screen-game");
  if (!gameScreen) {
    gameScreen = document.createElement("div");
    gameScreen.id = "screen-game";
    gameScreen.className = "screen";
    gameScreen.style.background = "var(--bg)";
    gameScreen.innerHTML = buildRaceScreenHTML();
    document.body.appendChild(gameScreen);
  }
  showScreen("screen-game");
  initRaceEngine();
}

// ── RACE SCREEN HTML ─────────────────────────────────────────

function buildRaceScreenHTML() {
  return `
    <div class="race-top-bar">
      <button class="btn-back" onclick="goBack()">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 4L6 9L11 14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Back
      </button>
      <div class="race-credits-badge">
        <span class="credits-num" id="raceCredits">1,250</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="1.5" width="13" height="13" rx="2.5" stroke="#c9a227" stroke-width="1.4"/><path d="M5 8h6M8 5v6" stroke="#c9a227" stroke-width="1.4" stroke-linecap="round"/></svg>
      </div>
    </div>

    <div class="race-main">
      <div class="race-info">
        <div class="info-row">
          <div class="info-label">TRACK</div>
          <div class="info-value" id="raceTrack">Thunder Downs</div>
        </div>
        <div class="info-row">
          <div class="info-label">DISTANCE</div>
          <div class="info-value" id="raceDistance">1200m</div>
        </div>
        <div class="info-row">
          <div class="info-label">STAKE</div>
          <div class="info-value" id="raceStake">50 🪙</div>
        </div>
      </div>

      <canvas id="raceCanvas" class="race-canvas"></canvas>

      <div class="race-controls">
        <div class="horse-selector" id="horseSelector"></div>
        <div class="bet-controls">
          <input type="number" id="betAmount" class="bet-input" placeholder="Bet amount" value="50">
          <button class="btn-place-bet" onclick="handlePlaceBet()">PLACE BET</button>
        </div>
      </div>
    </div>

    <div class="race-results" id="raceResults" style="display:none">
      <div class="results-title" id="resultsTitle">RACE RESULTS</div>
      <div class="results-content" id="resultsContent"></div>
      <button class="btn-primary" onclick="resetRace()">RACE AGAIN</button>
    </div>
  `;
}

// ── RACE ENGINE ──────────────────────────────────────────────

function initRaceEngine() {
  updateRaceInfo();
  renderHorseSelector();
  updateCreditsDisplay();
}

function updateRaceInfo() {
  if (activeRoom) {
    document.getElementById("raceTrack").textContent = activeRoom.track;
    document.getElementById("raceDistance").textContent = activeRoom.distance;
    document.getElementById("raceStake").textContent = activeRoom.stake + " 🪙";
  }
}

function updateCreditsDisplay() {
  document.getElementById("raceCredits").textContent = balance.toLocaleString();
}

function renderHorseSelector() {
  const selector = document.getElementById("horseSelector");
  if (!selector) return;
  selector.innerHTML = "";

  horses.forEach((horse, i) => {
    const card = document.createElement("div");
    card.className = `horse-card ${selectedHorse === i ? 'selected' : ''}`;
    card.onclick = () => selectHorse(i);
    card.innerHTML = `
      <div class="horse-number">#${i + 1}</div>
      <div class="horse-name">${horse.name}</div>
      <div class="horse-odds">${horse.odds}:1</div>
      <div class="horse-form">${horse.form.join(' ')}</div>`;
    selector.appendChild(card);
  });
}

function selectHorse(i) {
  selectedHorse = i;
  renderHorseSelector();
}

function handlePlaceBet() {
  const betAmount = parseInt(document.getElementById("betAmount").value);
  const validation = validateBet(selectedHorse, betAmount);

  if (!validation.valid) {
    alert(validation.reason);
    return;
  }

  balance -= betAmount;
  updateCreditsDisplay();
  runRace(selectedHorse, betAmount);
}

function runRace(winningHorseIndex, betAmount) {
  racing = true;
  positions = horses.map(() => TRACK_START);
  velocities = initVelocities();
  raceCount = 0;

  const canvas = document.getElementById("raceCanvas");
  const ctx = canvas.getContext("2d");
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const renderFrame = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1b1f2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const trackY = canvas.height / 2;
    const trackHeight = 40;

    // Draw track
    ctx.strokeStyle = "#6b7399";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.05, trackY - trackHeight / 2);
    ctx.lineTo(canvas.width * 0.95, trackY - trackHeight / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.05, trackY + trackHeight / 2);
    ctx.lineTo(canvas.width * 0.95, trackY + trackHeight / 2);
    ctx.stroke();

    // Draw horses
    horses.forEach((horse, i) => {
      const x = canvas.width * 0.05 + ((positions[i] - TRACK_START) / (TRACK_END - TRACK_START)) * (canvas.width * 0.9);
      const y = trackY - (horses.length / 2 - i - 0.5) * (trackHeight / horses.length);

      ctx.fillStyle = horse.color;
      ctx.fillRect(x - 15, y - 12, 30, 24);
      ctx.fillStyle = "#fff";
      ctx.font = "20px Arial";
      ctx.fillText("🏇", x - 10, y + 8);
    });

    // Draw finish line
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.95, trackY - trackHeight / 2);
    ctx.lineTo(canvas.width * 0.95, trackY + trackHeight / 2);
    ctx.stroke();

    // Update positions
    let finished = false;
    for (let i = 0; i < horses.length; i++) {
      const done = tickHorse(i, raceCount);
      if (done && i === winningHorseIndex) {
        finished = true;
      }
    }

    raceCount++;

    if (finished || raceCount > 200) {
      racing = false;
      showRaceResults(winningHorseIndex, betAmount);
    } else {
      requestAnimationFrame(renderFrame);
    }
  };

  renderFrame();
}

function showRaceResults(horseIndex, betAmount) {
  const horse = horses[horseIndex];
  const payout = calcPayout(horseIndex, betAmount);
  const won = positions[horseIndex] >= TRACK_END;

  recordResult(horse.name, won, payout.profit, betAmount);

  if (won) {
    balance += payout.gross;
    updateCreditsDisplay();
    document.getElementById("resultsTitle").textContent = "🎉 YOU WON! 🎉";
    document.getElementById("resultsContent").innerHTML = `
      <p><strong>${horse.name}</strong> crossed the finish line!</p>
      <p>Bet: ${betAmount} 🪙</p>
      <p>Winnings: ${payout.gross} 🪙</p>
      <p>Profit: +${payout.profit} 🪙</p>
    `;
  } else {
    document.getElementById("resultsTitle").textContent = "Better Luck Next Time!";
    document.getElementById("resultsContent").innerHTML = `
      <p><strong>${horse.name}</strong> didn't make it.</p>
      <p>Bet Lost: -${betAmount} 🪙</p>
      <p>Balance: ${balance} 🪙</p>
    `;
  }

  document.getElementById("raceResults").style.display = "block";
}

function resetRace() {
  document.getElementById("raceResults").style.display = "none";
  selectedHorse = -1;
  renderHorseSelector();
  document.getElementById("betAmount").value = "50";
}

// ── DOTTED SURFACE 3D BACKGROUND ─────────────────────────────

function initDottedSurface() {
  const container = document.getElementById('dotted-surface-container');
  if (!container || !window.THREE) return;

  const SEPARATION = 150;
  const AMOUNTX = 40;
  const AMOUNTY = 60;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0e1016, 1000, 8000);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.set(0, 450, 1000);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const positions = [];
  const colors = [];
  const geometry = new THREE.BufferGeometry();

  for (let ix = 0; ix < AMOUNTX; ix++) {
    for (let iy = 0; iy < AMOUNTY; iy++) {
      const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
      const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;
      positions.push(x, 0, z);
      colors.push(201/255, 162/255, 39/255);
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));

  const material = new THREE.PointsMaterial({ size: 5, vertexColors: true, opacity: 0.3, sizeAttenuation: true });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const animate = () => {
    requestAnimationFrame(animate);
    points.rotation.x += 0.0002;
    points.rotation.y += 0.0005;
    renderer.render(scene, camera);
  };
  animate();
}

// ── CHECK FOR INVITE CODE IN URL ─────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const inviteCode = params.get('invite');
  
  if (inviteCode) {
    setTimeout(() => {
      // Once player name is set, automatically join via code
      if (playerName) {
        const foundRoom = findRoomByCode(inviteCode);
        if (foundRoom) {
          loadRoom(foundRoom);
        }
      }
    }, 1000);
  }
});
