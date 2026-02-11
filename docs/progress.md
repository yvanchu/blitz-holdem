# Bullet Poker — Development Progress

## Current Status: MVP Complete - Pre-Release

**Last Updated:** February 10, 2026

---

## Milestone Progress

| Milestone                 | Status      | Notes                                          |
| ------------------------- | ----------- | ---------------------------------------------- |
| M0: Project Bootstrap     | ✅ Complete | Monorepo, ESLint, TypeScript, CI               |
| M1: Core Domain Logic     | ✅ Complete | Types, deck, evaluator, engine, timer          |
| M2: Server Foundation     | ✅ Complete | Express, WebSocket, room/table management      |
| M3: Real-Time Sync        | ✅ Complete | Tick loop, time drain, reconnect logic         |
| M4: Frontend Shell        | ✅ Complete | React, Vite, Tailwind, routing, components     |
| M5: Live Play Integration | ✅ Complete | WebSocket, room creation, full game flow       |
| M6: Polish & Edge Cases   | ✅ Complete | All-in showdown, show cards, UI improvements   |
| M7: Testing & QA          | 🟡 Partial  | Unit tests exist, needs more integration tests |
| M8: Deployment            | ✅ Complete | Railway deployment, CI/CD pipeline working     |

---

## Pre-Release Checklist

### Critical (Must Fix Before Public Release)

- [x] **SECURITY**: Remove `allowedHosts: ['all']` from vite.config.ts (added for ngrok testing)
- [ ] **SECURITY**: Add Zod validation for all incoming WebSocket messages (currently raw `JSON.parse` + `as` cast, no runtime validation)
- [ ] **SECURITY**: Replace alias-based reconnection with a secret reconnect token (current system allows session hijacking by guessing alias)
- [ ] **SECURITY**: Set `maxPayload` on WebSocketServer (no limit = DoS via oversized messages)
- [ ] End-to-end testing with real users (2-player full game)
- [x] Error handling for edge cases (network drops mid-hand, etc.)

### Important (Should Fix or implement)

- [ ] **SECURITY**: Add rate limiting + room cap on `POST /api/rooms` (unbounded room creation = memory DoS)
- [ ] **SECURITY**: Implement room TTL / reaper (rooms are never cleaned up, `deleteRoom` is never called)
- [ ] **SECURITY**: Restrict CORS from wildcard `*` to actual client origins
- [ ] **SECURITY**: Validate WebSocket `Origin` header against allowlist
- [ ] **UX**: Add spatial separation for Fold button (UX doc requires "Fold Zone" with extra whitespace, currently adjacent to Check)
- [ ] **UX**: Increase timer font size (currently `text-xs sm:text-sm` ~12-14px, UX doc specifies 16-20px bold)
- [ ] **UX**: Make ResultOverlay non-blocking (currently a full-screen modal, violates "no modal dialogs during gameplay" rule)
- [ ] **UX**: Use amber color for Raise/Bet button (currently green like Check/Call, violates color language spec)
- [x] Add loading states for network operations
- [x] Add error messages for failed actions
- [ ] Mobile testing on real devices (iOS Safari, Android Chrome)
- [x] Handle browser back button gracefully
- [x] Rematch button
- [x] Victory counter (for each game not hand)
- [x] Basic text based hand history for the session

### Medium Priority

- [ ] **SECURITY**: Sanitize aliases on join (only truncated on update, not on initial join; potential XSS)
- [ ] **SECURITY**: Validate `action` type against ActionType enum before passing to engine
- [ ] **SECURITY**: Add upper bounds to settings values (smallBlind, bigBlind, initialTimeBank)
- [ ] **SECURITY**: Stop leaking player IDs to opponents in `PlayerPublic`
- [ ] **SECURITY**: Remove or restrict `force` start option (bypasses opponent ready check)
- [ ] **UX**: Add card dealing animations (subtle slide + fade, per UX doc)
- [ ] **UX**: Fix background color to match UX spec (`#0D1F12` deep forest green, current felt `#0d5c2e` is too saturated)
- [ ] **UX**: Add copy-link success feedback (currently no toast or button text change after clipboard copy)
- [ ] **UX**: Add last-action indicator ("Opponent checked", "Opponent raised to 12s") for clarity
- [ ] **UX**: Add `prefers-reduced-motion` media query support (required by UX accessibility spec)

### Nice to Have (Post-Launch)

- [ ] **SECURITY**: Fix CSPRNG modulo bias in card shuffle (`Uint32 % max`)
- [ ] **SECURITY**: Replace `console.log` with structured logger, redact sensitive fields in prod
- [ ] **SECURITY**: Add `helmet` middleware for HTTP security headers
- [ ] **SECURITY**: Set `express.json({ limit: '1kb' })` to cap request body size
- [ ] **UX**: Show hand number during play (e.g., "Hand #5")
- [ ] **UX**: Add ARIA labels to action buttons (accessibility requirement)
- [ ] **UX**: Remove unused `GameOverOverlay` component (dead code, superseded by inline game-over state in Table)
- [ ] **UX**: Show calculated values in bet presets (e.g., "33% (4s)" instead of just "33%")
- [ ] **UX**: Add lobby → game transition animation (dealing feel when host clicks Start)
- [ ] **UX**: Make empty community card slots more visible (currently `border-white/20` is nearly invisible on felt)
- [ ] Integration tests
- [ ] Add sound effects (optional, mutable)
- [ ] Add hand history display
- [ ] Add equity calculation during all-in runout
- [ ] Landing page / how-to-play guide

---

## Completed Features

### Core Game Logic

- [x] Card deck creation and shuffle (Fisher-Yates with crypto RNG)
- [x] Hand evaluation (all poker hands: high card to royal flush)
- [x] Game engine state machine (streets, betting rounds)
- [x] Time bank mechanics (drain on turn, commit on bet/call)
- [x] Blinds posting (SB/BB)
- [x] Valid action calculation (fold, check, call, bet, raise, all-in)
- [x] All-in showdown with street runout (flop → turn → river → result)
- [x] Automatic card reveal when both players all-in

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
- [x] Show cards feature (voluntary card reveal after fold)
- [x] ALL_IN_SHOWDOWN broadcast (reveals both hands)

### Client

- [x] Home page with table creation
- [x] Table page with game UI
- [x] Seat component with player info
- [x] Card component (face up / face down)
- [x] Timer component with digital font and color warnings
- [x] Action bar with bet slider and presets (33%, 75%, 150%, MAX)
- [x] Keyboard shortcuts (F/C/B/A)
- [x] Inline ready state (no separate waiting room)
- [x] Result display with winner highlight
- [x] Zustand store for game state
- [x] WebSocket hook with reconnection logic
- [x] Mobile responsive layout
- [x] "Show Cards" button after hand ends
- [x] Auto-clamp raise to all-in when exceeding max
- [x] Stable table layout (prevents card bouncing)
- [x] Game over overlay with victory/defeat state
- [x] Session wins counter (tracks games won)
- [x] Rematch functionality (resets time banks)
- [x] Error messages for failed actions
- [x] Browser back button warning during game
- [x] Disconnected player indicator
- [x] Hand History with OHH format export and sharing

### UI/UX Polish

- [x] Dark green felt background
- [x] Digital/mono font for time banks and pot
- [x] Color-coded actions (green=safe, red=fold, amber=raise)
- [x] Bet chips positioned between players and pot
- [x] Winning cards highlighted with golden glow
- [x] Active player indicator (glowing border)
- [x] All-in and Fold badges

### Deployment

- [x] Railway deployment (client + server)
- [x] GitHub Actions CI pipeline
- [x] Environment variable configuration
- [x] Production build working

### Testing

- [x] Unit tests for game engine (10 tests)
- [x] Unit tests for hand evaluator (20 tests)
- [x] Unit tests for timer mechanics (17 tests)
- [x] Server tests for lobby and show cards (20 tests)
- [x] Client tests for hand history store and formatter (73 tests)
- [x] Pre-push hooks (typecheck, lint, test, build)

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
- [x] Join table via shared link
- [x] Both players ready up
- [x] Hand starts with correct blinds
- [x] Time drains on active player's turn
- [x] All betting actions work (fold, check, call, bet, raise, all-in)
- [x] Community cards dealt correctly (flop, turn, river)
- [x] Showdown determines correct winner
- [x] Pot awarded to winner
- [x] Next hand starts automatically
- [ ] Disconnect/reconnect works (needs verification)
- [x] All-in runout reveals both hands
- [x] Show cards feature works after fold

### Automated Tests

- **Common package**: 46 tests passing (deck, evaluator, engine, timer)
- **Server package**: 4 tests passing (show cards feature)
- **Client package**: No tests yet (visual components)

---

## Known Issues

### Issue #1: WebSocket Connection Loop (RESOLVED)

**Status:** FIXED  
**Resolved:** 2026-01-29

Root cause was `useEffect` dependency array causing reconnect loop. Fixed by using `useGameStore.getState()` directly.

### Issue #2: Show Cards Not Displaying to Opponent (RESOLVED)

**Status:** FIXED  
**Resolved:** 2026-02-05

The `shouldShowCards` condition required `result.showdown` to be true, but voluntary card showing happens when `showdown` is false. Fixed condition to check `!!revealedCards` instead.

---

## Session Log

### 2026-02-10

- **UX audit** of full frontend flow against UX design spec
- Found 5 high-impact issues: Fold button lacks spatial separation (misclick risk), timer font too small for core mechanic, ResultOverlay is a blocking modal (violates anti-pattern), Raise/Bet uses green instead of amber (wrong color language), no card dealing animations
- Found 5 medium-impact issues: no `prefers-reduced-motion` support, no copy-link feedback, no last-action indicator, background color doesn't match spec (#0d5c2e vs #0D1F12), empty board slots nearly invisible
- Found 5 polish items: hand number not shown during play, no ARIA labels on action buttons, unused GameOverOverlay component (dead code), bet preset labels ambiguous, inconsistent alias input flow between owner/joiner
- Added all findings to Pre-Release Checklist with priority tiers
- **Security audit** of full codebase (server focus)
- Found 3 critical issues: no WS input validation (Zod unused), alias-only reconnection (hijackable), no WS message size limit (DoS)
- Found 4 high-severity issues: unbounded room creation, rooms never reaped, wildcard CORS, no WS origin checking
- Found 5 medium issues: alias not sanitized on join, action type not pre-validated, no upper bounds on settings, player IDs leaked, force-start bypass
- Found 4 low-severity items: CSPRNG modulo bias in shuffle, sensitive data in logs, no helmet, no JSON body limit
- Added all findings to Pre-Release Checklist with priority tiers

### 2026-02-07

- Fixed `allowedHosts: ['all']` security issue in vite.config.ts
- Added disconnected player indicator (grayed out with "Disconnected" badge)
- Added error messages for failed room creation on HomePage
- Improved error UI on TablePage with "Back to Home" button
- Added browser back button warning when game in progress
- Implemented game over detection (GAME_OVER message when time runs out)
- Added GameOverOverlay component with victory/defeat UI
- Implemented session wins tracking (games won per player)
- Added rematch functionality (resets time banks, returns to lobby state)
- Fixed rematch to properly reset game state (community cards, street, pot cleared)
- Added in-game session wins badge (yellow circle on player info)

### 2026-02-07

- **Fixed split pot bug**: Pot was incorrectly being awarded to player 0 on ties (had "for MVP, give to player 0" comment)
- Added proper `endHandSplit()` function that splits pot evenly, odd chip goes to out-of-position player
- Extended `HandResult` type with `isSplit` and `splitWinners` fields
- **Implemented Hand History feature**:
  - Added `open-hand-tracker` library for OHH format compliance
  - Created `handHistoryStore.ts` with full hand recording (actions, streets, revealed cards)
  - Created `handHistoryFormatter.ts` for plain text and structured display
  - Added `HandHistoryButton` with text label and hand count badge
  - Added `HandHistoryModal` for browsing/sharing/exporting hands
  - Integrated recording into WebSocket message handlers
  - Full split pot support in hand history display
- **UI cleanup**:
  - Removed redundant "Review Hands" center table button
  - Removed Leave buttons (users can use browser navigation)
  - Removed "Opponent ran out of time" text from result overlay
  - Hand History button only shows after first hand is played
- Added 73 new client tests (hand history store + formatter)
- Added split pot engine test
- Total tests: 140 passing (47 common + 20 server + 73 client)

### 2026-02-05 / 2026-02-06

- Added "Show Cards" feature (voluntary reveal after fold)
- Fixed show cards not displaying to opponent
- Added ALL_IN_SHOWDOWN message to reveal both hands when all-in
- Added server tests for show cards feature
- UI polish: digital font for timers/pot, raise presets (33/75/150/MAX)
- Fixed CI: updated pnpm version 8 → 10 to match lockfile v9
- Created UX design principles document
- Removed separate waiting room (inline ready state)

### 2026-01-30 - 2026-02-04

- Deployed to Railway (client + server services)
- Fixed production API calls with VITE_API_URL
- Fixed all-in mechanics and showdown runout
- Major UI redesign: green background, better raise UX
- Responsive layout improvements for mobile
- Fixed card bouncing with stable table height
- Added bet chip positioning (opponent below, yours above)
- Auto-clamp raise to all-in when exceeding max

### 2026-01-29

- Created PRD and implementation plan
- Scaffolded monorepo with pnpm workspaces
- Implemented full game engine with hand evaluator
- Built Express + WebSocket server
- Built React frontend with all core components
- Fixed WebSocket connection loop issue
- Room creation verified working
