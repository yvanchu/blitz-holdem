# Blitz Hold'em — MVP Implementation Plan

This plan breaks the PRD into discrete, shippable milestones. Each milestone lists scope, deliverables, and estimated effort. The dependency order is mostly linear, but frontend and backend work can be parallelized after **M1**.

---

## Milestones Overview

| #   | Milestone             | Focus                                               | Est. Effort |
| --- | --------------------- | --------------------------------------------------- | ----------- |
| M0  | Project Bootstrap     | Repo setup, tooling, CI                             | 0.5 day     |
| M1  | Core Domain Logic     | Shared poker types & game engine (no network)       | 2 days      |
| M2  | Server Foundation     | HTTP + WebSocket server, room management            | 1.5 days    |
| M3  | Real-Time Sync        | Timer ticks, clock reconciliation, reconnect        | 1.5 days    |
| M4  | Frontend Shell        | React app, routing, table layout, mock data         | 1 day       |
| M5  | Live Play Integration | Connect client ↔ server, end-to-end hand            | 2 days      |
| M6  | Polish & Edge Cases   | Auto-fold, all-in, error states, keyboard shortcuts | 1.5 days    |
| M7  | Testing & QA          | Unit, integration, simulated latency tests          | 1 day       |
| M8  | Deployment            | Single-node deploy, HTTPS/WSS, basic telemetry      | 0.5 day     |

**Total estimate: ~11.5 dev-days** (can be compressed with parallel work).

---

## M0 — Project Bootstrap (0.5 day)

### Goals

Set up monorepo with shared code, linting, formatting, and CI skeleton.

### Deliverables

- `/packages/common` — shared types, constants, utility functions.
- `/packages/server` — Node.js backend.
- `/packages/client` — React frontend (Vite).
- Root `package.json` with workspaces; `pnpm` or `npm` workspaces.
- ESLint + Prettier config; TypeScript strict mode.
- GitHub Actions workflow: lint, typecheck, test (placeholder).

### Tasks

1. Initialize pnpm workspace and three packages.
2. Configure `tsconfig.json` (base + per-package extends).
3. Add ESLint (typescript-eslint), Prettier.
4. Create CI workflow `.github/workflows/ci.yml`.
5. Add placeholder `README.md` with setup instructions.

---

## M1 — Core Domain Logic (2 days)

### Goals

Implement poker rules and time-bank mechanics as pure, testable functions—no I/O.

### Deliverables (`packages/common`)

- `types.ts` — `Card`, `Hand`, `Player`, `TableState`, `Action`, `Street`, etc.
- `deck.ts` — `createDeck()`, `shuffle(deck)` (Fisher-Yates, crypto RNG option).
- `evaluate.ts` — 5-card hand evaluator (can use existing lib or simple algo).
- `engine.ts` — `GameEngine` class or pure reducer:
  - `startHand(state)` — post blinds, deal hole cards.
  - `applyAction(state, action)` — validate, mutate pot/banks/street.
  - `advanceStreet(state)` — deal community cards, reset betting round.
  - `resolveShowdown(state)` — compare hands, award pot.
- `timer.ts` — helpers: `drainTime(player, elapsed)`, `isTimeout(player)`.
- Unit tests for engine edge cases (fold, all-in, min raise, timeout).

### Key Decisions

- State is immutable; functions return new state.
- Engine does **not** manage real-time clock; caller provides elapsed ms.

---

## M2 — Server Foundation (1.5 days)

### Goals

Stand up HTTP + WebSocket server with room/table management.

### Deliverables (`packages/server`)

- `index.ts` — Express (or Fastify) HTTP server; health endpoint.
- `ws.ts` — WebSocket upgrade handler (use `ws` library).
- `room.ts` — `RoomManager`:
  - `createRoom(settings): roomId`
  - `joinRoom(roomId, socket)`
  - `leaveRoom(roomId, socket)`
- `table.ts` — `TableController`:
  - Wraps `GameEngine`.
  - Manages seat assignments, ready state.
  - Exposes `handleMessage(socket, msg)`.
- Message protocol (`packages/common/protocol.ts`):
  - `C2S` (client→server): `JOIN`, `READY`, `ACTION`, `PING`.
  - `S2C` (server→client): `ROOM_STATE`, `HAND_START`, `TURN`, `TICK`, `RESULT`, `ERROR`, `PONG`.
- Basic logging (console) with timestamps.

### Tasks

1. Scaffold Express + ws server.
2. Implement `RoomManager` with in-memory Map.
3. Implement `TableController` integrating engine.
4. Define and export message types; add validation (zod or manual).
5. Write integration test: two mock clients complete a hand.

---

## M3 — Real-Time Sync (1.5 days)

### Goals

Server-authoritative timer ticks, clock drift handling, reconnect logic.

### Deliverables

- Server `TickLoop`:
  - Runs at configurable Hz (default 6).
  - Drains active player's time bank.
  - Broadcasts `TICK` with `{ activePlayer, remainingMs, serverTime }`.
  - Triggers auto-check/fold on timeout.
- Client clock reconciliation:
  - Track `serverTime` offset on each message.
  - Interpolate countdown locally between ticks.
- Reconnect flow:
  - On reconnect, server sends full `ROOM_STATE` snapshot.
  - Client rebuilds UI from snapshot.
- Disconnect grace:
  - Mark socket as disconnected; continue tick loop.
  - After grace period, auto-fold if still disconnected.

### Tasks

1. Implement `setInterval` tick loop in `TableController`.
2. Broadcast `TICK` messages; include monotonic server timestamp.
3. Add disconnect detection (socket `close` event) and grace timer.
4. Write tests simulating disconnect mid-turn.

---

## M4 — Frontend Shell (1 day)

### Goals

Scaffold React app with routing, table UI, and mock/static data.

### Deliverables (`packages/client`)

- Vite + React + TypeScript setup.
- Pages:
  - `/` — Home: Create Table button → generates link.
  - `/table/:roomId` — Table view.
- Components:
  - `<Table>` — layout: seats, community cards, pot.
  - `<Seat>` — player info, hole cards (hidden/revealed), time bank display.
  - `<ActionBar>` — Check, Call, Bet slider/input, Fold, All-in.
  - `<Timer>` — animated countdown.
- State: Zustand store with mock `TableState`.
- Styling: TailwindCSS; dark theme; responsive.

### Tasks

1. Init Vite React-TS project; add Tailwind.
2. Create page routing (react-router).
3. Build component tree with placeholder data.
4. Wire Zustand store; render mock hand.

---

## M5 — Live Play Integration (2 days)

### Goals

Connect frontend to backend; play a full hand end-to-end.

### Deliverables

- `useSocket` hook:
  - Connects to WSS on mount.
  - Dispatches incoming messages to Zustand store.
  - Exposes `send(msg)` function.
- Store actions:
  - `setRoomState`, `applyTick`, `applyResult`, `setError`.
- UI wiring:
  - `<ActionBar>` calls `send({ type: 'ACTION', ... })`.
  - Disable buttons when not player's turn or insufficient time.
- Server adjustments:
  - Send hole cards only to owning player.
  - Broadcast community cards to both.
- Manual QA: two browser tabs play a hand.

### Tasks

1. Implement WebSocket client hook.
2. Map `S2C` messages to store mutations.
3. Wire action buttons to `C2S` messages.
4. Test with two tabs; fix timing/ordering bugs.

---

## M6 — Polish & Edge Cases (1.5 days)

### Goals

Handle all edge cases from PRD; improve UX.

### Deliverables

- Auto-check when time expires and check is legal.
- Auto-fold when time expires and bet is required.
- All-in flow: instant commit, deal remaining streets if both all-in.
- Minimum raise enforcement; error toast on invalid bet.
- Keyboard shortcuts: `C`, `B`, `F`, `A`.
- Accessibility pass: focus rings, ARIA labels, screen-reader announcements.
- Error boundary; graceful disconnect UI ("Reconnecting...").

### Tasks

1. Audit engine for edge cases; add missing branches.
2. Add keyboard event handlers.
3. Implement toast notifications (e.g., react-hot-toast).
4. Add disconnect overlay with auto-reconnect.
5. Accessibility audit; fix contrast issues.

---

## M7 — Testing & QA (1 day)

### Goals

Confidence via automated tests and manual QA.

### Deliverables

- Unit tests:
  - `common/engine.test.ts` — rule permutations.
  - `common/evaluate.test.ts` — hand ranking.
- Integration tests:
  - `server/integration.test.ts` — mock WS clients, full hand.
- End-to-end (optional):
  - Playwright script: two browser contexts play a hand.
- Simulated latency tests:
  - Inject artificial delay; verify clock reconciliation.

### Tasks

1. Expand unit test coverage to >80% for engine.
2. Write integration test harness with mock sockets.
3. (Stretch) Add Playwright E2E script.
4. Document test commands in README.

---

## M8 — Deployment (0.5 day)

### Goals

Ship MVP to a publicly accessible URL.

### Deliverables

- Single Docker image (Node server serves static client build).
- Deploy to Fly.io / Render / Railway (single instance).
- HTTPS + WSS via platform TLS.
- Environment variables for config (blinds, tick rate, etc.).
- Basic telemetry: log hand count, avg decision time to stdout; collect via platform logs.

### Tasks

1. Create `Dockerfile` (multi-stage: build client, bundle server).
2. Add `fly.toml` or platform config.
3. Deploy; smoke test with two devices.
4. Document deploy steps in README.

---

## Directory Structure (Target)

```
blitz-holdem/
├── docs/
│   ├── prd.md
│   └── implementation-plan.md
├── packages/
│   ├── common/          # Shared types, engine, protocol
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   ├── deck.ts
│   │   │   ├── evaluate.ts
│   │   │   ├── engine.ts
│   │   │   ├── timer.ts
│   │   │   └── protocol.ts
│   │   ├── tests/
│   │   └── package.json
│   ├── server/          # Node.js backend
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── ws.ts
│   │   │   ├── room.ts
│   │   │   └── table.ts
│   │   ├── tests/
│   │   └── package.json
│   └── client/          # React frontend
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── pages/
│       │   ├── components/
│       │   ├── hooks/
│       │   └── store/
│       ├── index.html
│       └── package.json
├── .github/
│   └── workflows/
│       └── ci.yml
├── Dockerfile
├── package.json         # Workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md
```

---

## Risk & Mitigation

| Risk                               | Mitigation                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| Hand evaluator complexity          | Use proven library (e.g., `pokersolver`) or well-tested algo.                              |
| Clock drift causes unfair outcomes | Server is authoritative; client only interpolates. Include server timestamp in every tick. |
| WebSocket reliability              | Implement heartbeat (ping/pong) and auto-reconnect with exponential backoff.               |
| Scope creep                        | Strict MVP scope; defer ranked, replays, cosmetics.                                        |

---

## Success Metrics (MVP)

- Two players can complete 10 consecutive hands without crashes.
- Median action latency <200ms under simulated 100ms RTT.
- No reported timing exploits during closed beta.
- > 90% unit test coverage on engine.

---

## Next Steps

1. **Kickoff M0**: Bootstrap repo, install tooling.
2. **Parallel work**: One dev on M1 (engine), one on M4 (frontend shell) after M0.
3. **Integrate**: Merge at M5; joint QA.
4. **Ship**: Deploy M8; invite beta testers.
