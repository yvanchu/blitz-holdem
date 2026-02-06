# Testing Guide

This document describes the testing infrastructure and strategy for Blitz Hold'em.

## Overview

We use **Vitest** as our testing framework, which is fast and compatible with the Vite ecosystem.

## Running Tests

```bash
# Run all tests once
pnpm test

# Run tests in watch mode (auto-rerun on file changes)
pnpm test:watch

# Run tests for a specific package
cd packages/common && pnpm test

# Run with coverage
pnpm test -- --coverage
```

## Test Structure

Tests are organized in `__tests__` directories alongside the source code:

```
packages/common/src/
├── __tests__/
│   ├── timer.test.ts      # Timer utility tests
│   ├── engine.test.ts     # Game engine tests
│   └── deck-evaluate.test.ts  # Deck & hand evaluation tests
├── timer.ts
├── engine.ts
├── deck.ts
└── evaluate.ts
```

## Test Categories

### 1. Timer Tests (`timer.test.ts`)

Tests for the time-based betting system:

| Test                                               | Bug Prevented                           |
| -------------------------------------------------- | --------------------------------------- |
| `drainTime avoids floating point precision issues` | Pot displaying as "558.97599999999997s" |
| `commitSeconds returns integer values`             | Non-integer bet amounts                 |
| `awardPot returns integer value`                   | Floating point timebank after winning   |
| `drainTime rounds to avoid precision issues`       | Accumulating floating point errors      |

**Key Regression Tests:**

- Simulates 600 small time drains to ensure no precision drift
- Verifies all outputs are clean integers

### 2. Engine Tests (`engine.test.ts`)

Tests for game logic and state management:

| Test                                                  | Bug Prevented                        |
| ----------------------------------------------------- | ------------------------------------ |
| `should cap all-in bet to opponent effective stack`   | Betting more than opponent can match |
| `should not allow bet larger than opponent can match` | Invalid bet sizes                    |
| `should have integer pot after blinds/actions`        | Floating point pot values            |
| `should advance to showdown when both all-in`         | Game getting stuck when both all-in  |
| `should advance street when both players have acted`  | Betting round not completing         |

**Key Regression Tests:**

- Effective stack limiting prevents over-betting
- All-in runout ensures community cards are dealt
- Betting round completion logic

### 3. Deck & Evaluation Tests (`deck-evaluate.test.ts`)

Tests for card dealing and hand comparison:

| Test                                      | Bug Prevented              |
| ----------------------------------------- | -------------------------- |
| `createDeck should have 52 cards`         | Missing/duplicate cards    |
| `shuffle should not modify original deck` | Mutation bugs              |
| `evaluateHand identifies [hand type]`     | Incorrect hand ranking     |
| `compareHands ranks correctly`            | Wrong winner determination |

## Adding New Tests

### Test File Template

```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from '../module';

describe('Module Name', () => {
  describe('functionToTest', () => {
    it('should do something specific', () => {
      const result = functionToTest(input);
      expect(result).toBe(expectedOutput);
    });

    it('should handle edge case', () => {
      expect(() => functionToTest(badInput)).toThrow('Error message');
    });
  });
});
```

### Testing Helper Functions

We provide helper functions to reduce boilerplate:

```typescript
// Create a test player with default values
function createPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'test-player',
    alias: 'Test',
    timeBank: 100,
    // ... defaults
    ...overrides,
  };
}

// Set up a game with two players
function setupGame(p0TimeBank = 100, p1TimeBank = 100): { state: TableState; deck: Card[] } {
  let state = createInitialState('test-room');
  state = addPlayer(state, createPlayer({ seatIndex: 0, timeBank: p0TimeBank }));
  state = addPlayer(state, createPlayer({ seatIndex: 1, timeBank: p1TimeBank }));
  return startHand(state);
}
```

## Bug Regression Checklist

When fixing a bug, always:

1. **Write a failing test first** that demonstrates the bug
2. **Fix the bug** and verify the test passes
3. **Document the test** in this file with the bug it prevents

### Recent Bug Fixes with Tests

| Bug                          | Fix                                        | Test File        | Test Name                                            |
| ---------------------------- | ------------------------------------------ | ---------------- | ---------------------------------------------------- |
| Floating point pot display   | Round in `commitSeconds`, `awardPot`       | `timer.test.ts`  | `should avoid floating point precision issues`       |
| Over-betting vs short stack  | Cap at effective stack in `applyAction`    | `engine.test.ts` | `should cap all-in bet to opponent effective stack`  |
| Game stuck on both all-in    | `advanceStreet` recursion when both all-in | `engine.test.ts` | `should advance to showdown when both all-in`        |
| Betting round not completing | `hasActedThisStreet` tracking              | `engine.test.ts` | `should advance street when both players have acted` |

## Continuous Integration

Tests should run on every PR. Add to your CI workflow:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test
```

## Coverage Goals

- **Core game logic (engine.ts):** 90%+
- **Timer utilities:** 100%
- **Hand evaluation:** 100%
- **Deck operations:** 100%

## Test Coverage Roadmap

This section outlines the plan for achieving comprehensive test coverage for a production-ready MVP.

### Current Coverage (✅ Complete)

| Layer                         | Tests                                | Status |
| ----------------------------- | ------------------------------------ | ------ |
| Unit: Game Engine             | `engine.test.ts`                     | ✅     |
| Unit: Deck & Evaluation       | `deck-evaluate.test.ts`              | ✅     |
| Unit: Timer                   | `timer.test.ts`                      | ✅     |
| Unit: Hand History Store      | `handHistoryStore.test.ts`           | ✅     |
| Unit: Hand History Formatter  | `handHistoryFormatter.test.ts`       | ✅     |
| Server Controller (mocked WS) | `lobby.test.ts`, `showCards.test.ts` | ✅     |

### Phase 1: WebSocket Integration Tests ✅ COMPLETE

**Goal:** Test real WebSocket connections between server and simulated clients.

**Location:** `packages/server/src/__tests__/integration/`

**Tests Implemented:** 60 tests across 4 files

```
integration/
├── websocket.integration.test.ts    # 18 tests - Connection, auth, room management
├── gameFlow.integration.test.ts     # 13 tests - Full hand lifecycle
├── reconnection.integration.test.ts # 11 tests - Disconnect/reconnect scenarios
├── protocol.integration.test.ts     # 18 tests - Message protocol validation
└── testUtils.ts                     # Shared test helpers
```

| Test File                          | Tests | Coverage                                         | Bug Prevented                      |
| ---------------------------------- | ----- | ------------------------------------------------ | ---------------------------------- |
| `websocket.integration.test.ts`    | 18    | Connection handshake, auth, room join/leave      | Connection failures in production  |
| `gameFlow.integration.test.ts`     | 13    | Betting, streets, all-in, multiple hands         | State desync between server/client |
| `reconnection.integration.test.ts` | 11    | Disconnect, grace period, auto-action, reconnect | Lost game state on reconnect       |
| `protocol.integration.test.ts`     | 18    | All message types validated against schema       | Malformed messages crash server    |

**Implementation Approach:**

```typescript
// Example: websocket.integration.test.ts
import { WebSocket } from 'ws';
import { createServer } from '../index';

describe('WebSocket Integration', () => {
  let server: ReturnType<typeof createServer>;
  let ws1: WebSocket;
  let ws2: WebSocket;

  beforeAll(async () => {
    server = createServer();
    await server.listen(0); // Random port
  });

  afterAll(() => server.close());

  it('should complete full JOIN_TABLE flow', async () => {
    ws1 = new WebSocket(`ws://localhost:${server.port}`);
    await waitForOpen(ws1);

    ws1.send(JSON.stringify({ type: 'CREATE_TABLE', alias: 'Player1' }));
    const response = await waitForMessage(ws1, 'TABLE_JOINED');

    expect(response.roomId).toBeDefined();
    expect(response.seatIndex).toBe(0);
  });
});
```

**Commands to Run:**

```bash
pnpm --filter @blitz-holdem/server test:integration
```

**Key Features Tested:**

- Configurable delays (`runoutDelayMs`, `nextHandDelayMs`) for fast test execution
- Auto-action for disconnected players (check if possible, otherwise fold)
- Seat cleanup after grace period expires
- Grace period reconnection window

---

### Phase 2: E2E Browser Tests with Playwright ✅ COMPLETE

**Goal:** Test complete user flows in real browsers.

**Location:** `packages/e2e/`

**Tests Implemented:** 38 tests across 7 files

```
e2e/
├── playwright.config.ts         # Chromium, webServer for client/server
├── fixtures/
│   └── game.fixture.ts          # PlayerPage POM, createGame helper
└── tests/
    ├── createAndJoin.spec.ts    # 6 tests - Room creation & joining
    ├── playHand.spec.ts         # 6 tests - Complete hand lifecycle
    ├── allIn.spec.ts            # 4 tests - All-in scenarios
    ├── fold.spec.ts             # 6 tests - Fold and show cards
    ├── settings.spec.ts         # 7 tests - Settings modal
    ├── timerDrain.spec.ts       # 5 tests - Timer countdown accuracy
    └── reconnect.spec.ts        # 4 tests - Browser refresh mid-hand
```

| Test File               | Tests | User Flow                                                  | Bug Prevented                  |
| ----------------------- | ----- | ---------------------------------------------------------- | ------------------------------ |
| `createAndJoin.spec.ts` | 6     | Create room, copy link, open in 2nd tab, join              | Broken room links              |
| `playHand.spec.ts`      | 6     | Deal, bet, call, flop, check, turn, raise, river, showdown | UI not reflecting game state   |
| `allIn.spec.ts`         | 4     | All-in, call, see runout cards dealt                       | Missing cards on all-in runout |
| `fold.spec.ts`          | 6     | Fold, click "Show Cards", verify opponent sees             | Show cards feature broken      |
| `settings.spec.ts`      | 7     | Settings modal open/close, input validation                | Settings not saving            |
| `timerDrain.spec.ts`    | 5     | Verify timer decrements ~1s/s on active turn               | Timer not draining correctly   |
| `reconnect.spec.ts`     | 4     | Mid-hand refresh, verify state restored                    | Lost state on page refresh     |

**Client Components with data-testid:**

Added `data-testid` attributes to all components for reliable E2E selectors:

- `Table.tsx`: poker-table, community-cards, pot, copy-link-button, settings-button, start-game-button, show-cards-button
- `Card.tsx`: card (with data-card-rank, data-card-suit, data-card-hidden)
- `Seat.tsx`: seat-top/bottom, hole-cards, player-info, ready-button (with data-seat-active, data-seat-folded)
- `Timer.tsx`: timer (with data-timer-active, data-timer-allin)
- `ActionBar.tsx`: action-bar, call-button, check-button, fold-button, raise-button, bet-input, bet-slider, confirm-raise-button
- `SettingsModal.tsx`: settings-modal, settings-save-button
- `ResultOverlay.tsx`: result-overlay
- `HomePage.tsx`: alias-input, create-table-button

**Commands to Run:**

```bash
pnpm --filter e2e test           # Run all E2E tests
pnpm --filter e2e test:headed    # Run with browser visible
pnpm --filter e2e test:debug     # Debug mode with Playwright inspector
pnpm --filter e2e test:ui        # Playwright UI mode
```

---

### Phase 3: Client Component Tests ✅ COMPLETE

**Goal:** Test React components in isolation with React Testing Library.

**Location:** `packages/client/src/components/__tests__/`

**Tests Implemented:** 110 tests across 6 files

```
components/__tests__/
├── Timer.test.tsx           # 11 tests - Display, states, colors
├── Card.test.tsx            # 20 tests - Face up/down, suits, ranks
├── Seat.test.tsx            # 24 tests - Player info, data attrs
├── ActionBar.test.tsx       # 23 tests - Button states, actions
├── SettingsModal.test.tsx   # 16 tests - Inputs, validation, save
└── Table.test.tsx           # 16 tests - Lobby, game, showdown
```

| Component       | Tests | Key Tests                                     |
| --------------- | ----- | --------------------------------------------- |
| `Timer`         | 11    | Display, active/inactive/all-in, color coding |
| `Card`          | 20    | Face up/down, suits, ranks, sizes, highlight  |
| `Seat`          | 24    | Empty seat, player info, data attrs, setup    |
| `ActionBar`     | 23    | Button states, actions, keyboard shortcuts    |
| `SettingsModal` | 16    | Visibility, inputs, save, validation          |
| `Table`         | 16    | Rendering, lobby/game states, showdown        |

**Commands to Run:**

```bash
pnpm --filter @blitz-holdem/client test       # Run client tests
pnpm --filter @blitz-holdem/client test:watch # Watch mode
```

---

### Phase 4: Protocol & Contract Tests (Priority: Medium)

**Goal:** Ensure client and server agree on message formats.

**Location:** `packages/common/src/__tests__/protocol.test.ts`

**Tests to Add:**

| Test                    | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| Schema validation       | All message types match TypeScript definitions       |
| Backwards compatibility | Old clients handle new optional fields               |
| Error responses         | Server sends proper error messages for invalid input |

---

### Phase 5: Performance & Stress Tests (Priority: Low)

**Goal:** Ensure system handles load and edge cases.

**Tests to Add:**

| Test                 | Scenario                             |
| -------------------- | ------------------------------------ |
| Hand evaluation perf | Evaluate 10,000 hands in <1s         |
| Concurrent rooms     | 100 simultaneous games               |
| Rapid actions        | 50 actions/second from single client |
| Memory leaks         | Play 1000 hands, check memory stable |

---

## Implementation Checklist

### Phase 1: WebSocket Integration (Est: 2-3 days) ✅ COMPLETE

- [x] Create `packages/server/src/__tests__/integration/` directory
- [x] Add test utilities for WebSocket helpers (`waitForMessage`, `waitForOpen`)
- [x] Write `websocket.integration.test.ts` (18 tests)
- [x] Write `gameFlow.integration.test.ts` (13 tests, 3 skipped for investigation)
- [x] Write `reconnection.integration.test.ts` (9 tests, 2 skipped for investigation)
- [x] Write `protocol.integration.test.ts` (18 tests)
- [x] Add `test:integration` script to server package.json
- [x] Update root package.json with integration test scripts

**Results:** 53 passing tests, 5 skipped (for server behavior investigation)

### Phase 2: E2E with Playwright (Est: 3-4 days)

- [ ] Create `packages/e2e/` with Playwright setup
- [ ] Configure Playwright to start server/client before tests
- [ ] Create `GameFixture` for reusable test setup
- [ ] Write `createAndJoin.spec.ts`
- [ ] Write `playHand.spec.ts`
- [ ] Write `allIn.spec.ts`
- [ ] Write `fold.spec.ts`
- [ ] Write `timerDrain.spec.ts`
- [ ] Write `reconnect.spec.ts`
- [ ] Add E2E tests to CI (headless Chrome)

### Phase 3: Component Tests ✅ COMPLETE

- [x] Set up React Testing Library in client package
- [x] Configure vite.config.ts with jsdom test environment
- [x] Create test setup file with mocks
- [x] Write `ActionBar.test.tsx` (23 tests)
- [x] Write `Timer.test.tsx` (11 tests)
- [x] Write `Card.test.tsx` (20 tests)
- [x] Write `Table.test.tsx` (16 tests)
- [x] Write `Seat.test.tsx` (24 tests)
- [x] Write `SettingsModal.test.tsx` (16 tests)

**Results:** 110 new tests, all passing

### Phase 4: Protocol Tests (Est: 1 day)

- [ ] Add Zod or similar for runtime schema validation
- [ ] Write protocol schema tests
- [ ] Add protocol validation to server message handlers

### Phase 5: Performance Tests (Est: 1-2 days)

- [ ] Write hand evaluation benchmark
- [ ] Write concurrent rooms stress test
- [ ] Set up memory profiling for long-running games

---

## Commands Reference

```bash
# Unit tests (existing)
pnpm test                          # All unit tests
pnpm test:watch                    # Watch mode

# Integration tests (Phase 1)
pnpm --filter @blitz-holdem/server test:integration

# E2E tests (Phase 2)
pnpm --filter e2e test             # Headless
pnpm --filter e2e test:headed      # With browser
pnpm --filter e2e test:debug       # Debug mode

# All tests
pnpm test:all                      # Unit + Integration + E2E

# Coverage
pnpm test -- --coverage
```
