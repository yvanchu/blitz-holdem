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

## Future Test Additions

- [ ] WebSocket message protocol tests
- [ ] Integration tests with mock WebSocket
- [ ] End-to-end tests with Playwright
- [ ] Performance tests for hand evaluation
- [ ] Stress tests for concurrent games
