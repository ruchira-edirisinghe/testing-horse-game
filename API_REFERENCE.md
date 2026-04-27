# 🔧 Multiplayer API Reference

Quick reference for all new multiplayer functions.

---

## Backend Functions (backend.js)

### Player Management

#### `setPlayerName(name: string)`
Sets the current player's name and generates a unique player ID if needed.

```javascript
const result = setPlayerName("ShadowRider");
// Returns: { valid: true } or { valid: false, reason: "..." }
```

#### `validatePlayerName(name: string)`
Validates player name without setting it. Checks:
- Not empty
- Max 20 characters
- Alphanumeric + underscore/hyphen only
- Not already taken in current room

```javascript
const validation = validatePlayerName("ShadowRider");
// Returns: { valid: true } or { valid: false, reason: "..." }
```

#### `generatePlayerId()`
Generates a unique player ID (used internally).

```javascript
const id = generatePlayerId();
// Returns: "player_1642345678_abc123xyz"
```

---

### Invite Code Management

#### `generateInviteCode(length = 8)`
Generates a random alphanumeric invite code.

```javascript
const code = generateInviteCode(8);
// Returns: "ABC1XYZ9"

// Custom length:
const code = generateInviteCode(6);
// Returns: "ABC1XY"
```

---

### Room Management

#### `createMultiplayerRoom(roomName, stake, icon)`
Creates a new multiplayer room with auto-generated invite code.

```javascript
const room = createMultiplayerRoom("Thunder Riders", 50, "⚡");
// Returns:
{
  id: "mp_1642345678",
  code: "ABC1XYZ9",
  name: "Thunder Riders",
  host: "ShadowRider",
  hostId: "player_123...",
  icon: "⚡",
  stake: 50,
  players: ["ShadowRider"],
  playerList: [{ id: "...", name: "ShadowRider", ready: false, joinedAt: ... }],
  maxPlayers: 8,
  track: "Dynamic Track",
  distance: "2000m"
}
```

#### `joinMultiplayerRoom(roomCode, nameToJoin)`
Validates and joins a room by invite code.

```javascript
const result = joinMultiplayerRoom("ABC1XYZ9", "NeonGhost");
// Returns: { valid: true } or { valid: false, reason: "..." }
```

#### `storeMultiplayerRoom(roomData)`
Stores a room in the local `multiplayerRooms` array. In production, would push to Firebase.

```javascript
const code = storeMultiplayerRoom(roomData);
// Returns: "ABC1XYZ9"
```

#### `findRoomByCode(code)`
Finds a room by its invite code (case-insensitive).

```javascript
const room = findRoomByCode("ABC1XYZ9");
// Returns: room object or undefined
```

---

## UI Functions (script.js)

### Player Name Modal

#### `submitPlayerName()`
Called when player clicks "ENTER THE ARENA". Validates and sets player name.

```javascript
submitPlayerName();
// Reads from #playerNameInput
// Updates UI with player badge and avatar
// Shows error if validation fails
// Closes modal and shows home screen if successful
```

#### `closePlayerNameModal()`
Closes the player name modal.

```javascript
closePlayerNameModal();
// Hides #modal-player-name
```

#### `changePlayerName()`
Opens name modal again to change name (for mid-session changes).

```javascript
changePlayerName();
// Opens #modal-player-name with empty input
```

---

### Room Creation

#### `generateInviteCode()`
Called when entering create room screen. Generates code if not exists.

```javascript
generateInviteCode();
// Updates #invite-code-val display
// Sets global generatedInviteCode
```

#### `updateInviteCodeDisplay()`
Updates the invite code display in the UI after generation.

```javascript
updateInviteCodeDisplay();
// Shows code in #invite-code-val
// Enables copy and share buttons
```

#### `handleCreateRoom()`
Creates a new multiplayer room with user settings.

```javascript
handleCreateRoom();
// Reads: #create-room-name, selectedStake, selectedIcon
// Creates room with generated code
// Stores room in multiplayerRooms
// Transitions to loading → lobby
```

#### `copyInviteCode()`
Copies invite code to clipboard (create room screen).

```javascript
copyInviteCode();
// Copies #invite-code-val to clipboard
// Shows confirmation animation
```

#### `shareInviteLink()`
Shares invite link via Web Share API or clipboard (create room screen).

```javascript
shareInviteLink();
// Format: "yourdomain.com?invite=ABC1XYZ9"
// Uses navigator.share() if available
// Falls back to clipboard copy
```

---

### Code-Based Joining

#### `openJoinCodeModal()`
Opens the "join by code" modal.

```javascript
openJoinCodeModal();
// Shows #modal-join-code
// Focuses #joinCodeInput
```

#### `closeJoinCodeModal()`
Closes the join code modal.

```javascript
closeJoinCodeModal();
// Hides #modal-join-code
```

#### `submitJoinCode()`
Validates code and joins the room.

```javascript
submitJoinCode();
// Reads from #joinCodeInput
// Searches multiplayerRooms by code
// Shows error if not found
// Shows error if room full
// Loads room if found
```

#### `handleJoinCodeBackdrop(event)`
Click handler for modal backdrop. Closes if click outside.

```javascript
// Used in HTML: onclick="handleJoinCodeBackdrop(event)"
// Checks if click is on backdrop (not modal content)
```

---

### Invite Modal (in Lobby)

#### `openInviteModal()`
Opens the invite friends modal while in lobby.

```javascript
openInviteModal();
// Shows #modal-invite
// Populates #lobby-invite-code-val with room code
```

#### `closeInviteModal()`
Closes the invite modal.

```javascript
closeInviteModal();
// Hides #modal-invite
```

#### `copyLobbyInviteCode()`
Copies code from lobby invite modal.

```javascript
copyLobbyInviteCode();
// Copies #lobby-invite-code-val to clipboard
```

#### `shareLobbyInviteLink()`
Shares invite link from lobby.

```javascript
shareLobbyInviteLink();
// Same format as create room version
```

#### `handleInviteBackdrop(event)`
Click handler for invite modal backdrop.

```javascript
// Used in HTML: onclick="handleInviteBackdrop(event)"
```

---

### Lobby Management

#### `renderLobby(room)`
Renders the lobby screen with room details and players.

```javascript
renderLobby(room);
// Updates #lobbyBanner with room info
// Updates #lobbyDetails with specs
// Updates #lobbyPlayers with player list
// Adds current player to room.playerList if not already there
// Shows screen-lobby
```

#### `loadRoom(room)`
Shows loading screen then transitions to lobby.

```javascript
loadRoom(room);
// Shows screen-loading with progress animation
// Displays loading messages
// Calls renderLobby() when complete
```

---

### Room Listing

#### `renderRooms()`
Renders list of all available rooms (public + multiplayer).

```javascript
renderRooms();
// Combines PUBLIC_ROOMS + multiplayerRooms
// Creates room cards with join buttons
// Shows player counts
// Shows different colors for room types
```

---

## Global Variables

```javascript
// Player info
playerName              // Current player's name
playerId                // Current player's unique ID
currentRoomCode         // Code of room player is in
currentPlayers          // Array of players in current room

// Room tracking
multiplayerRooms        // Array of created multiplayer rooms
createdRoomCode         // Code of room just created
createdRoomData         // Full data of room just created
activeRoom              // Currently active room object

// UI state
generatedInviteCode     // Code displayed in create room screen
selectedStake           // Selected stake amount (25, 50, 100, 200, 500)
selectedIcon            // Selected room icon emoji

// Game state (unchanged)
balance                 // Player's credit balance
selectedHorse           // Currently selected horse index
racing                  // Whether race is in progress
```

---

## Data Structures

### Player Object
```javascript
{
  id: "player_1642345678_abc123xyz",  // Unique ID
  name: "ShadowRider",                 // Player's chosen name
  ready: false,                        // Lobby ready status
  joinedAt: 1642345678000              // Timestamp
}
```

### Room Object (Multiplayer)
```javascript
{
  id: "mp_1642345678",                 // Unique room ID
  code: "ABC1XYZ9",                    // Invite code
  name: "Thunder Riders",              // Room name
  host: "ShadowRider",                 // Host player name
  hostId: "player_123...",             // Host player ID
  icon: "⚡",                           // Room icon
  type: "open",                        // Room type
  tag: "fast",                         // Room tag
  tagLabel: "⚡ FAST PLAY",            // Tag display
  stake: 50,                           // Entry stake
  players: ["ShadowRider", "..."],     // Player names array
  playerList: [{...}, {...}],          // Detailed player objects
  maxPlayers: 8,                       // Max capacity
  track: "Dynamic Track",              // Track name
  distance: "2000m",                   // Race distance
  createdAt: 1642345678000,            // Creation timestamp
  started: false                       // Race started?
}
```

---

## Event Flow

### Creating a Room

```
1. showScreen('screen-create')
2. generateInviteCode() → #invite-code-val populated
3. User fills form + clicks CREATE ROOM
4. handleCreateRoom()
   ├─ Validate inputs
   ├─ createMultiplayerRoom() → new room with code
   ├─ storeMultiplayerRoom() → added to multiplayerRooms
   └─ loadRoom() → shows loading screen
5. renderLobby() → shows lobby with room details
6. Player appears as HOST in player list
```

### Joining by Code

```
1. Click "JOIN BY CODE"
2. openJoinCodeModal() → shows modal
3. User enters code + clicks JOIN ARENA
4. submitJoinCode()
   ├─ Validate code format
   ├─ findRoomByCode() → search multiplayerRooms
   ├─ Check room not full
   └─ loadRoom() → shows loading screen
5. renderLobby()
   ├─ Adds player to room.playerList
   ├─ Updates player count
   └─ Renders lobby with all players
6. Player appears in player list (not HOST)
```

### Starting Race

```
1. Host clicks "START RACE"
2. startRaceFromLobby()
   ├─ Check player is host
   ├─ Deduct stake from balance
   └─ showRaceGame()
3. Race screen loads
4. All players see same horses & race
5. Race runs until horse crosses finish line
6. showRaceResults()
   ├─ Calculate winnings
   ├─ Update balance
   └─ Show results modal
```

---

## Browser Storage

Currently uses **in-memory storage** (lost on page refresh):

```javascript
multiplayerRooms // Array stored in JavaScript variable
```

**To add persistence**, implement Firebase:

```javascript
// In Firebase listener:
db.ref('rooms/' + roomCode).set(roomData);
db.ref('rooms/' + roomCode).on('value', snapshot => {
  const room = snapshot.val();
  renderLobby(room);
});
```

---

## Error Handling

### Common Errors

```javascript
// Invalid name
{ valid: false, reason: "Player name cannot be empty." }
{ valid: false, reason: "Player name must be 20 characters or less." }
{ valid: false, reason: "Player name can only contain letters, numbers, underscore, and hyphen." }
{ valid: false, reason: "This player name is already taken in this room!" }

// Invalid code
"Invalid code. Arena not found."
"This arena is full!"
"Please enter an invite code."
```

### Debugging

```javascript
// Check player info
console.log(playerName, playerId, currentRoomCode);

// Check rooms
console.log(multiplayerRooms);

// Check current room
console.log(activeRoom);

// Check room players
console.log(activeRoom.playerList);

// Find room by code
console.log(findRoomByCode("ABC1XYZ9"));
```

---

## Tips for Customization

### Add Validation

```javascript
function validatePlayerName(name) {
  // Add your custom rules here
  if (name.length < 3) {
    return { valid: false, reason: "Name too short" };
  }
  // ... existing validation
  return { valid: true };
}
```

### Change Max Players

```javascript
// In createMultiplayerRoom():
maxPlayers: 4,  // or 6, 8, 10, etc
```

### Add Room Persistence

```javascript
// After storeMultiplayerRoom():
db.ref('rooms/' + roomData.code).set(roomData);
```

### Add Player Ready Status

```javascript
// In lobby, add ready toggle:
function togglePlayerReady() {
  if (activeRoom.host !== playerName) {
    alert("Only host can start");
    return;
  }
  // Toggle ready state
}
```

---

## FAQ

**Q: Can I customize the invite code format?**  
A: Yes! Edit `generateInviteCode()` in `backend.js` to change characters or length.

**Q: How do I make rooms persistent?**  
A: Add Firebase Realtime Database and sync with `db.ref()` calls.

**Q: Can I add authentication?**  
A: Yes! Integrate Firebase Auth to track accounts and stats.

**Q: How do I add chat?**  
A: Create a chat message array in room object, sync with Firebase.

**Q: Can I add spectators?**  
A: Yes! Create a spectator list separate from players array.

---

*Reference version 1.0 - April 2025*
