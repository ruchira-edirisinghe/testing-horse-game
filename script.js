// ═══════════════════════════════════════════════════════════
//  SCRIPT.JS — UI Logic, Navigation, Screens
//  Depends on: backend.js (must load first)
// ═══════════════════════════════════════════════════════════

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

  PUBLIC_ROOMS.forEach(room => {
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
      </div>
      <button class="room-join-btn ${joinClass}" onclick="event.stopPropagation();handleJoinRoom(${JSON.stringify(room).replace(/"/g,'&quot;')})">
        ${isPrivate ? 'ENTER' : 'JOIN'}
      </button>`;

    list.appendChild(card);
  });
}

// ── HANDLE JOIN ──────────────────────────────────────────────

let pendingRoom = null;

function handleJoinRoom(room) {
  if (typeof room === "string") room = JSON.parse(room);
  pendingRoom = PUBLIC_ROOMS.find(r => r.id === room.id) || room;

  if (pendingRoom.password) {
    openPasswordModal(pendingRoom);
  } else {
    loadRoom(pendingRoom);
  }
}

// ── PASSWORD MODAL ───────────────────────────────────────────

function openPasswordModal(room) {
  pendingRoom = room;
  document.getElementById("passwordInput").value = "";
  document.getElementById("modalError").textContent = "";
  document.getElementById("modal-password").classList.add("open");
  setTimeout(() => document.getElementById("passwordInput").focus(), 300);
}

function closePasswordModal() {
  document.getElementById("modal-password").classList.remove("open");
}

function handleModalBackdrop(e) {
  if (e.target === document.getElementById("modal-password")) closePasswordModal();
}

function submitPassword() {
  const input = document.getElementById("passwordInput").value.trim();
  if (!input) {
    document.getElementById("modalError").textContent = "Please enter the arena password.";
    return;
  }
  if (input !== pendingRoom.password) {
    document.getElementById("modalError").textContent = "Incorrect password. Access denied.";
    document.getElementById("passwordInput").classList.add("shake");
    setTimeout(() => document.getElementById("passwordInput").classList.remove("shake"), 500);
    return;
  }
  closePasswordModal();
  loadRoom(pendingRoom);
}

function clearPasswordError() {
  document.getElementById("modalError").textContent = "";
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
  // Banner
  const banner = document.getElementById("lobbyBanner");
  const isPrivate = room.type === "private";
  const isRanked  = room.tag === "ranked";
  const lockIcon = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="4" y="10" width="14" height="9" rx="2" stroke="#6b7399" stroke-width="1.5"/><path d="M7 10V8a4 4 0 018 0v2" stroke="#6b7399" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  const gameIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="12" rx="3.5" stroke="${isRanked ? '#c9a227' : '#e8be45'}" stroke-width="1.5"/><path d="M8 12h3M9.5 10.5v3" stroke="${isRanked ? '#c9a227' : '#e8be45'}" stroke-width="1.5" stroke-linecap="round"/><circle cx="16" cy="12" r="1.5" fill="${isRanked ? '#c9a227' : '#e8be45'}"/></svg>`;

  const tagBadge = `<span class="room-tag ${isPrivate ? 'private' : isRanked ? 'ranked' : 'fast'}">${room.tagLabel}</span>`;

  banner.innerHTML = `
    <div class="lobby-room-icon-wrap">${isPrivate ? lockIcon : gameIcon}</div>
    <div style="flex:1;min-width:0">
      <div class="lobby-room-title">${room.name}</div>
      <div class="lobby-room-host">Hosted by <strong style="color:var(--text-primary)">${room.host}</strong></div>
      <div class="lobby-room-badges" style="margin-top:5px">${tagBadge}</div>
    </div>
    <div class="lobby-actions">
      <button class="btn-lobby-invite" onclick="openInviteModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>
        INVITE FRIENDS
      </button>
    </div>`;

  // Details grid
  const details = document.getElementById("lobbyDetails");
  const pwDisplay = room.password
    ? `<span id="pwText">••••••••</span>
       <button class="pw-copy-btn" onclick="togglePwReveal('${room.password}')" title="Reveal">
         <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2.5" stroke="currentColor" stroke-width="1.2"/><path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" stroke-width="1.2"/></svg>
       </button>
       <span class="pw-copied" id="pwCopied" style="display:none">Revealed!</span>`
    : `<span style="color:var(--gold-light)">Open Access</span>`;

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

  // Players
  const playersDiv = document.getElementById("lobbyPlayers");
  playersDiv.innerHTML = "";
  document.getElementById("lobbyPlayerCount").textContent = room.players.length + "/" + room.maxPlayers;

  room.players.forEach((name, i) => {
    const isHost  = name === room.host;
    const isReady = i % 2 === 0; // simulate some ready
    const initials = name.slice(0, 2).toUpperCase();
    const row = document.createElement("div");
    row.className = "player-row";
    row.style.animationDelay = (i * 80) + "ms";
    row.innerHTML = `
      <div class="player-avatar ${isHost ? 'host-avatar' : ''}">${initials}</div>
      <div class="player-name">${name}</div>
      ${isHost  ? '<span class="player-host-badge">HOST</span>' : ''}
      ${isReady ? '<span class="player-ready-badge">READY</span>' : ''}`;
    playersDiv.appendChild(row);
  });

  // Stake note
  document.getElementById("lobbyStakeNote").innerHTML =
    `Entry stake: <span>${room.stake} credits</span> will be deducted on race start`;

  showScreen("screen-lobby");
}

// Reveal/hide password
function togglePwReveal(pw) {
  const el  = document.getElementById("pwText");
  const msg = document.getElementById("pwCopied");
  if (el.textContent === "••••••••") {
    el.textContent = pw;
    msg.style.display = "inline";
    setTimeout(() => { el.textContent = "••••••••"; msg.style.display = "none"; }, 3000);
  } else {
    el.textContent = "••••••••";
    msg.style.display = "none";
  }
}

// ── START RACE FROM LOBBY ────────────────────────────────────

function startRaceFromLobby() {
  if (!activeRoom) return;
  // Deduct stake
  if (balance < activeRoom.stake) {
    alert("Insufficient credits to enter this arena!");
    return;
  }
  // Transition to game — for now show the race screen from old game
  // (This plugs into the existing race engine in the game section)
  balance -= activeRoom.stake;
  // Jump to game (existing race page) — kept in same SPA
  showRaceGame();
}

// ── RACE GAME (existing engine) ──────────────────────────────
// This section re-uses the original casino game on a dynamic screen.
// The race screen is injected into the DOM at runtime.

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
  gameRoomBets = []; // reset
  initRaceGame();
  gameGenerateAIBets();
  gameRenderLiveBets();
}

function gameGenerateAIBets() {
  if (!activeRoom || !activeRoom.players) return;
  const otherPlayers = activeRoom.players.filter(p => p !== "You"); // assume 'You' is not in the list or handle
  // For this sim, we'll use the players list from the room, minus the host if the host is 'You'
  // Actually, PUBLIC_ROOMS players usually doesn't include 'You' until we 'join'.
  
  activeRoom.players.forEach(p => {
    // 80% chance for each AI player to place a bet
    if (Math.random() < 0.8) {
      const hIdx = Math.floor(Math.random() * horses.length);
      const amt = (Math.floor(Math.random() * 5) + 1) * 20; // 20, 40, 60, 80, 100
      // Simulate "thinking" time by setting a readyAt second (0-20s in)
      const readyAt = Math.floor(Math.random() * 20) + 1;
      gameRoomBets.push({ player: p, horseIndex: hIdx, amount: amt, readyAt });
    }
  });
}

function buildRaceScreenHTML() {
  return `
  <div class="sub-top-bar">
    <button class="btn-back" onclick="goBack()">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 4L6 9L11 14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Back
    </button>
    <img src="assets/logo-horizontal.png" alt="Horse Racing Elite" class="logo-horizontal"
         onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
    <div class="hlogo-fallback" style="display:none">🏇 ELITE</div>
    <div class="credits-badge">
      <span class="credits-num" id="gameBalanceDisplay">0</span>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="1.5" width="13" height="13" rx="2.5" stroke="#c9a227" stroke-width="1.4"/><path d="M5 8h6M8 5v6" stroke="#c9a227" stroke-width="1.4" stroke-linecap="round"/></svg>
    </div>
  </div>

  <div class="race-info-strip">
    <div class="race-info-cell" id="gameHeaderRaceCell">
      <span class="ric-label">RACE</span>
      <span class="ric-val" id="gameRaceNum">Race #1</span>
    </div>
    <div class="race-info-cell" id="gameHeaderTimerCell" style="display:none;background:rgba(201,162,39,0.1);border-left:1px solid rgba(201,162,39,0.3);border-right:1px solid rgba(201,162,39,0.3)">
      <span class="ric-label" id="gameHeaderTimerLabel" style="color:var(--gold)">BETTING ENDS</span>
      <span class="ric-val" id="gameHeaderTimerVal" style="color:var(--gold-light);font-size:18px">30s</span>
    </div>
    <div class="race-info-cell" id="gameRoomNameCell">
      <span class="ric-label">ROOM</span>
      <span class="ric-val" id="gameRoomName" style="color:var(--gold)">—</span>
    </div>
    <div class="race-info-cell">
      <span class="ric-label">ENTRY STAKE</span>
      <span class="ric-val" id="gameStake" style="color:var(--gold-light)">—</span>
    </div>
  </div>

  <div class="game-scroll-area">
    <div class="game-main-layout">

      <!-- LEFT COLUMN: Track + Horse Cards -->
      <div class="game-col-left">
        <div class="game-track-area">
          <div class="game-track-labels"><span>🏁 START</span><span>FINISH 🏁</span></div>
          <div class="game-track">
            <div class="game-start-line"></div>
            <div class="game-finish-line"></div>
            <div class="game-finish-flag">🏁</div>
            <div class="game-track-inner" id="gameTrackInner"></div>
          </div>
          
          <!-- Premium Instruction Overlay -->
          <div class="game-instruction-overlay" id="gameInstructionOverlay">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.2"/><path d="M10 6v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="14" r="1" fill="currentColor"/></svg>
            <span id="gameInstructionText">Select a horse below. Wait for others to bid!</span>
          </div>
        </div>

        <div class="game-section">
          <div class="game-section-header">
            <span class="game-section-title">🐎  PICK YOUR HORSE</span>
            <span class="game-section-hint" id="gameRaceStatus">Tap a card to select</span>
          </div>
          <div class="game-cards-grid" id="gameBettingPanel"></div>
        </div>

        <div class="game-payout-preview" id="gamePayoutPreview" style="display:none">
          <div class="gpp-row">
            <span class="gpp-item"><span class="gpp-label">Horse</span><span class="gpp-val" id="gpvHorse">—</span></span>
            <span class="gpp-item"><span class="gpp-label">Odds</span><span class="gpp-val" id="gpvOdds">—</span></span>
            <span class="gpp-item"><span class="gpp-label">Potential Win</span><span class="gpp-val gpp-win" id="gpvWin">—</span></span>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN: Instructions + Race Log + Bet Controls -->
      <div class="game-col-right">
        <div class="game-howto-panel">
          <div class="howto-title">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="9" stroke="var(--gold)" stroke-width="1.5"/><path d="M11 7v1" stroke="var(--gold)" stroke-width="2" stroke-linecap="round"/><path d="M11 11v4" stroke="var(--gold)" stroke-width="2" stroke-linecap="round"/></svg>
            HOW TO PLAY
          </div>
          <div class="howto-steps">
            <div class="howto-step">
              <span class="howto-num">1</span>
              <div class="howto-text"><strong>Select a Horse</strong><br>Tap a horse card to choose your contender. Study the odds and recent form.</div>
            </div>
            <div class="howto-step">
              <span class="howto-num">2</span>
              <div class="howto-text"><strong>Place Your Bet</strong><br>Set your wager below. Quick-bet buttons for $25, $50, $100 or ALL IN.</div>
            </div>
            <div class="howto-step">
              <span class="howto-num">3</span>
              <div class="howto-text"><strong>Confirm Bet</strong><br>Wait for the timer or hit confirm. The race starts automatically!</div>
            </div>
          </div>
          <div class="howto-tip">
            <span>💡</span> <em>Lower odds = more likely to win, less payout. High odds = high risk, high reward!</em>
          </div>
        </div>

        <!-- Bet controls -->
        <div class="game-bet-bar">
          <div class="game-bet-module" id="gameBetModule">
            <div class="game-bet-controls">
              <div class="game-bet-input-wrap">
                <span class="game-bet-currency">🪙</span>
                <input class="game-bet-input" id="gameBetAmount" type="number" value="50" min="10" step="10" oninput="gameUpdatePreview()"/>
              </div>
              <button class="game-race-btn" id="gameRaceBtn" onclick="gameStartRace()" disabled>
                <svg width="20" height="20" viewBox="0 0 22 22" fill="none"><polygon points="7,4 18,11 7,18" fill="currentColor"/></svg>
                CONFIRM BET
              </button>
              <div class="game-quick-bets">
                <button class="game-qbtn" onclick="gameSetBet(25)">$25</button>
                <button class="game-qbtn" onclick="gameSetBet(50)">$50</button>
                <button class="game-qbtn" onclick="gameSetBet(100)">$100</button>
                <button class="game-qbtn game-qbtn-allin" id="gameAllInBtn" onclick="gameSetBet(balance)">ALL IN</button>
              </div>
            </div>
          </div>

          <div class="game-result-banner" id="gameResultBanner" style="display:none">
            <div class="grb-title" id="gameResultTitle"></div>
            <div class="grb-sub" id="gameResultSub"></div>
            <div class="grb-money" id="gameResultMoney"></div>
            <button class="game-next-race-btn" onclick="gameResetForNextRace()">
              NEXT RACE
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M4 10h12m-4-4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>

        <div class="game-side-panel">
          <div class="ghs-header-row">
            <div class="ghs-label">🏇  LIVE BETS</div>
          </div>
          <div class="game-live-bets" id="gameLiveBetsList">
            <span class="ghs-empty">Waiting for wagers...</span>
          </div>
        </div>

        <div class="game-history-strip">
          <div class="ghs-header-row">
            <div class="ghs-label">📜  RACE LOG</div>
            <button class="ghs-clear-btn" onclick="gameClearHistory()">Clear</button>
          </div>
          <div class="ghs-list" id="gameHistoryList">
            <span class="ghs-empty">No races yet — place your first bet!</span>
          </div>
        </div>
      </div>

    </div>
  </div>`;
}

// ── CSS INJECTION for race screen ────────────────────────────
(function injectRaceCSS() {
  const s = document.createElement("style");
  s.textContent = `
  /* ── Race Info Strip ── */
  .race-info-strip{display:grid;grid-template-columns:repeat(2,1fr);background:var(--bg-2);border-bottom:1px solid var(--border);flex-shrink:0}
  .race-info-cell{padding:12px 10px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);text-align:center}
  .race-info-cell:nth-child(even){border-right:none}
  .race-info-cell:nth-child(n+3){border-bottom:none}
  .ric-label{font-family:var(--font-ui);font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--text-faint);display:block;margin-bottom:1px}
  .ric-val{font-family:var(--font-ui);font-size:13px;font-weight:700;color:var(--text-primary);display:block}

  /* ── Scrollable Game Content ── */
  .game-scroll-area{flex:1;overflow-y:auto;overflow-x:hidden;padding-bottom:180px;display:flex;flex-direction:column;min-height:0}
  .game-scroll-area::-webkit-scrollbar{width:4px}
  .game-scroll-area::-webkit-scrollbar-thumb{background:var(--bg-3);border-radius:4px}

  /* ── Instruction Banner ── */
  .game-instruction{display:flex;align-items:center;gap:10px;padding:12px 20px;background:rgba(201,162,39,0.06);border-bottom:1px solid rgba(201,162,39,0.15);color:var(--gold);font-family:var(--font-ui);font-size:13px;font-weight:600;letter-spacing:0.3px;flex-shrink:0}
  .game-instruction svg{flex-shrink:0;color:var(--gold)}

  /* ── Track Area ── */
  .game-track-area{padding:16px 20px 12px;background:linear-gradient(180deg,#0d200d 0%,#1a4a1a 100%);flex-shrink:0}
  .game-track-labels{display:flex;justify-content:space-between;padding:0 30px;margin-bottom:6px;font-family:var(--font-ui);font-size:11px;letter-spacing:1.5px;color:rgba(255,255,255,0.4);text-transform:uppercase}
  .game-track{background:#c8a96e;border-radius:50px;padding:8px 0;border:4px solid #8b6914;position:relative;box-shadow:inset 0 3px 10px rgba(0,0,0,0.4)}
  .game-track-inner{background:#3a7d44;border-radius:42px;margin:0 30px;padding:3px 0;overflow:hidden;position:relative;border:1px solid rgba(255,255,255,0.08)}
  .game-finish-line{position:absolute;right:130px;top:0;bottom:0;width:4px;background:repeating-linear-gradient(0deg,#fff 0,#fff 6px,#111 6px,#111 12px);z-index:10;box-shadow:0 0 6px rgba(255,255,255,0.3)}
  .game-finish-flag{position:absolute;right:124px;top:-22px;font-size:16px;z-index:11}
  .game-start-line{position:absolute;left:38px;top:0;bottom:0;width:2px;background:rgba(255,255,255,0.25);z-index:10}
  .game-lane{height:44px;display:flex;align-items:center;padding:3px 8px;border-bottom:1px dashed rgba(255,255,255,0.1);position:relative;overflow:hidden}
  .game-lane:last-child{border-bottom:none}
  .game-lane-num{width:18px;font-family:var(--font-ui);font-size:12px;font-weight:700;color:rgba(255,255,200,0.6);text-align:center;flex-shrink:0;z-index:2}
  .game-horse-wrap{position:absolute;left:0;top:0;bottom:0;display:flex;align-items:center;transition:left 0.04s linear;z-index:5}
  .game-crown{display:none;position:absolute;top:-10px;left:50%;transform:translateX(-50%);font-size:16px;animation:crownPop 0.4s ease}
  @keyframes crownPop{0%{transform:translateX(-50%) scale(0)}70%{transform:translateX(-50%) scale(1.3)}100%{transform:translateX(-50%) scale(1)}}

  /* ── Section Headers ── */
  .game-section{padding:12px 20px 24px}
  .game-section-header{display:flex;align-items:center;justify-content:space-between;padding:16px 0 10px;border-bottom:1px solid var(--border);margin-bottom:12px}
  .game-section-title{font-family:var(--font-display);font-size:18px;letter-spacing:2px;color:var(--text-primary)}
  .game-section-hint{font-family:var(--font-ui);font-size:13px;font-weight:600;color:var(--text-muted);letter-spacing:0.3px}
  .game-section-hint.pulse{animation:gpulse 0.8s ease infinite alternate}
  @keyframes gpulse{from{box-shadow:none;color:var(--text-muted)}to{color:var(--gold);text-shadow:0 0 8px rgba(201,162,39,0.4)}}

  /* ── Horse Cards Grid ── */
  .game-cards-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:0 0 16px}
  .game-horse-card{background:var(--bg-card);border:1.5px solid var(--border);border-radius:12px;padding:14px;cursor:pointer;transition:all 0.15s;position:relative;overflow:hidden}
  .game-horse-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--card-color,var(--gold-dim));opacity:0.6}
  .game-horse-card:hover{border-color:var(--gold-dim);background:var(--bg-card-2);transform:translateY(-2px)}
  .game-horse-card.selected{border-color:var(--gold);background:rgba(201,162,39,0.06);box-shadow:0 0 20px rgba(201,162,39,0.15)}
  .game-horse-card.selected::after{content:'✓ SELECTED';position:absolute;top:8px;right:10px;font-family:var(--font-ui);font-size:10px;font-weight:700;color:var(--gold);letter-spacing:1px}
  .game-horse-card.winner{border-color:#00ff88;background:#002215;animation:gwinner 1s ease infinite alternate}
  @keyframes gwinner{from{box-shadow:0 0 6px rgba(0,255,136,0.2)}to{box-shadow:0 0 20px rgba(0,255,136,0.5)}}

  .ghc-header{display:flex;align-items:center;gap:8px;margin-bottom:8px}
  .ghc-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0;box-shadow:0 0 6px rgba(255,255,255,0.15)}
  .ghc-name{font-family:var(--font-ui);font-size:14px;font-weight:700;color:var(--text-primary);line-height:1.1}
  .ghc-odds{font-family:var(--font-display);font-size:28px;font-weight:700;color:var(--gold-light);line-height:1;margin-top:2px}
  .ghc-odds-label{font-size:10px;color:var(--text-muted);font-family:var(--font-ui);letter-spacing:1.5px;text-transform:uppercase;margin-top:2px}
  .ghc-jockey{font-size:12px;color:var(--text-muted);margin-top:6px;font-family:var(--font-body)}
  .ghc-form{display:inline-flex;gap:3px;margin-top:6px}
  .ghc-fd{width:18px;height:18px;border-radius:4px;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:var(--font-ui)}
  .ghc-fd.W{background:#00aa55;color:#fff}.ghc-fd.P{background:#aa8800;color:#fff}.ghc-fd.L{background:#aa2222;color:#fff}
  .ghc-stat{margin-top:6px;display:flex;gap:4px;align-items:center}
  .ghc-slabel{font-family:var(--font-ui);font-size:10px;color:var(--text-muted);width:28px;flex-shrink:0;text-transform:uppercase}
  .ghc-strack{flex:1;height:5px;background:var(--bg-3);border-radius:3px;overflow:hidden}
  .ghc-sfill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--gold-dim),var(--gold-light))}

  /* ── Payout Preview ── */
  .game-payout-preview{background:rgba(201,162,39,0.05);border:1px solid var(--border-gold);border-radius:10px;padding:14px 20px;margin:0 20px 12px;display:none;flex-shrink:0}
  .gpp-row{display:flex;gap:16px;align-items:center;flex-wrap:wrap;justify-content:center}
  .gpp-item{display:flex;flex-direction:column;align-items:center;gap:2px}
  .gpp-label{font-family:var(--font-ui);font-size:10px;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase}
  .gpp-val{font-family:var(--font-ui);font-size:15px;font-weight:700;color:var(--text-primary)}
  .gpp-val.gpp-win{color:var(--gold-light);font-size:16px}

  /* ── Result Banner ── */
  .game-result-banner{margin:0;padding:16px;border-radius:0;text-align:center;animation:gbannerIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);flex-direction:column;align-items:center;gap:8px;display:none;flex-shrink:0;width:100%;background:var(--bg-2)}
  @keyframes gbannerIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  .game-result-banner.win{background:linear-gradient(180deg,#0a2e0a,#141720);border-top:2px solid #00ff88}
  .game-result-banner.lose{background:linear-gradient(180deg,#2e0a0a,#141720);border-top:2px solid #ff4444}
  .grb-title{font-family:var(--font-display);font-size:18px;letter-spacing:1px;color:#fff}
  .grb-sub{font-family:var(--font-ui);font-size:11px;letter-spacing:0.5px;opacity:0.8;color:#ccc}
  .grb-money{font-family:var(--font-display);font-size:28px;font-weight:700}
  .grb-money.win{color:#00ff88;text-shadow:0 0 15px rgba(0,255,136,0.4)}.grb-money.lose{color:#ff6666}

  .game-next-race-btn {
    margin-top: 10px;
    background: linear-gradient(135deg, var(--gold-dim), var(--gold));
    border: none;
    border-radius: 8px;
    color: #0a0e18;
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 2px;
    padding: 12px 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(201,162,39,0.3);
  }
  .game-next-race-btn:hover {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 6px 20px rgba(201,162,39,0.5);
    filter: brightness(1.1);
  }
  .game-track-overlay{position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:120px;font-weight:900;color:var(--gold);text-shadow:0 0 40px rgba(201,162,39,0.4);pointer-events:none;z-index:100;opacity:0;transition:all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)}
  .game-track-overlay.show{opacity:1;transform:scale(1.2)}
  /* ── Header Countdown Pulse ── */
  #gameHeaderTimerVal { animation: ghcpulse 1s infinite alternate }
  @keyframes ghcpulse { from { transform: scale(1); opacity: 0.8 } to { transform: scale(1.15); opacity: 1 } }

  /* ── Timer Badge ── */
  .game-timer-badge{background:rgba(201,162,39,0.15);border:1px solid var(--gold);border-radius:20px;padding:2px 10px;font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--gold);margin-left:auto;letter-spacing:1px}
  .game-timer-badge.warning{color:#ff4444;border-color:#ff4444;animation:gtwarn 0.5s infinite alternate}
  @keyframes gtwarn{from{opacity:1}to{opacity:0.5}}

  /* ── Live Bet Statuses ── */
  .game-live-bet-card.waiting{opacity:0.6;filter:grayscale(0.5)}
  .game-live-bet-card.ready{border-color:rgba(201,162,39,0.4);background:rgba(201,162,39,0.03)}
  /* ── Race Log Report Table ── */
  .game-history-report{width:100%;border-collapse:collapse;margin-top:5px;font-size:12px}
  .game-history-report th{text-align:left;color:rgba(255,255,255,0.4);font-weight:600;padding:6px 4px;border-bottom:1px solid rgba(255,255,255,0.05);text-transform:uppercase;letter-spacing:0.5px;font-size:10px}
  .game-history-report td{padding:8px 4px;border-bottom:1px solid rgba(255,255,255,0.03);color:rgba(255,255,255,0.8)}
  .ghr-id{color:var(--gold);font-weight:700;width:30px}
  .ghr-horse{display:flex;align-items:center;gap:6px}
  .ghr-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
  .ghr-net{text-align:right;font-weight:700;font-family:var(--font-mono)}
  .ghr-net.win{color:#44ff44}
  .ghr-net.lose{color:rgba(255,255,255,0.3)}
  .game-side-panel{padding:16px 20px;border-top:1px solid var(--border)}
  .game-live-bets{display:flex;flex-direction:column;gap:8px}
  .game-live-bet-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;transition:all 0.2s}
  .game-live-bet-card:hover{background:rgba(255,255,255,0.06);transform:translateX(4px)}
  .glb-player{display:flex;align-items:center;gap:8px;font-family:var(--font-ui);font-size:13px;color:var(--text-primary);font-weight:600}
  .glb-avatar{width:8px;height:8px;border-radius:50%;box-shadow:0 0 8px currentColor}
  .glb-info{text-align:right;font-family:var(--font-ui);font-size:11px}
  .glb-amount{color:var(--gold-light);font-weight:700}
  .glb-horse{font-weight:700;font-style:italic}

  .game-history-strip{padding:16px 20px 24px;border-top:1px solid var(--border)}
  .ghs-header-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;width:100%}
  .ghs-label{font-family:var(--font-ui);font-size:11px;color:var(--text-muted);letter-spacing:2px;text-transform:uppercase;font-weight:600}
  .ghs-clear-btn{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);font-family:var(--font-ui);font-size:10px;font-weight:700;letter-spacing:1px;padding:4px 10px;border-radius:4px;cursor:pointer;transition:all 0.15s;text-transform:uppercase}
  .ghs-clear-btn:hover{color:var(--text-primary);border-color:var(--border);background:rgba(255,255,255,0.06)}
  .ghs-list{display:flex;flex-direction:column;gap:12px}
  .ghs-empty{font-size:12px;color:var(--text-faint);font-family:var(--font-ui);font-style:italic}
  .ghs-pill{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px;font-family:var(--font-ui);display:flex;flex-direction:column;gap:10px;transition:all 0.3s;position:relative;overflow:hidden}
  .ghs-pill:hover{border-color:var(--gold-dim);transform:translateY(-2px)}
  .ghs-pill.w{border-color:rgba(0,255,136,0.3);box-shadow:inset 0 0 10px rgba(0,255,136,0.05)}
  .ghs-pill.l{border-color:rgba(255,100,100,0.2)}
  .ghs-row-main{display:flex;align-items:center;gap:10px}
  .ghs-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
  .ghs-main-text{font-size:14px;font-weight:800;letter-spacing:0.5px}
  .ghs-pill.w .ghs-main-text{color:#00ff88}.ghs-pill.l .ghs-main-text{color:#ff6666}
  .ghs-sub-text{font-size:11px;color:var(--text-muted);font-weight:500}
  .ghs-extra-info{color:var(--gold-dim);margin-left:4px;font-weight:700}

  .ghs-details-payouts{border-top:1px solid rgba(255,255,255,0.05);padding-top:10px;display:flex;flex-direction:column;gap:6px}
  .ghs-detail-row{display:flex;justify-content:space-between;font-size:11px;font-family:var(--font-body);color:rgba(255,255,255,0.6)}
  .ghs-detail-row.won span:last-child{color:#00ff88;font-weight:700}
  .ghs-detail-row.lost span:last-child{color:#ff8888;opacity:0.8}

  /* ── Bet Bar (mobile: fixed bottom) ── */
  .game-bet-bar{position:fixed;bottom:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:12px 14px 20px;background:rgba(20,23,32,0.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid rgba(201,162,39,0.25);box-shadow:0 -10px 40px rgba(0,0,0,0.6)}
  .game-bet-controls{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;flex-wrap:wrap}
  .game-bet-controls{display:flex;align-items:center;gap:10px;flex:1;flex-wrap:wrap}
  .game-bet-label{display:none}
  .game-bet-input-wrap{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.03);border:1.5px solid rgba(255,255,255,0.1);border-radius:10px;padding:0 12px;transition:all 0.2s;height:44px;min-width:110px}
  .game-bet-input-wrap:focus-within{border-color:var(--gold);background:rgba(201,162,39,0.05)}
  .game-bet-currency{font-size:14px}
  .game-bet-input{background:transparent;border:none;color:var(--gold-light);font-family:var(--font-display);font-size:22px;width:60px;padding:0;text-align:center;outline:none}
  .game-quick-bets{display:flex;gap:4px;align-items:center}
  .game-qbtn{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:var(--text-muted);padding:6px 10px;font-family:var(--font-ui);font-size:11px;font-weight:700;cursor:pointer;transition:all 0.15s;height:32px;display:flex;align-items:center;justify-content:center}
  .game-qbtn:hover{border-color:var(--gold-dim);color:var(--gold);background:rgba(201,162,39,0.1)}
  .game-qbtn-allin{color:var(--gold);border-color:rgba(201,162,39,0.3)}

  /* ── Race Button ── */
  .game-race-btn{display:flex;align-items:center;justify-content:center;gap:10px;background:linear-gradient(135deg,var(--gold-dim),var(--gold),var(--gold-light));background-size:200% 200%;animation:goldShimmer 3s ease infinite;border:none;border-radius:10px;color:#0a0e18;font-family:var(--font-display);font-size:16px;letter-spacing:1px;padding:0 20px;cursor:pointer;transition:all 0.2s;height:44px;font-weight:800;text-transform:uppercase}
  .game-race-btn:hover{box-shadow:0 8px 36px rgba(201,162,39,0.5);transform:translateY(-1px) scale(1.01)}
  .game-race-btn:active{transform:scale(0.98)}
  .game-race-btn:disabled{opacity:0.4;cursor:not-allowed;transform:none;box-shadow:none}

  input.shake{animation:inputShake 0.4s ease}
  @keyframes inputShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}

  /* ── Two-Column Layout (base: single column) ── */
  .game-main-layout{display:flex;flex-direction:column;gap:0}
  .game-col-left{flex:1;min-width:0}
  .game-col-right{display:flex;flex-direction:column;gap:0}

  /* ── How to Play Panel ── */
  .game-howto-panel{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px;margin:16px}
  .howto-title{font-family:var(--font-display);font-size:20px;letter-spacing:2px;color:var(--text-primary);display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border)}
  .howto-steps{display:flex;flex-direction:column;gap:12px}
  .howto-step{display:flex;gap:10px;align-items:flex-start}
  .howto-num{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--gold-dim),var(--gold));color:#0a0e18;font-family:var(--font-display);font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .howto-text{font-family:var(--font-body);font-size:12px;color:var(--text-muted);line-height:1.5}
  .howto-text strong{color:var(--text-primary);font-family:var(--font-ui);font-weight:700;font-size:12px}
  .howto-tip{margin-top:14px;padding:10px 12px;background:rgba(201,162,39,0.06);border:1px solid rgba(201,162,39,0.15);border-radius:8px;font-family:var(--font-body);font-size:11px;color:var(--gold);display:flex;align-items:flex-start;gap:8px;line-height:1.5}
  .howto-tip em{color:var(--text-muted)}

  /* ── Tablet ── */
  @media(min-width:768px){
    .game-cards-grid{grid-template-columns:repeat(3,1fr);gap:12px}
    .game-section{padding:0 20px}
    .game-track-area{padding:18px 20px 12px}
    .game-instruction{padding:12px 24px}
    .race-info-strip{display:flex;grid-template-columns:none}
    .race-info-cell{flex:1;padding:12px 16px;border-right:1px solid var(--border);border-bottom:none}
    .race-info-cell:last-child{border-right:none}
    .ric-val{font-size:16px}
    .ric-label{font-size:10px;letter-spacing:2px}
    .ghc-name{font-size:15px}
    .game-result-banner{margin:12px 20px;padding:24px;border-radius:14px;width:auto;border:1.5px solid transparent}
    .game-result-banner.win{background:linear-gradient(135deg,#0a2e0a,#1a551a);border-color:#00ff88}
    .game-result-banner.lose{background:linear-gradient(135deg,#2e0a0a,#5a1a1a);border-color:#ff4444}
    .grb-title{font-size:20px}
    .grb-money{font-size:32px}
  }

  /* ── Desktop: two-column, viewport-fit, no scroll ── */
  @media(min-width:900px){
    #screen-game{height:100vh;overflow:hidden}
    .game-scroll-area{overflow:hidden;padding-bottom:0}
    .game-main-layout{flex-direction:row;flex:1;min-height:0}

    .game-col-left{flex:1.2;border-right:1px solid var(--border);overflow-y:auto;min-height:0}
    .game-col-left::-webkit-scrollbar{width:3px}
    .game-col-left::-webkit-scrollbar-thumb{background:var(--bg-3);border-radius:3px}

    .game-col-right{flex:0.8;min-width:300px;display:flex;flex-direction:column;justify-content:flex-start;min-height:0;overflow-y:auto}
    .game-col-right::-webkit-scrollbar{width:4px}
    .game-col-right::-webkit-scrollbar-track{background:rgba(0,0,0,0.1)}
    .game-col-right::-webkit-scrollbar-thumb{background:var(--gold-dim);border-radius:10px}

    /* Bet bar: inline in right column on desktop */
    .game-bet-bar{position:static;flex-direction:column;gap:16px;padding:20px;border-top:1px solid var(--border-gold);border-bottom:1px solid var(--border-gold);border-radius:0;margin-top:0;flex-shrink:0;background:var(--bg-card);min-height:auto;display:flex;justify-content:center}
    .game-bet-module{display:flex;flex-direction:column;gap:20px;width:100%}
    .game-bet-controls{flex-direction:column;align-items:center;gap:16px;width:100%}
    .game-bet-label{display:block;font-size:12px;letter-spacing:2px;margin-bottom:4px;text-align:center;width:100%}
    .game-bet-input-wrap{width:100%;max-width:240px;justify-content:center;padding:4px 16px;height:auto}
    .game-bet-input{width:100px;font-size:24px}
    .game-quick-bets{justify-content:center;gap:8px}
    .game-qbtn{padding:8px 14px;font-size:13px;height:auto}
    .game-race-btn{width:100%;justify-content:center;margin-top:12px;font-size:24px;padding:16px 32px;height:auto}

    .game-result-banner{margin:0;width:100%}

    .game-howto-panel{margin:24px 16px 0;padding:22px}
    .howto-title{font-size:18px;margin-bottom:12px;padding-bottom:10px}
    .howto-steps{gap:10px}
    .howto-num{width:24px;height:24px;font-size:13px}
    .howto-text{font-size:12px}
    .howto-tip{font-size:11px}

    .game-history-strip{padding:14px 16px;border-top:none;flex-shrink:0}
    .game-side-panel{border-top:none}

    .ghc-odds{font-size:26px}
    .game-cards-grid{gap:8px;padding:0 0 8px}
    .game-horse-card{padding:10px}
    .game-section-header{padding:12px 0 8px;margin-bottom:8px}
    .game-track-area{padding:12px 16px 8px}
    .game-payout-preview{margin:0 16px 8px;padding:10px 16px}
    .game-result-banner{margin:8px 16px;padding:14px 18px}
  }

  /* ── Large Desktop ── */
  @media(min-width:1200px){
    .game-col-right{min-width:380px;flex:0.75}
    .game-col-left{flex:1.25}
    .game-howto-panel{margin:20px 20px 0;padding:22px}
    .howto-title{font-size:20px}
    .howto-text{font-size:13px}
    .game-bet-bar{padding:20px 24px}
    .ghc-odds{font-size:26px}
    .game-cards-grid{gap:8px;padding:0 0 8px}
    .game-horse-card{padding:10px}
    .game-section-header{padding:12px 0 8px;margin-bottom:8px}
    .game-track-area{padding:12px 16px 8px;position:relative}
    .game-payout-preview{margin:0 16px 8px;padding:10px 16px}
    .game-result-banner{margin:8px 16px;padding:14px 18px}

    /* Track overlay styling */
    .game-track-overlay{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);background:rgba(10,14,24,0.8);backdrop-filter:blur(6px);border:1px solid rgba(201,162,39,0.3);border-radius:30px;padding:8px 16px;display:flex;align-items:center;gap:10px;color:var(--gold);font-family:var(--font-ui);font-size:12px;font-weight:600;white-space:nowrap;z-index:20;box-shadow:0 6px 15px rgba(0,0,0,0.4);animation:overlayIn 0.5s cubic-bezier(0.34,1.56,0.64,1)}
    @keyframes overlayIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
    .game-track-overlay svg{color:var(--gold);flex-shrink:0}

    /* History Clear Button */
    .ghs-header-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .ghs-label{margin-bottom:0}
    .ghs-clear-btn{background:transparent;border:1px solid var(--border);border-radius:4px;color:var(--text-faint);font-family:var(--font-ui);font-size:10px;text-transform:uppercase;letter-spacing:1px;padding:3px 8px;cursor:pointer;transition:all 0.15s}
    .ghs-clear-btn:hover{color:var(--red);border-color:var(--red);background:rgba(255,102,102,0.05)}
  }
  `;
  document.head.appendChild(s);
})();

// ── RACE GAME ENGINE ─────────────────────────────────────────

let gameSelectedHorse = -1;
let gameRacing        = false;
let gameRoomBets      = []; // Array of { player, horseIndex, amount, readyAt }
let gamePhase         = "betting"; // "betting", "countdown", "racing"
let bettingTimerSecs  = 30;
let bettingInterval   = null;
let isBetConfirmed    = false;

function initRaceGame() {
  gameSelectedHorse = -1;
  gameRacing = false;
  buildGameTrack();
  buildGameBettingPanel();
  gameUpdateBalance();
  document.getElementById("gameRaceStatus").textContent = "Tap a card to select";
  document.getElementById("gameResultBanner").style.display = "none";
  document.getElementById("gamePayoutPreview").style.display = "none";
  const instr = document.getElementById("gameInstructionOverlay");
  if (instr) instr.style.display = "flex";
  if (activeRoom) {
    document.getElementById("gameRoomName").textContent = activeRoom.name;
    document.getElementById("gameStake").textContent    = activeRoom.stake + " 🪙";
  }
  document.getElementById("gameRaceNum").textContent = "Race #" + (raceCount + 1);

  // New: Phase Management
  gamePhase = "betting";
  bettingTimerSecs = 30;
  isBetConfirmed = false;
  
  const timerBadge = document.getElementById("gameTimerBadge");
  if (timerBadge) {
    timerBadge.textContent = "30s";
    timerBadge.classList.remove("warning");
  }

  const btn = document.getElementById("gameRaceBtn");
  if (btn) {
    btn.textContent = "CONFIRM BET";
    btn.disabled = true;
  }

  const timerCell = document.getElementById("gameHeaderTimerCell");
  const roomCell  = document.getElementById("gameRoomNameCell");
  if (timerCell) timerCell.style.display = "none";
  if (roomCell) roomCell.style.display = "block";

  if (bettingInterval) clearInterval(bettingInterval);
  bettingInterval = setInterval(tickBettingTimer, 1000);
  
  gameRenderLiveBets();
}

function tickBettingTimer() {
  if (gamePhase !== "betting") {
    clearInterval(bettingInterval);
    return;
  }

  bettingTimerSecs--;
  
  const timerCell = document.getElementById("gameHeaderTimerCell");
  const roomCell  = document.getElementById("gameRoomNameCell");
  const timerVal  = document.getElementById("gameHeaderTimerVal");
  const timerLbl  = document.getElementById("gameHeaderTimerLabel");

  if (timerCell && roomCell && timerVal) {
    timerCell.style.display = "block";
    roomCell.style.display = "none";
    timerLbl.textContent = "BETTING ENDS";
    timerVal.textContent = bettingTimerSecs + "s";
    
    if (bettingTimerSecs <= 10) {
      timerVal.style.color = "#ff4444";
    } else {
      timerVal.style.color = "var(--gold-light)";
    }
  }

  // Auto-reveal logic or trigger countdown if 0
  if (bettingTimerSecs <= 0) {
    clearInterval(bettingInterval);
    // If user hasn't selected anything, we'll force selection or just start?
    // Let's assume we start. If no horse selected, the existing validation in gameStartRace will handle it.
    // Or we handle it here:
    if (gameSelectedHorse < 0) {
      gameSelectHorse(Math.floor(Math.random() * horses.length));
    }
    gameStartRace(); // This will now trigger the countdown flow
  }

  gameRenderLiveBets();
}

function buildGameTrack() {
  const ti = document.getElementById("gameTrackInner");
  if (!ti) return;
  ti.innerHTML = "";
  positions.length = 0; velocities.length = 0;

  horses.forEach((h, i) => {
    const lane = document.createElement("div");
    lane.className = "game-lane";
    const num = document.createElement("div");
    num.className = "game-lane-num";
    num.textContent = i + 1;
    lane.appendChild(num);

    const wrap = document.createElement("div");
    wrap.className = "game-horse-wrap";
    wrap.id = "ghwrap" + i;
    wrap.innerHTML = buildHorseSVG(h.color, i);

    const crown = document.createElement("div");
    crown.className = "game-crown";
    crown.id = "gcrown" + i;
    crown.textContent = "👑";
    wrap.appendChild(crown);

    wrap.style.left = TRACK_START + "%";
    lane.appendChild(wrap);
    ti.appendChild(lane);
    positions.push(TRACK_START);
    velocities.push(0);
  });
}

function buildGameBettingPanel() {
  const panel = document.getElementById("gameBettingPanel");
  if (!panel) return;
  panel.innerHTML = "";
  horses.forEach((h, i) => {
    const card = document.createElement("div");
    card.className = "game-horse-card";
    card.id = "gcard" + i;
    card.style.setProperty("--card-color", h.color);
    card.onclick = () => gameSelectHorse(i);
    const formBadges = h.form.map(f => `<span class="ghc-fd ${f}">${f}</span>`).join("");
    card.innerHTML = `
      <div class="ghc-header"><div class="ghc-dot" style="background:${h.color}"></div><div class="ghc-name">#${i+1} ${h.name}</div></div>
      <div class="ghc-odds">${h.odds.toFixed(1)}x</div>
      <div class="ghc-odds-label">ODDS TO WIN</div>
      <div class="ghc-jockey">🧑 ${h.jockey}</div>
      <div class="ghc-form">${formBadges}</div>
      <div class="ghc-stat"><div class="ghc-slabel">Spd</div><div class="ghc-strack"><div class="ghc-sfill" style="width:${h.speed}%"></div></div><span style="font-size:9px;color:#446644;width:20px;text-align:right">${h.speed}</span></div>
      <div class="ghc-stat"><div class="ghc-slabel">Stm</div><div class="ghc-strack"><div class="ghc-sfill" style="width:${h.stamina}%;background:linear-gradient(90deg,#1a6a4a,#00ccff)"></div></div><span style="font-size:9px;color:#446644;width:20px;text-align:right">${h.stamina}</span></div>`;
    panel.appendChild(card);
  });
}

function gameSelectHorse(i) {
  if (gameRacing) return;
  gameSelectedHorse = i;
  document.querySelectorAll(".game-horse-card").forEach((c, idx) => c.classList.toggle("selected", idx === i));
  document.getElementById("gameRaceStatus").textContent = "Selected: #" + (i+1) + " " + horses[i].name;
  const btn = document.getElementById("gameRaceBtn");
  if (btn) btn.disabled = false;
  
  const instr = document.getElementById("gameInstructionOverlay");
  if (instr) { document.getElementById("gameInstructionText").textContent = "Now set your bet amount and CONFIRM BET!"; }
  gameUpdatePreview();
}

function gameSetBet(v) {
  v = Math.min(v, balance);
  document.getElementById("gameBetAmount").value = v;
  gameUpdatePreview();
}

function gameUpdatePreview() {
  const amt = parseInt(document.getElementById("gameBetAmount").value) || 0;
  const prev = document.getElementById("gamePayoutPreview");
  if (gameSelectedHorse >= 0 && amt > 0) {
    const { gross, profit } = calcPayout(gameSelectedHorse, amt);
    prev.style.display = "flex";
    document.getElementById("gpvHorse").textContent = horses[gameSelectedHorse].name;
    document.getElementById("gpvOdds").textContent  = horses[gameSelectedHorse].odds.toFixed(1) + "x";
    document.getElementById("gpvWin").textContent   = "$" + gross + " (+$" + profit + " profit)";
  } else {
    prev.style.display = "none";
  }
}

function gameStartRace() {
  if (gameRacing) return;
  const betAmt = parseInt(document.getElementById("gameBetAmount").value) || 0;
  const check  = validateBet(gameSelectedHorse, betAmt);
  if (!check.valid) { alert(check.reason); return; }

  // If in betting phase, move to countdown
  if (gamePhase === "betting") {
    gamePhase = "countdown";
    clearInterval(bettingInterval);
    isBetConfirmed = true;
    
    const btn = document.getElementById("gameRaceBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "WAITING...";
    }
    
    gameRenderLiveBets(); // Reveal AI bets
    startRaceCountdown(betAmt);
    return;
  }
}

function startRaceCountdown(betAmt) {
  const timerCell = document.getElementById("gameHeaderTimerCell");
  const timerVal  = document.getElementById("gameHeaderTimerVal");
  const timerLbl  = document.getElementById("gameHeaderTimerLabel");
  const roomCell  = document.getElementById("gameRoomNameCell");
  
  if (!timerCell || !timerVal) return;

  timerCell.style.display = "block";
  roomCell.style.display = "none";
  timerLbl.textContent = "STARTS IN";
  timerVal.style.color = "var(--gold-light)";
  
  let count = 3;
  timerVal.textContent = count;

  const cdn = setInterval(() => {
    count--;
    if (count > 0) {
      timerVal.textContent = count;
    } else if (count === 0) {
      timerVal.textContent = "GO!";
    } else {
      clearInterval(cdn);
      timerCell.style.display = "none";
      roomCell.style.display = "block";
      executeRace(betAmt);
    }
  }, 1000);
}

function executeRace(betAmt) {
  balance -= betAmt;
  gameRacing = true;
  raceCount++;
  document.getElementById("gameRaceBtn").disabled = true;
  document.getElementById("gameResultBanner").style.display = "none";
  const instr = document.getElementById("gameInstructionOverlay");
  if (instr) instr.style.display = "none";
  document.getElementById("gameRaceStatus").classList.add("pulse");
  document.getElementById("gameRaceStatus").textContent = "🏇 Race in progress...";
  document.getElementById("gameRaceNum").textContent = "Race #" + raceCount;
  gameUpdateBalance();
  gamePhase = "racing";
  buildGameTrack();

  const init = initVelocities();
  for (let i = 0; i < init.length; i++) velocities[i] = init[i];

  let tick = 0;
  const finishOrder = [];
  const finished = new Array(horses.length).fill(false);

  function animate() {
    tick++;
    for (let i = 0; i < horses.length; i++) {
      if (finished[i]) continue;
      const done = tickHorse(i, tick);
      if (done) { finished[i] = true; finishOrder.push(i); }
      const el = document.getElementById("ghwrap" + i);
      if (el) el.style.left = positions[i] + "%";
      gameAnimateLegs(i, tick);
    }
    if (finishOrder.length === horses.length || (finishOrder.length > 0 && tick > 500)) {
      cancelAnimationFrame(animFrame);
      gameEndRace(finishOrder[0], betAmt);
    } else {
      animFrame = requestAnimationFrame(animate);
    }
  }
  animFrame = requestAnimationFrame(animate);
}

function gameAnimateLegs(i, tick) {
  const speed = velocities[i] || 0.5;
  const phase = (tick * speed * 0.5) % (Math.PI * 2);
  const offsets = [0, Math.PI, Math.PI/2, Math.PI*1.5];
  for (let li = 0; li < 4; li++) {
    const el = document.getElementById("l" + li + "-" + i);
    if (!el) continue;
    const swing = Math.sin(phase + offsets[li]) * 5;
    el.setAttribute("y", 30 + swing);
    el.setAttribute("height", Math.max(4, 9 - Math.abs(swing) * 0.6));
  }
}

function gameEndRace(winner, betAmt) {
  gameRacing = false;
  document.getElementById("gameRaceStatus").classList.remove("pulse");
  document.getElementById("gameRaceStatus").textContent = "Race Finished!";

  const crown = document.getElementById("gcrown" + winner);
  if (crown) crown.style.display = "block";
  document.querySelectorAll(".game-horse-card").forEach((c, i) => { if (i === winner) c.classList.add("winner"); });

  const banner = document.getElementById("gameResultBanner");
  const module = document.getElementById("gameBetModule");
  
  if (module) module.style.display = "none";
  if (banner) banner.style.display = "flex";
  
  const won = winner === gameSelectedHorse;
  
  // Calculate AI outcomes
  const allResults = gameRoomBets.map(b => {
    const isWin = b.horseIndex === winner;
    let payout = 0;
    if (isWin) {
      const { gross } = calcPayout(winner, b.amount);
      payout = gross;
    }
    return { ...b, won: isWin, payout: isWin ? payout : -b.amount };
  });
  
  // Add User to the results for the history detail
  const { gross: userGross, profit: userProfit } = won ? calcPayout(winner, betAmt) : { gross: 0, profit: -betAmt };
  allResults.unshift({ player: "You", horseIndex: gameSelectedHorse, amount: betAmt, won, payout: won ? userGross : -betAmt });

  if (won) {
    const { gross, profit } = calcPayout(winner, betAmt);
    balance += gross;
    banner.className = "game-result-banner win";
    document.getElementById("gameResultTitle").textContent = "🏆 WINNER! #" + (winner+1) + " " + horses[winner].name;
    document.getElementById("gameResultSub").textContent   = "Your horse dominated the field!";
    document.getElementById("gameResultMoney").className   = "grb-money win";
    document.getElementById("gameResultMoney").textContent = "+$" + gross + " (net +$" + profit + ")";
    recordResult(horses[winner], true, profit, betAmt, allResults);
  } else {
    banner.className = "game-result-banner lose";
    document.getElementById("gameResultTitle").textContent = "😔 #" + (winner+1) + " " + horses[winner].name + " wins!";
    document.getElementById("gameResultSub").textContent   = "Better luck in the next race!";
    document.getElementById("gameResultMoney").className   = "grb-money lose";
    document.getElementById("gameResultMoney").textContent = "-$" + betAmt;
    recordResult(horses[winner], false, -betAmt, betAmt, allResults);
  }

  gameUpdateBalance();
  gameRenderHistory();
  gameRenderLiveBets();
}

function gameRenderLiveBets() {
  const list = document.getElementById("gameLiveBetsList");
  if (!list) return;
  if (gameRoomBets.length === 0) {
    list.innerHTML = `<span class="ghs-empty">No other bets placed.</span>`;
    return;
  }

  // Current elapsed time in betting phase for AI ready status
  const elapsed = 30 - bettingTimerSecs;

  list.innerHTML = gameRoomBets.map(b => {
    const isReady = (gamePhase !== "betting") || (elapsed >= b.readyAt);
    const horse = horses[b.horseIndex];
    
    if (!isReady) {
      return `
        <div class="game-live-bet-card waiting">
          <div class="glb-player">
            <span class="glb-avatar" style="background:#444"></span>
            ${b.player}
          </div>
          <div class="glb-info">
            <span class="glb-status">Waiting to bid...</span>
          </div>
        </div>
      `;
    }

    // Phase check: hide details during betting phase even if ready, show "Bid ready"
    if (gamePhase === "betting") {
      return `
        <div class="game-live-bet-card ready">
          <div class="glb-player">
            <span class="glb-avatar" style="background:${horse.color}"></span>
            ${b.player}
          </div>
          <div class="glb-info">
            <span class="glb-status ready">Bid Ready ✓</span>
          </div>
        </div>
      `;
    }

    // Reveal phase (countdown or racing)
    return `
      <div class="game-live-bet-card">
        <div class="glb-player">
          <span class="glb-avatar" style="background:${horse.color}"></span>
          ${b.player}
        </div>
        <div class="glb-info">
          <span class="glb-amount">$${b.amount}</span>
          on <span class="glb-horse" style="color:${horse.color}">${horse.name}</span>
        </div>
      </div>
    `;
  }).join("");
}

function gameRenderHistory() {
  const list = document.getElementById("gameHistoryList");
  if (!list) return;
  list.innerHTML = "";
  if (history.length === 0) {
    list.innerHTML = `<span class="ghs-empty">No races yet — place your first bet!</span>`;
    return;
  }

  history.forEach(h => {
    const pill = document.createElement("div");
    pill.className = "ghs-pill " + (h.won ? "w" : "l");
    
    // Summary of other winners
    const aiWinners = h.allBets.filter(b => b.won);
    const winInfo = aiWinners.length > 0 
      ? `<span class="ghs-extra-info"> +${aiWinners.length} others won</span>`
      : "";

    pill.innerHTML = `
      <div class="ghs-row-main">
        <div class="ghs-dot" style="background:${h.horse.color}"></div>
        <div class="ghs-side">
          <div class="ghs-main-text">${h.won ? "WON" : "LOST"} $${Math.abs(h.net)}</div>
          <div class="ghs-sub-text">#${h.horse.name} ${winInfo}</div>
        </div>
      </div>
    `;

    // Tooltip or detailed view for payouts
    if (h.allBets.length > 0) {
      const details = document.createElement("div");
      details.className = "ghs-details-payouts";
      details.innerHTML = h.allBets.map(b => `
        <div class="ghs-detail-row ${b.won ? "won" : "lost"}">
          <span>${b.player}</span>
          <span>${b.won ? "+" : ""}$${b.payout}</span>
        </div>
      `).join("");
      pill.appendChild(details);
    }

    list.appendChild(pill);
  });
}

function gameResetForNextRace() {
  const banner = document.getElementById("gameResultBanner");
  const module = document.getElementById("gameBetModule");
  if (banner) banner.style.display = "none";
  if (module) module.style.display = "flex";

  initRaceGame(); // Re-init everything (timer, AI bets, etc)
}

function gameUpdateBalance() {
  const fmt = balance.toLocaleString();
  const d1 = document.getElementById("gameBalanceDisplay");
  const d3 = document.getElementById("gameAllInBtn");
  if (d1) d1.textContent = fmt;
  if (d3) d3.textContent = "ALL IN";
}

function gameClearHistory() {
  gameHistory = [];
  gameRenderHistory();
}

function gameRenderHistory() {
  const list = document.getElementById("gameHistoryList");
  if (!list || !history.length) return;
  
  const reportRows = history.map((h, i) => {
    const isWin = h.won;
    const sign = h.net > 0 ? "+" : "";
    return `
      <tr>
        <td class="ghr-id">#${history.length - i}</td>
        <td>
          <div class="ghr-horse">
            <div class="ghr-dot" style="background:${h.horse.color}"></div>
            ${h.horse.name.split(" ")[0]}
          </div>
        </td>
        <td class="ghr-net ${isWin ? 'win' : 'lose'}">
          ${isWin ? 'WIN' : 'LOSS'} ${sign}$${Math.abs(h.net)}
        </td>
      </tr>
    `;
  }).join("");

  list.innerHTML = `
    <table class="game-history-report">
      <thead>
        <tr>
          <th>ID</th>
          <th>WINNER</th>
          <th style="text-align:right">RETURN</th>
        </tr>
      </thead>
      <tbody>
        ${reportRows}
      </tbody>
    </table>
  `;
}

// ── SVG HORSE BUILDER ────────────────────────────────────────
function buildHorseSVG(color, idx) {
  const dark = darken(color);
  return `<svg viewBox="0 0 72 40" xmlns="http://www.w3.org/2000/svg" width="58" height="34" style="display:block">
    <ellipse cx="34" cy="22" rx="20" ry="10" fill="${color}" opacity="0.95"/>
    <rect x="47" y="10" width="9" height="14" rx="4" fill="${color}" transform="rotate(-10,47,10)"/>
    <ellipse cx="56" cy="9" rx="8" ry="6" fill="${color}"/>
    <polygon points="54,4 57,4 56,0" fill="${dark}"/>
    <circle cx="59" cy="8" r="1.5" fill="#111"/>
    <circle cx="59.5" cy="7.5" r="0.5" fill="#fff"/>
    <ellipse cx="63" cy="10" rx="1.5" ry="1" fill="${dark}"/>
    <path d="M48,6 Q51,3 54,6 Q51,9 48,6" fill="${dark}" opacity="0.7"/>
    <path d="M14,18 Q5,14 7,22 Q5,26 12,24" fill="none" stroke="${dark}" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="33" cy="13" rx="9" ry="4" fill="#8B4513" opacity="0.8"/>
    <ellipse cx="33" cy="8" rx="4" ry="4" fill="#cc6600" opacity="0.85"/>
    <rect x="29" y="10" width="8" height="5" rx="2" fill="#cc6600" opacity="0.85"/>
    <ellipse cx="33" cy="6" rx="4.5" ry="3" fill="${color}" opacity="0.9"/>
    <rect id="l0-${idx}" x="23" y="30" width="5" height="9" rx="2" fill="${dark}"/>
    <rect id="l1-${idx}" x="30" y="30" width="5" height="9" rx="2" fill="${dark}"/>
    <rect id="l2-${idx}" x="38" y="30" width="5" height="9" rx="2" fill="${dark}"/>
    <rect id="l3-${idx}" x="45" y="30" width="5" height="9" rx="2" fill="${dark}"/>
  </svg>`;
}

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  renderRooms();
  // Ensure home is shown
  showScreen("screen-home");
  screenStack = ["screen-home"];
});

// ── RELOAD WARNING ───────────────────────────────────────────
// Warn the user before they accidentally reload/close and lose progress
window.addEventListener("beforeunload", (e) => {
  // Only warn if user has navigated beyond the home screen
  if (screenStack.length > 1) {
    e.preventDefault();
    // Modern browsers show a generic message; this string is for legacy support
    e.returnValue = "All progress will be lost and you will be redirected to the starting screen. Are you sure?";
    return e.returnValue;
  }
});

// ── CREATE ROOM LOGIC ────────────────────────────────────────

let selectedStakeVal = 50;
let selectedIconVal  = "🎮";

function toggleDropdown(id) {
  const list = document.getElementById(id);
  const isOpen = list.classList.contains("open");
  // Close all other dropdowns first
  document.querySelectorAll(".options-list").forEach(l => l.classList.remove("open"));
  if (!isOpen) list.classList.add("open");
}

function selectStake(val, e) {
  if (e) e.stopPropagation();
  selectedStakeVal = val;
  document.getElementById("selected-stake").textContent = `${val} CREDITS 🪙`;
  document.getElementById("stake-options").classList.remove("open");
}

function selectIcon(icon, e) {
  if (e) e.stopPropagation();
  selectedIconVal = icon;
  document.getElementById("selected-icon").textContent = icon;
  document.getElementById("icon-options").classList.remove("open");
}

function generateInviteCode() {
  const prefix = ["NEON", "ELITE", "CYBER", "VOLT", "APEX"];
  const chars  = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const nums   = "0123456789";
  
  const p = prefix[Math.floor(Math.random() * prefix.length)];
  const c = chars[Math.floor(Math.random() * chars.length)];
  const n = Array(4).fill(0).map(() => nums[Math.floor(Math.random() * nums.length)]).join("");
  
  const code = `${p}-${c}-${n}`;
  document.getElementById("invite-code-val").value = code;
}

function copyInviteCode() {
  const codeVal = document.getElementById("invite-code-val");
  codeVal.select();
  document.execCommand("copy");
  
  const btn = document.querySelector(".btn-icon-copy");
  const originalSvg = btn.innerHTML;
  btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  setTimeout(() => btn.innerHTML = originalSvg, 2000);
}

async function shareInviteLink() {
  const code = document.getElementById("invite-code-val").value;
  const shareData = {
    title: 'Join my Horse Racing Elite Room!',
    text: `Enter my arena with code: ${code}`,
    url: window.location.href
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      // Fallback: Copy link to clipboard
      const dummy = document.createElement("input");
      document.body.appendChild(dummy);
      dummy.value = window.location.href;
      dummy.select();
      document.execCommand("copy");
      document.body.removeChild(dummy);
      alert("Invite link copied to clipboard!");
    }
  } catch (err) {
    console.log("Error sharing:", err);
  }
}

function handleCreateRoom() {
  const name = document.getElementById("create-room-name").value.trim() || "Elite Arena";
  const pass = document.getElementById("create-room-pass").value.trim();
  const code = document.getElementById("invite-code-val").value;

  const newRoom = {
    id: Date.now(),
    name: name,
    host: "You", // In a real app, this would be the logged-in user
    icon: selectedIconVal,
    type: pass ? "private" : "open",
    tag: "fast",
    tagLabel: pass ? "★ PRIVATE" : "⚡ FAST PLAY",
    stake: selectedStakeVal,
    players: ["You"],
    maxPlayers: 6,
    track: "Thunder Downs",
    distance: "1200m",
    password: pass || null,
    inviteCode: code
  };

  // Add to local list for simulation
  PUBLIC_ROOMS.unshift(newRoom);
  
  // Transition
  loadRoom(newRoom);
}

// Close dropdowns on outside click
window.addEventListener("click", (e) => {
  if (!e.target.closest(".dropdown-group")) {
    document.querySelectorAll(".options-list").forEach(l => l.classList.remove("open"));
  }
});

// ── LOBBY INVITE LOGIC ───────────────────────────────────────

function openInviteModal() {
  if (!activeRoom) return;
  
  // Use existing invite code or generate one if missing
  const code = activeRoom.inviteCode || generateLobbyInviteCode(activeRoom);
  activeRoom.inviteCode = code;
  
  document.getElementById("lobby-invite-code-val").value = code;
  document.getElementById("modal-invite").classList.add("open");
}

function closeInviteModal() {
  document.getElementById("modal-invite").classList.remove("open");
}

function handleInviteBackdrop(e) {
  if (e.target === document.getElementById("modal-invite")) closeInviteModal();
}

function generateLobbyInviteCode(room) {
  const prefix = ["NEON", "ELITE", "CYBER", "VOLT", "APEX"];
  const chars  = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const nums   = "0123456789";
  
  const p = prefix[Math.floor(Math.random() * prefix.length)];
  const c = chars[Math.floor(Math.random() * chars.length)];
  const n = Array(4).fill(0).map(() => nums[Math.floor(Math.random() * nums.length)]).join("");
  
  return `${p}-${c}-${n}`;
}

function copyLobbyInviteCode() {
  const codeVal = document.getElementById("lobby-invite-code-val");
  codeVal.select();
  document.execCommand("copy");
  
  const btn = document.querySelector("#modal-invite .btn-icon-copy");
  const originalSvg = btn.innerHTML;
  btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  setTimeout(() => btn.innerHTML = originalSvg, 2000);
}

async function shareLobbyInviteLink() {
  const code = document.getElementById("lobby-invite-code-val").value;
  const shareData = {
    title: 'Join my Horse Racing Elite Room!',
    text: `Enter my arena with code: ${code}`,
    url: window.location.href
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      const dummy = document.createElement("input");
      document.body.appendChild(dummy);
      dummy.value = window.location.href;
      dummy.select();
      document.execCommand("copy");
      document.body.removeChild(dummy);
      alert("Invite link copied to clipboard!");
    }
  } catch (err) {
    console.log("Error sharing:", err);
  }
}

// ── JOIN BY CODE LOGIC ───────────────────────────────────────

function openJoinCodeModal() {
  document.getElementById("joinCodeInput").value = "";
  document.getElementById("joinCodeError").textContent = "";
  document.getElementById("modal-join-code").classList.add("open");
  setTimeout(() => document.getElementById("joinCodeInput").focus(), 300);
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

  // Search for the room in PUBLIC_ROOMS
  const room = PUBLIC_ROOMS.find(r => r.inviteCode === code);

  if (room) {
    closeJoinCodeModal();
    handleJoinRoom(room);
  } else {
    document.getElementById("joinCodeError").textContent = "Invalid code. Arena not found.";
    document.getElementById("joinCodeInput").classList.add("shake");
    setTimeout(() => document.getElementById("joinCodeInput").classList.remove("shake"), 500);
  }
}


