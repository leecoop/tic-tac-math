# Tic-Tac-Math Multiplayer Enhancement - Product Requirements

## Overview

Transform the existing single-player (offline 2-player) Tic-Tac-Math game into an online multiplayer game where two players can compete remotely over the internet.

---

## 1. Problem Statement

**Current State:**
- Game supports only 2 players on the same device
- No way to play with remote opponents

**Desired State:**
- Players can create private game rooms
- Players can join existing rooms via room code or shareable link
- Real-time gameplay with synchronized state between players
- Host controls game logic (authoritative)

---

## 2. Technical Architecture

### 2.1 Server Requirements

**Server Type:** Node.js with combined HTTP + WebSocket

**Core Responsibilities:**
1. **Static File Hosting** - Serve the HTML/CSS/JS files
2. **WebSocket Signaling** - Handle room management and relay WebRTC signaling
3. **Port:** 8080 (configurable via environment variable)

**Dependencies:**
- Node.js built-in: `http`, `fs`, `path`
- External package: `ws` (WebSocket library)

### 2.2 Client-Side Architecture

**Connection Flow:**
```
[Player A (Host)] ←WebSocket→ [Server] ←WebSocket→ [Player B (Joiner)]
                    ↕ (signaling)
[Player A] ←WebRTC DataChannel→ [Player B] (direct P2P)
```

**Key Technologies:**
- **WebSocket** - Initial connection, room creation/joining, WebRTC signaling relay
- **WebRTC** - Peer-to-peer data channel for game state synchronization
- **STUN Server** - Google public STUN (`stun:stun.l.google.com:19302`) for NAT traversal

---

## 3. Functional Requirements

### 3.1 Room Management

**FR-1: Create Room**
- Player clicks "Create New Room" button
- System generates unique 6-character alphanumeric room code
- Code excludes visually similar characters (0, O, 1, I)
- Room code displayed on screen for sharing

**FR-2: Join Room**
- Player enters room code OR clicks shared link
- System validates room exists and has space (max 2 players)
- If room full or not found, show error message

**FR-3: Share Room**
- Display room code on screen
- Provide "Copy Link" button that generates URL with `?room=CODE` parameter
- URL parameter auto-joins room when page loads

### 3.2 Online Game Flow

**FR-4: Connection Establishment**
- Both players connect via WebSocket to signaling server
- Server introduces players to each other
- Players establish direct WebRTC peer connection
- Data channel opens for game state transmission

**FR-5: Host Authority**
- Host (creator) is authoritative for game state
- Host generates all math problems
- Host runs all game logic (winner detection, score tracking)
- Host syncs complete state to joiner after every action

**FR-6: Game State Synchronization**
- State synced after: cell selection, move finalization, round reset
- Synced data includes: board, current player, scores, pending move, current problem, locked status
- Joiner simply renders received state (no local game logic)

**FR-7: Disconnection Handling**
- Detect when opponent disconnects
- Show appropriate message
- Clean up connections and return to menu

### 3.3 User Interface Requirements

**FR-8: Online Menu**
- Accessible via "Online Game" button
- Options: Create Room, Join Room (with input field)
- Modal overlay with close button

**FR-9: Waiting Screen**
- Show room code for host to share
- Show shareable link with copy button
- Display "waiting for opponent" message

**FR-10: Connected Status**
- Show connection status indicator (connecting/connected)
- Display "Opponent Connected" when ready
- "Start Game" button to begin

---

## 4. Server API Specification

### WebSocket Message Types (Client → Server)

| Type | Payload | Description |
|------|---------|-------------|
| `createRoom` | `{}` | Request new room creation |
| `joinRoom` | `{ roomCode: string }` | Join existing room |
| `offer` | `{ sdp: object }` | WebRTC SDP offer |
| `answer` | `{ sdp: object }` | WebRTC SDP answer |
| `iceCandidate` | `{ candidate: object }` | WebRTC ICE candidate |
| `gameState` | `{ state: object }` | Game state (relay to peer) |

### WebSocket Message Types (Server → Client)

| Type | Payload | Description |
|------|---------|-------------|
| `roomCreated` | `{ roomCode: string }` | Room created successfully |
| `roomJoined` | `{ roomCode: string }` | Joined room successfully |
| `error` | `{ message: string }` | Error message |
| `peerConnected` | `{}` | Opponent has joined |
| `peerDisconnected` | `{}` | Opponent disconnected |
| `offer` / `answer` / `iceCandidate` | (relay) | WebRTC signaling |
| `gameState` | `{ state: object }` | Synced game state |

---

## 5. Game State Specification

### State Object Structure

```javascript
{
  board: Array(9),           // ['', 'X', '', 'O', ...]
  currentPlayer: 'X',        // 'X' or 'O'
  scores: { X: 0, O: 0 },    // win counts
  pendingMove: {            // move in progress
    index: number,
    player: 'X' | 'O'
  },
  currentProblem: {         // active math problem
    text: string,
    answer: string,
    type: 'number' | 'fraction'
  },
  locked: boolean           // game over state
}
```

---

## 6. Security & Performance Considerations

### Security

- No authentication required (casual game)
- Room codes are randomly generated (6 chars, ~1M possible combinations)
- Host is authoritative to prevent client-side cheating

### Performance

- Game state is small (<1KB), suitable for WebRTC DataChannel
- Direct P2P connection minimizes latency
- No game state stored on server (stateless relay)

---

## 7. Deployment Requirements

### Development Environment
- Run `node server.js` from project directory
- Access via `http://localhost:8080`
- Requires `npm install ws` for WebSocket library

### Production Environment
- **Frontend:** Any static hosting (GitHub Pages, Vercel, Netlify)
- **Server:** Platform with WebSocket support (Railway, Render, Heroku)
- **WebSocket URL:** Must be accessible from client (wss:// for HTTPS)

---

## 8. Acceptance Criteria

| ID | Criteria | Test Method |
|----|----------|-------------|
| AC-1 | Two players can create/join room and see each other's connection | Manual test with two browser tabs |
| AC-2 | Room code can be shared via URL with auto-join | Click link, verify auto-join |
| AC-3 | Host's board updates reflect on joiner's screen | Play game, verify sync |
| AC-4 | Math problems are synced (same problem on both screens) | Select cell, verify both see problem |
| AC-5 | Winner detection works for both players | Win game, verify both see winner |
| AC-6 | Disconnection shows message and returns to menu | Close one tab, check other |
| AC-7 | Works over HTTPS in production | Deploy and test with secure connection |

---

## 9. Out of Scope (v1)

- Authentication / user accounts
- Matchmaking / ranked play
- Chat functionality
- Spectator mode
- Multiple games simultaneously
- Mobile app