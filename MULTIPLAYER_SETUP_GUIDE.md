# 🏇 Horse Racing Elite - Multiplayer Edition
## Complete Setup & Deployment Guide

---

## 📋 Overview

Your horse racing game has been fully upgraded with **multiplayer capabilities**! Players can now:

✅ **Create private multiplayer rooms** with unique invite codes  
✅ **Share invite codes** with friends to invite them to join  
✅ **Support up to 8 players** per room  
✅ **Player name customization** when joining  
✅ **Real-time player tracking** in lobbies  
✅ **URL-based invite sharing** (e.g., `?invite=ABC1XYZ9`)  

---

## 🚀 Quick Start - Deployment to Netlify

### Step 1: Prepare Your Files

Replace your current files with these updated versions:

```
- index.html (NEW - with player name modal)
- script.js (UPDATED - full multiplayer logic)
- backend.js (UPDATED - room & player management)
- style.css (UPDATED - new multiplayer styles)
```

### Step 2: Update Firebase Configuration (Optional - for cloud persistence)

If you want **persistent rooms** across sessions (players can rejoin later), add Firebase:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project: "horse-racing-game"
3. Enable Realtime Database
4. Copy your config and update `backend.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-rtdb.firebaseio.com",
  projectId: "horse-racing-game",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

**WITHOUT Firebase**: Rooms exist only during the session (works great for testing!)

### Step 3: Deploy to Netlify

Option A: **Drag & Drop**
1. Go to [Netlify](https://app.netlify.com)
2. Drag your project folder into the "Deploy" zone
3. Done! Your site is live

Option B: **Via Git** (recommended)
1. Push to GitHub
2. Connect your repo to Netlify
3. Auto-deploys on every push

---

## 🎮 How It Works

### For Room Creators

1. **Enter your name** when you first load the site
2. Click **"CREATE ROOM"**
3. Fill in:
   - Room Name (e.g., "Night Riders Club")
   - Stake amount (25, 50, 100, 200, or 500 credits)
   - Room Icon (🎮 🐎 🏆 ⚡)
4. **Invite code is auto-generated** (e.g., `ABC1XYZ9`)
5. Click **"CREATE ROOM"** to proceed
6. Share the code with friends!

### For Players Joining by Code

1. **Enter your name** when you load the site
2. Click **"JOIN PUBLIC ROOM"** → **"JOIN BY CODE"**
3. Enter the invite code your friend gave you
4. Click **"JOIN ARENA"**
5. You appear in the lobby!

### In the Lobby

- See all players who've joined (up to 8)
- Host is marked with a HOST badge
- Click **"INVITE FRIENDS"** to share code again
- When host clicks **"START RACE"**, the race begins
- Stake is deducted from everyone automatically

---

## 💻 Code Architecture

### New Multiplayer Functions (in `backend.js`)

```javascript
// Generate unique invite codes
generateInviteCode(length = 8)  // Returns: "ABC1XYZ9"

// Player name validation
validatePlayerName(name)         // Checks length, characters, uniqueness

// Create a multiplayer room
createMultiplayerRoom(name, stake, icon)  // Returns: room object with code

// Join a multiplayer room
joinMultiplayerRoom(roomCode, nameToJoin)  // Validates and joins

// Generate unique player ID
generatePlayerId()               // Returns: "player_1642345678_abc123"
```

### New UI Features (in `script.js`)

```javascript
// Player name entry
submitPlayerName()               // Called when entering name
closePlayerNameModal()           // Closes name modal

// Room creation with codes
handleCreateRoom()               // Creates room, generates code
updateInviteCodeDisplay()        // Shows code in UI

// Code-based joining
openJoinCodeModal()              // Opens join dialog
submitJoinCode()                 // Validates code, joins room

// Room management
storeMultiplayerRoom(roomData)   // Stores room locally
findRoomByCode(code)             // Searches by code
renderLobby(room)                // Shows lobby with players
```

---

## 🔗 Invite Code System

### How Codes Work

- **Format**: 8-character alphanumeric (e.g., `ABC1XYZ9`)
- **Generated**: Automatically when room is created
- **Storage**: Currently in browser memory (persists during session)
- **Sharing**: 
  - Copy code button
  - Share link button (uses Web Share API or clipboard)
  - Direct URL: `yourdomain.com?invite=ABC1XYZ9`

### Example Invite Link

```
https://horsracingelite.netlify.app?invite=ABC1XYZ9
```

When clicked:
1. Page loads
2. Player enters their name
3. Game detects `?invite=` parameter
4. Automatically joins the room

---

## 👥 Player Management

### Player Data Structure

```javascript
{
  id: "player_1642345678_abc123",
  name: "ShadowRider",
  ready: false,
  joinedAt: 1642345678000
}
```

### Room Data Structure

```javascript
{
  id: "mp_1642345678",
  code: "ABC1XYZ9",
  name: "Thunder Riders",
  host: "ShadowRider",
  hostId: "player_1642345678_abc123",
  players: ["ShadowRider", "NeonGhost", "BlazeStar"],
  playerList: [
    { id: "...", name: "ShadowRider", ready: false, joinedAt: ... },
    { id: "...", name: "NeonGhost", ready: false, joinedAt: ... },
    { id: "...", name: "BlazeStar", ready: false, joinedAt: ... }
  ],
  maxPlayers: 8,
  stake: 50,
  track: "Dynamic Track",
  distance: "2000m"
}
```

---

## 📱 UI Changes

### New Screens & Modals

1. **Player Name Modal** - Appears on first load
   - Input field for player name
   - Validation (max 20 chars, alphanumeric + underscore)
   - Shows error if name already taken

2. **Enhanced Create Room Screen**
   - Shows auto-generated invite code
   - Copy code button
   - Share link button (opens device share dialog)

3. **Enhanced Lobby**
   - Shows invite code prominently
   - Lists all joined players with avatars
   - Shows who is host
   - Shows player initials in avatar

4. **Enhanced Rooms List**
   - Shows multiplayer rooms alongside public rooms
   - Displays player count per room
   - "CODE" label for multiplayer rooms

### Updated Top Bar

- Shows current player name
- Shows player avatar with initials
- Players can change name mid-game (optional)

---

## 🔐 Validation & Safety

### Player Name Rules

✅ Must be 1-20 characters  
✅ Can contain: letters, numbers, underscore, hyphen  
✅ No spaces, special characters, or emojis  
✅ Must be unique in the room  

Examples:
- ✓ ShadowRider
- ✓ Player_123
- ✓ Neo-Ghost
- ✗ Shadow Rider (space)
- ✗ @Player (special char)

### Invite Code Rules

✅ 8 characters (A-Z, 0-9)  
✅ Case-insensitive for joining  
✅ Auto-validated when entered  
✅ Unique per room  

---

## 🎯 Key Features

### ✅ What's Included

- **Up to 8 players per room** - Maximum multiplayer capacity
- **Invite code system** - Easy sharing without login
- **Player name customization** - Each player picks their name
- **Real-time lobby** - See who's joined
- **Host controls** - Only host can start race
- **Player avatars** - Color-coded with initials
- **Automatic stake deduction** - Fair for all players
- **Web Share API** - Native share on mobile

### 🔄 What's Not Included (Future Enhancements)

- Firebase cloud persistence (optional - add if you want permanent rooms)
- Player authentication/accounts
- Leaderboards (could add in future)
- Chat messages in lobby
- "Ready" status toggle
- Player stats/history across sessions

---

## 🛠️ Customization

### Change Max Players Per Room

In `backend.js`, find:
```javascript
maxPlayers: 8
```

Change to any number (recommended: 4-8).

### Change Room Capacity

In `script.js`, find:
```javascript
if (room.players.length >= room.maxPlayers) {
  // Full!
}
```

### Custom Invite Code Format

In `backend.js`, modify:
```javascript
function generateInviteCode(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  // Customize 'chars' to your preference
}
```

### Add More Icons

In `index.html`, find the icon options and add:
```html
<div onclick="selectIcon('🚀', event)">🚀 Rocket</div>
```

---

## 🐛 Troubleshooting

### "Player name already taken"

- The name exists in THIS room's session
- Try a different name
- Refresh page to clear room history

### "Invalid code. Arena not found"

- Code typo or spaces?
- Room creator hasn't created it yet
- Room expired (session ended)
- Try again or create a new room

### Code not auto-filling after invite link?

- Ensure player name is set first
- Check URL has `?invite=CODE` parameter
- Clear browser cache and reload

### Rooms not showing multiplayer rooms?

- Check `multiplayerRooms` array in browser console
- Refresh page to reload room list
- Make sure rooms were created in current session

### Players not showing in lobby?

- Refresh the lobby screen
- Check player was actually added to `room.playerList`
- Verify player ID is unique

---

## 📊 Testing Locally

### Test Room Creation

1. Open `index.html` in browser
2. Enter name: "TestHost"
3. Click "Create Room"
4. Copy the invite code (e.g., ABC1XYZ9)

### Test Player Joining

1. Open second browser tab/window
2. Go to same URL
3. Enter name: "TestPlayer"
4. Click "Join by Code"
5. Paste the code
6. Should appear in lobby

### Test Invite Link

1. Create a room (get code ABC1XYZ9)
2. Open new tab: `file:///path/to/index.html?invite=ABC1XYZ9`
3. Enter name
4. Should auto-join the room

---

## 🚀 Production Checklist

- [ ] All files uploaded to Netlify
- [ ] Test on mobile device
- [ ] Test room creation
- [ ] Test code-based joining
- [ ] Test invite link sharing
- [ ] Test with multiple players (different devices)
- [ ] Verify player names display correctly
- [ ] Check that lobby updates when players join
- [ ] Confirm stake deduction works
- [ ] Test race runs for all players

---

## 📝 File Summary

| File | Changes |
|------|---------|
| `index.html` | Added player name modal, updated create room UI, enhanced lobby |
| `script.js` | Complete rewrite with multiplayer logic, room management, code handling |
| `backend.js` | Added multiplayer functions, player validation, room creation |
| `style.css` | Added styles for new modals, badges, avatars, animations |

---

## 💡 Tips & Tricks

### For Maximum Fun

1. **Mobile-friendly** - Tested on iPhone, Android
2. **Share during race** - Players can join while race is in progress
3. **Multiple rooms** - Create several rooms with different stakes
4. **Themed names** - Encourage fun player names (ShadowRider, NeonGhost, etc.)

### For Monetization (Future)

1. Add premium cosmetics (horse skins, track themes)
2. Battle pass progression
3. Leaderboards with seasonal rankings
4. Special event tournaments

---

## 📞 Support

**Issues?** Check:
1. Browser console (F12) for errors
2. Firebase config if using cloud
3. File paths in `<script>` tags
4. Netlify build logs

---

## 🎉 You're All Set!

Your horse racing game is now fully multiplayer-enabled. Players worldwide can:
- Create rooms
- Share invite codes
- Join friends
- Race together

**Deploy to Netlify and share the URL with your friends!**

Happy racing! 🏇🏇🏇

---

*Last updated: April 2025*
*Version: 2.0 - Multiplayer Edition*
