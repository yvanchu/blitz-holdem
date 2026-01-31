# Blitz Hold'em — Development Progress

## Current Status: MVP Playable

**Last Updated:** January 29, 2026

---

## Milestone Progress

| Milestone                 | Status      | Notes                                      |
| ------------------------- | ----------- | ------------------------------------------ |
| M0: Project Bootstrap     | Complete    | Monorepo, ESLint, TypeScript, CI           |
| M1: Core Domain Logic     | Complete    | Types, deck, evaluator, engine, timer      |
| M2: Server Foundation     | Complete    | Express, WebSocket, room/table management  |
| M3: Real-Time Sync        | Complete    | Tick loop, time drain, reconnect logic     |
| M4: Frontend Shell        | Complete    | React, Vite, Tailwind, routing, components |
| M5: Live Play Integration | Complete    | WebSocket fixed, room creation works       |
| M6: Polish & Edge Cases   | Not Started |                                            |
| M7: Testing & QA          | Not Started |                                            |
| M8: Deployment            | Not Started |                                            |

---

## Resolved Issues

### Issue #1: WebSocket Connection Fails in Browser

**Status:** FIXED  
**Reported:** 2026-01-29  
**Resolved:** 2026-01-29  
**Symptom:** After creating a table and navigating to `/table/:roomId`, the page shows "Connection Error"

**Root Cause:**
The `useSocket` hook had a dependency array issue. The `useEffect` depended on `[connect, send]`, but `connect` was a `useCallback` that depended on `store`. When store state changed, it recreated `connect`, triggering effect cleanup which closed the WebSocket, causing a reconnect loop.

**Fix Applied:**

- Removed `store` from dependencies by using `useGameStore.getState()` directly
- Changed to empty dependency array `[]` so effect only runs once on mount
- Added `isConnecting` ref to prevent multiple simultaneous connections
- Separated ping into its own `useEffect`

---

## Todos

### High Priority

- [x] Fix WebSocket connection issue (#1)
- [ ] Verify end-to-end hand completion
- [ ] Test two-player gameplay
- [ ] **CLEANUP**: Remove `allowedHosts: ['all']` from vite.config.ts before production (added for ngrok testing)

### Medium Priority

- [ ] Add unit tests for game engine
- [ ] Add integration tests for server
- [ ] Implement auto-check on timeout when check is valid
- [ ] Implement proper all-in showdown (deal remaining streets)

### Low Priority

- [ ] Add sound effects
- [ ] Add animations for card dealing
- [ ] Add hand history display
- [ ] Mobile responsive improvements

---

## Completed Features

### Core Game Logic

- [x] Card deck creation and shuffle (Fisher-Yates with crypto RNG)
- [x] Hand evaluation (all poker hands: high card to royal flush)
- [x] Game engine state machine (streets, betting rounds)
- [x] Time bank mechanics (drain on turn, commit on bet/call)
- [x] Blinds posting (SB/BB)
- [x] Valid action calculation (fold, check, call, bet, raise, all-in)

### Server

- [x] Express HTTP server with health endpoint
- [x] Room creation API (`POST /api/rooms`)
- [x] Room lookup API (`GET /api/rooms/:roomId`)
- [x] WebSocket server with room/table management
- [x] Player join/leave handling
- [x] Ready state management
- [x] Game state broadcasting
- [x] Tick loop for time drain (6 Hz)
- [x] Disconnect grace period handling

### Client

- [x] Home page with table creation
- [x] Table page with game UI
- [x] Seat component with player info
- [x] Card component (face up / face down)
- [x] Timer component with color warnings
- [x] Action bar with bet slider
- [x] Keyboard shortcuts (F/C/B/A)
- [x] Waiting room before game starts
- [x] Result overlay after hand
- [x] Zustand store for game state
- [x] WebSocket hook with reconnection logic

---

## Technical Decisions

| Decision           | Choice                | Rationale                           |
| ------------------ | --------------------- | ----------------------------------- |
| Package Manager    | pnpm workspaces       | Fast, efficient disk usage          |
| Frontend Framework | React + Vite          | Fast dev experience, modern tooling |
| State Management   | Zustand               | Lightweight, simple API             |
| Styling            | TailwindCSS           | Utility-first, rapid prototyping    |
| Backend Runtime    | Node.js + tsx         | TypeScript support, fast reload     |
| WebSocket Library  | ws                    | Lightweight, no Socket.IO overhead  |
| Hand Evaluator     | Custom implementation | Avoid external dependencies         |

---

## Testing Notes

### Manual Testing Checklist

- [x] Create table from home page
- [ ] Join table via shared link
- [ ] Both players ready up
- [ ] Hand starts with correct blinds
- [ ] Time drains on active player's turn
- [ ] All betting actions work (fold, check, call, bet, raise, all-in)
- [ ] Community cards dealt correctly (flop, turn, river)
- [ ] Showdown determines correct winner
- [ ] Pot awarded to winner
- [ ] Next hand starts automatically
- [ ] Disconnect/reconnect works

---

## Session Log

### 2026-01-29

- Created PRD and implementation plan
- Scaffolded monorepo with pnpm workspaces
- Implemented full game engine with hand evaluator
- Built Express + WebSocket server
- Built React frontend with all core components
- **Issue:** WebSocket connection fails in browser - FIXED
  - Root cause: useEffect dependency array causing reconnect loop
  - Fix: Use `useGameStore.getState()` and empty dependency array
- Room creation verified working
