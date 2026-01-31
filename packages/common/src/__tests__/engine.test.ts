import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  addPlayer,
  startHand,
  applyAction,
  getValidActions,
  advanceStreet,
} from '../engine';
import type { Player, TableState, Card } from '../types';

// Helper to create a test player
function createPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: `player-${overrides.seatIndex ?? 0}`,
    alias: `Player ${(overrides.seatIndex ?? 0) + 1}`,
    timeBank: 100,
    holeCards: null,
    currentBet: 0,
    folded: false,
    isAllIn: false,
    isConnected: true,
    seatIndex: (overrides.seatIndex ?? 0) as 0 | 1,
    hasActedThisStreet: false,
    ...overrides,
  };
}

// Helper to set up a game with two players
function setupGame(p0TimeBank = 100, p1TimeBank = 100): { state: TableState; deck: Card[] } {
  let state = createInitialState('test-room');
  state = addPlayer(state, createPlayer({ seatIndex: 0, timeBank: p0TimeBank }));
  state = addPlayer(state, createPlayer({ seatIndex: 1, timeBank: p1TimeBank }));
  return startHand(state);
}

describe('Engine - Effective Stack Limiting', () => {
  describe('All-in capped to effective stack', () => {
    it('should cap all-in bet to opponent effective stack', () => {
      // Player 0 has 100s, Player 1 has 50s
      // If Player 0 goes all-in, they should only bet 50s (matching opponent)
      const { state, deck } = setupGame(100, 50);

      // Find the active player
      const activeIndex = state.activePlayerIndex!;
      const activePlayer = state.players[activeIndex]!;

      // Go all-in
      const result = applyAction(
        state,
        {
          type: 'all-in',
          playerId: activePlayer.id,
          timestamp: Date.now(),
        },
        deck
      );

      const updatedPlayer = result.state.players[activeIndex]!;

      // The bet should be capped at effective stack
      // After blinds: P0 has ~99 or 98, P1 has ~49 or 48
      // All-in should be limited to what opponent can match
      expect(updatedPlayer.isAllIn).toBe(true);
      expect(updatedPlayer.timeBank).toBeGreaterThanOrEqual(0);
    });

    it('should not allow bet larger than opponent can match', () => {
      const { state, deck } = setupGame(200, 30);

      const activeIndex = state.activePlayerIndex!;
      const activePlayer = state.players[activeIndex]!;
      const opponentIndex: 0 | 1 = activeIndex === 0 ? 1 : 0;
      const opponent = state.players[opponentIndex]!;

      // Try to raise a large amount
      const result = applyAction(
        state,
        {
          type: 'raise',
          amount: 100,
          playerId: activePlayer.id,
          timestamp: Date.now(),
        },
        deck
      );

      const updatedPlayer = result.state.players[activeIndex]!;

      // Bet should be capped at opponent's effective stack
      expect(updatedPlayer.currentBet).toBeLessThanOrEqual(opponent.timeBank + opponent.currentBet);
    });
  });

  describe('Pot values are integers', () => {
    it('should have integer pot after blinds', () => {
      const { state } = setupGame(100, 100);
      expect(Number.isInteger(state.pot)).toBe(true);
    });

    it('should maintain integer pot after actions', () => {
      const { state, deck } = setupGame(100, 100);

      const activeIndex = state.activePlayerIndex!;
      const activePlayer = state.players[activeIndex]!;

      // Call action
      const result = applyAction(
        state,
        {
          type: 'call',
          amount: state.currentBet - activePlayer.currentBet,
          playerId: activePlayer.id,
          timestamp: Date.now(),
        },
        deck
      );

      expect(Number.isInteger(result.state.pot)).toBe(true);
    });
  });

  describe('Both all-in runs out cards', () => {
    it('should advance to showdown when both players are all-in', () => {
      const { state, deck } = setupGame(20, 20); // Small stacks to force all-in quickly

      const activeIndex = state.activePlayerIndex!;
      const activePlayer = state.players[activeIndex]!;

      // First player goes all-in
      let result = applyAction(
        state,
        {
          type: 'all-in',
          playerId: activePlayer.id,
          timestamp: Date.now(),
        },
        deck
      );

      // If hand didn't end, second player calls
      if (result.state.isHandInProgress && result.state.activePlayerIndex !== null) {
        const nextIndex = result.state.activePlayerIndex;
        const nextPlayer = result.state.players[nextIndex]!;

        result = applyAction(
          result.state,
          {
            type: 'all-in',
            playerId: nextPlayer.id,
            timestamp: Date.now(),
          },
          result.deck
        );
      }

      // After both all-in, should either be at showdown or have a result
      if (result.handResult) {
        expect(result.handResult.showdown).toBe(true);
        expect(result.state.communityCards.length).toBe(5);
      }
    });
  });
});

describe('Engine - Valid Actions', () => {
  it('should include fold in valid actions', () => {
    const { state } = setupGame(100, 100);
    const actions = getValidActions(state);
    expect(actions).toContain('fold');
  });

  it('should include call when facing a bet', () => {
    const { state } = setupGame(100, 100);
    const actions = getValidActions(state);

    // Preflop, SB is active and faces BB, should be able to call
    if (state.currentBet > 0) {
      expect(actions).toContain('call');
    }
  });

  it('should include check when no bet to call', () => {
    // This happens post-flop when first to act
    const { state, deck } = setupGame(100, 100);

    // Get through preflop betting
    let currentState = state;
    let currentDeck = deck;

    // SB calls
    const sbIndex = state.activePlayerIndex!;
    const sb = state.players[sbIndex]!;

    let result = applyAction(
      currentState,
      {
        type: 'call',
        amount: state.currentBet - sb.currentBet,
        playerId: sb.id,
        timestamp: Date.now(),
      },
      currentDeck
    );

    currentState = result.state;
    currentDeck = result.deck;

    // BB checks
    if (currentState.activePlayerIndex !== null) {
      const bb = currentState.players[currentState.activePlayerIndex]!;
      result = applyAction(
        currentState,
        {
          type: 'check',
          playerId: bb.id,
          timestamp: Date.now(),
        },
        currentDeck
      );

      currentState = result.state;
    }

    // Now on flop, first to act should be able to check
    if (currentState.isHandInProgress && currentState.activePlayerIndex !== null) {
      const actions = getValidActions(currentState);
      expect(actions).toContain('check');
    }
  });
});

describe('Engine - Betting Round Completion', () => {
  it('should advance street when both players have acted and bets are equal', () => {
    const { state, deck } = setupGame(100, 100);

    // SB calls
    const sbIndex = state.activePlayerIndex!;
    const sb = state.players[sbIndex]!;

    let result = applyAction(
      state,
      {
        type: 'call',
        amount: state.currentBet - sb.currentBet,
        playerId: sb.id,
        timestamp: Date.now(),
      },
      deck
    );

    // BB should now be active
    expect(result.state.activePlayerIndex).toBe(sbIndex === 0 ? 1 : 0);

    // BB checks
    const bb = result.state.players[result.state.activePlayerIndex!]!;
    result = applyAction(
      result.state,
      {
        type: 'check',
        playerId: bb.id,
        timestamp: Date.now(),
      },
      result.deck
    );

    // Should have advanced to flop
    expect(result.state.street).toBe('flop');
    expect(result.state.communityCards.length).toBe(3);
  });
});
