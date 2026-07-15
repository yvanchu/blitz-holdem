# 💥 Bullet Poker

A heads-up no-limit Texas Hold'em poker variant where you bet with **time** instead of chips. Every second you spend thinking drains your time bank!

## 🎮 How It Works

- Each player starts with a time bank (default: 300 seconds)
- On your turn, your time bank counts down in real-time
- Bets, calls, and raises commit seconds from your time bank to the pot
- The winner of each hand receives the pot (in seconds) added to their time bank
- Run out of time? You're all-in for zero — you still contest whatever you've already matched!

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)

### Setup

```bash
# Install dependencies
pnpm install

# Start development servers (runs both server and client)
pnpm dev
```

The client will be available at `http://localhost:5173` and the server at `http://localhost:3001`.

### Playing

1. Open `http://localhost:5173` in a browser
2. Enter your name and click "Create Table"
3. Copy the URL and share it with a friend (or open in another browser tab)
4. Both players click "Ready to Play"
5. Play poker! ♠️♥️♣️♦️

## 📁 Project Structure

```
bullet-poker/
├── packages/
│   ├── common/          # Shared types, engine, protocol
│   │   ├── src/
│   │   │   ├── types.ts     # Core type definitions
│   │   │   ├── deck.ts      # Deck utilities
│   │   │   ├── evaluate.ts  # Hand evaluator
│   │   │   ├── engine.ts    # Game engine
│   │   │   ├── timer.ts     # Time bank utilities
│   │   │   └── protocol.ts  # WebSocket message types
│   ├── server/          # Node.js backend
│   │   ├── src/
│   │   │   ├── index.ts     # Express + WS server
│   │   │   ├── ws.ts        # WebSocket handler
│   │   │   ├── room.ts      # Room manager
│   │   │   └── table.ts     # Table controller
│   ├── client/          # React frontend
│   │   ├── src/
│   │   │   ├── pages/       # Home & Table pages
│   │   │   ├── components/  # UI components
│   │   │   ├── hooks/       # Custom hooks
│   │   │   └── store/       # Zustand store
│   └── e2e/             # Playwright E2E tests
│       ├── fixtures/        # Page Object Models
│       └── tests/           # Test specs
├── docs/
│   ├── prd.md               # Product Requirements
│   ├── testing.md           # Test Coverage Guide
│   └── implementation-plan.md
└── README.md
```

## 🎯 Game Rules

### Blinds

- Small Blind: 1 second (posted by dealer in heads-up)
- Big Blind: 2 seconds

### Betting

- All betting uses seconds as currency
- Minimum bet/raise follows standard no-limit rules
- All-in commits your entire remaining time bank

### Time Drain

- Your time bank decreases in real-time while it's your turn
- Time only drains during your decision; it pauses when opponent is acting
- Pot seconds are awarded to the winner

### Auto-Actions

- If your time reaches 0, you're **all-in for zero additional seconds** (table stakes) — you are not folded
- You still contest the pot you've already matched; your opponent's uncalled bet is refunded
- If your time reaches 0 and you can check, you effectively check and stay in the hand
- A disconnection doesn't auto-fold either — a disconnected player's clock keeps draining and, if it hits 0, they're all-in for zero (same as a timeout)

## 🛠️ Development

### Commands

```bash
# Run linter
pnpm lint

# Type check
pnpm typecheck

# Run all tests
pnpm test

# Run specific test suites
pnpm --filter @bullet-poker/common test    # Unit tests (engine, deck, timer)
pnpm --filter @bullet-poker/server test    # Server + integration tests
pnpm --filter @bullet-poker/client test    # Component tests

# E2E tests (requires Playwright)
pnpm --filter e2e test                     # Headless
pnpm --filter e2e test:headed              # With browser visible
pnpm --filter e2e test:debug               # Debug mode

# Build for production
pnpm build
```

### Testing

We have comprehensive test coverage across all packages:

| Package | Tests | Coverage                           |
| ------- | ----- | ---------------------------------- |
| common  | 34    | Engine, deck, timer, evaluation    |
| server  | 80    | WebSocket, game flow, reconnection |
| client  | 183   | Components, store, formatters      |
| e2e     | 38    | Full user flows with Playwright    |

See [docs/testing.md](docs/testing.md) for detailed test coverage information.

### Tech Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS, Zustand
- **Backend**: Node.js, Express, WebSocket (ws)
- **Shared**: TypeScript
- **Testing**: Vitest, React Testing Library, Playwright

## ⌨️ Keyboard Shortcuts

| Key   | Action                                   |
| ----- | ---------------------------------------- |
| F     | Fold                                     |
| C     | Call (or Check if no bet)                |
| K     | Check                                    |
| R     | Bet / Raise (opens panel, focuses input) |
| A     | Toggle Auto All-In                       |
| S     | Show Cards (after hand ends)             |
| Enter | Submit bet/raise                         |
| Esc   | Close raise panel                        |

## 📄 License

MIT
