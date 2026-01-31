# ⚡ Blitz Hold'em

A heads-up no-limit Texas Hold'em poker variant where you bet with **time** instead of chips. Every second you spend thinking drains your time bank!

## 🎮 How It Works

- Each player starts with a time bank (default: 180 seconds)
- On your turn, your time bank counts down in real-time
- Bets, calls, and raises commit seconds from your time bank to the pot
- The winner of each hand receives the pot (in seconds) added to their time bank
- Run out of time? You auto-fold!

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
blitz-holdem/
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
│   └── client/          # React frontend
│       ├── src/
│       │   ├── pages/       # Home & Table pages
│       │   ├── components/  # UI components
│       │   ├── hooks/       # Custom hooks
│       │   └── store/       # Zustand store
├── docs/
│   ├── prd.md               # Product Requirements
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

- If your time reaches 0 and you can check, you auto-check
- If your time reaches 0 and you face a bet, you auto-fold

## 🛠️ Development

### Commands

```bash
# Run linter
pnpm lint

# Type check
pnpm typecheck

# Run tests
pnpm test

# Build for production
pnpm build
```

### Tech Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS, Zustand
- **Backend**: Node.js, Express, WebSocket (ws)
- **Shared**: TypeScript, Zod (validation)

## ⌨️ Keyboard Shortcuts

| Key | Action       |
| --- | ------------ |
| F   | Fold         |
| C   | Check / Call |
| B   | Bet / Raise  |
| A   | All-in       |

## 📄 License

MIT
