import { WebSocket } from 'ws';
import { nanoid } from 'nanoid';
import {
  type TableState,
  type Player,
  type Card,
  type ActionType,
  type S2CMessage,
  type PlayerPublic,
  createInitialState,
  addPlayer,
  startHand,
  applyAction,
  advanceStreet,
  getValidActions,
  drainTime,
  isTimeout,
} from '@blitz-holdem/common';

interface ConnectedPlayer {
  ws: WebSocket;
  player: Player;
  isReady: boolean;
  disconnectedAt: number | null;
}

export class TableController {
  private state: TableState;
  private players = new Map<string, ConnectedPlayer>();
  private deck: Card[] = [];
  private tickInterval: NodeJS.Timeout | null = null;
  private lastTickTime: number = Date.now();
  // For "show cards" feature after hand ends
  private lastHandHoleCards: {
    seat0: [Card, Card] | null;
    seat1: [Card, Card] | null;
    alreadyShown: Set<string>; // player IDs that already showed
    showdown: boolean; // if true, cards were already revealed
  } = { seat0: null, seat1: null, alreadyShown: new Set(), showdown: false };

  constructor(roomId: string) {
    this.state = createInitialState(roomId);
  }

  get id(): string {
    return this.state.roomId;
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  isPlaying(): boolean {
    return this.state.isHandInProgress;
  }

  addPlayer(ws: WebSocket, alias: string): { success: boolean; playerId?: string; error?: string } {
    if (this.players.size >= 2) {
      return { success: false, error: 'Room is full' };
    }

    const playerId = nanoid(12);
    const seatIndex = this.state.players[0] === null ? 0 : 1;

    const player: Player = {
      id: playerId,
      alias: alias || `Player ${seatIndex + 1}`,
      timeBank: this.state.settings.initialTimeBank,
      holeCards: null,
      currentBet: 0,
      folded: false,
      isAllIn: false,
      isConnected: true,
      seatIndex: seatIndex as 0 | 1,
      hasActedThisStreet: false,
    };

    this.state = addPlayer(this.state, player);
    this.players.set(playerId, { ws, player, isReady: false, disconnectedAt: null });

    // Notify all players
    this.broadcastPlayerJoined(player);
    this.sendRoomState(playerId);

    console.log(`Player ${alias} (${playerId}) joined room ${this.state.roomId}`);

    return { success: true, playerId };
  }

  setPlayerReady(playerId: string) {
    const connected = this.players.get(playerId);
    if (!connected) return;

    connected.isReady = true;
    console.log(`Player ${playerId} is ready`);

    // Check if both players are ready
    if (this.players.size === 2 && this.allPlayersReady() && !this.state.isHandInProgress) {
      this.startNewHand();
    }
  }

  handleAction(
    playerId: string,
    actionType: ActionType,
    amount?: number
  ): { success: boolean; error?: string } {
    if (!this.state.isHandInProgress) {
      return { success: false, error: 'No hand in progress' };
    }

    const connected = this.players.get(playerId);
    if (!connected) {
      return { success: false, error: 'Player not found' };
    }

    const validActions = getValidActions(this.state);
    if (!validActions.includes(actionType)) {
      return { success: false, error: `Invalid action: ${actionType}` };
    }

    try {
      const result = applyAction(
        this.state,
        {
          type: actionType,
          amount,
          playerId,
          timestamp: Date.now(),
        },
        this.deck
      );

      this.state = result.state;
      this.deck = result.deck;

      // Sync player objects
      this.syncPlayers();

      // Broadcast action
      this.broadcastAction(playerId, actionType, amount ?? 0);

      // Check for hand end
      if (result.handResult) {
        this.broadcastResult(result.handResult);
        this.stopTickLoop();

        // Auto-start next hand after delay if both players still have time
        setTimeout(() => {
          if (this.canContinue()) {
            this.startNewHand();
          }
        }, 6000); // 6 seconds for players to review showdown
      } else {
        // Check if we need to run out the hand (all-in situation)
        const p0 = this.state.players[0];
        const p1 = this.state.players[1];
        const needsRunout =
          p0 &&
          p1 &&
          (p0.isAllIn || p1.isAllIn) &&
          !p0.folded &&
          !p1.folded &&
          this.state.activePlayerIndex === null;

        if (needsRunout) {
          // Send full player state update so clients see any refund that happened
          // (the engine's advanceStreet already did the refund internally)
          this.broadcastPlayersUpdate();

          // Run out remaining streets with delays
          // The first street (flop) was already dealt by the engine, but we delay before showing it
          this.runOutHand();
        } else if (this.state.street !== 'preflop' || this.state.communityCards.length > 0) {
          // New street (normal case)
          this.broadcastStreet();
          this.broadcastTurn();
        } else {
          // Just broadcast turn change
          this.broadcastTurn();
        }
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  handleDisconnect(playerId: string) {
    const connected = this.players.get(playerId);
    if (!connected) return;

    connected.disconnectedAt = Date.now();
    connected.player.isConnected = false;

    // Update state
    const playerIndex = this.state.players.findIndex((p) => p?.id === playerId);
    if (playerIndex !== -1 && this.state.players[playerIndex]) {
      this.state.players[playerIndex]!.isConnected = false;
    }

    this.broadcastPlayerLeft(playerId, connected.player.seatIndex);
    console.log(`Player ${playerId} disconnected`);

    // Grace period - auto-fold after timeout
    setTimeout(() => {
      const stillDisconnected = this.players.get(playerId);
      if (
        stillDisconnected?.disconnectedAt &&
        Date.now() - stillDisconnected.disconnectedAt >= this.state.settings.disconnectGracePeriod
      ) {
        // Auto-fold if it's their turn
        if (
          this.state.isHandInProgress &&
          this.state.activePlayerIndex !== null &&
          this.state.players[this.state.activePlayerIndex]?.id === playerId
        ) {
          this.handleAction(playerId, 'fold');
        }
        this.players.delete(playerId);
      }
    }, this.state.settings.disconnectGracePeriod);
  }

  updateSettings(
    playerId: string,
    settings: { smallBlind?: number; bigBlind?: number; initialTimeBank?: number }
  ): { success: boolean; error?: string } {
    // Only allow settings change before hand starts
    if (this.state.isHandInProgress) {
      return { success: false, error: 'Cannot change settings during a hand' };
    }

    // Only first player (seat 0) can change settings
    const player = this.state.players.find((p) => p?.id === playerId);
    if (!player || player.seatIndex !== 0) {
      return { success: false, error: 'Only the room creator can change settings' };
    }

    // Validate and apply settings
    if (settings.smallBlind !== undefined) {
      const sb = Math.max(1, Math.floor(settings.smallBlind));
      this.state.settings.smallBlind = sb;
    }

    if (settings.bigBlind !== undefined) {
      const bb = Math.max(this.state.settings.smallBlind, Math.floor(settings.bigBlind));
      this.state.settings.bigBlind = bb;
    }

    if (settings.initialTimeBank !== undefined) {
      const tb = Math.max(this.state.settings.bigBlind * 10, Math.floor(settings.initialTimeBank));
      this.state.settings.initialTimeBank = tb;

      // Update player time banks
      for (const p of this.state.players) {
        if (p) {
          p.timeBank = tb;
        }
      }
      for (const connected of this.players.values()) {
        connected.player.timeBank = tb;
      }
    }

    // Broadcast settings update to all players
    this.broadcastSettingsUpdate();

    console.log(`Settings updated by ${playerId}:`, this.state.settings);
    return { success: true };
  }

  updatePlayerAlias(playerId: string, alias: string) {
    const connected = this.players.get(playerId);
    if (!connected) return;

    const trimmedAlias = alias.trim().slice(0, 20) || 'Player';
    connected.player.alias = trimmedAlias;

    // Update state
    const playerIndex = this.state.players.findIndex((p) => p?.id === playerId);
    if (playerIndex !== -1 && this.state.players[playerIndex]) {
      this.state.players[playerIndex]!.alias = trimmedAlias;
    }

    // Broadcast player update
    this.broadcastPlayerUpdate(connected.player);

    console.log(`Player ${playerId} changed alias to ${trimmedAlias}`);
  }

  destroy() {
    this.stopTickLoop();
    this.players.forEach((p) => p.ws.close());
    this.players.clear();
  }

  // ─────────────────────────────────────────────────────────────
  // Private Methods
  // ─────────────────────────────────────────────────────────────

  private allPlayersReady(): boolean {
    for (const connected of this.players.values()) {
      if (!connected.isReady) return false;
    }
    return true;
  }

  private canContinue(): boolean {
    const p0 = this.state.players[0];
    const p1 = this.state.players[1];
    return !!(p0 && p1 && p0.timeBank > 0 && p1.timeBank > 0);
  }

  private startNewHand() {
    try {
      const result = startHand(this.state);
      this.state = result.state;
      this.deck = result.deck;

      this.syncPlayers();
      this.broadcastHandStart();
      this.startTickLoop();

      console.log(`Hand #${this.state.handNumber} started in room ${this.state.roomId}`);
    } catch (err) {
      console.error('Failed to start hand:', err);
    }
  }

  private syncPlayers() {
    for (const [playerId, connected] of this.players) {
      const statePlayer = this.state.players.find((p) => p?.id === playerId);
      if (statePlayer) {
        connected.player = statePlayer;
      }
    }
  }

  private startTickLoop() {
    this.lastTickTime = Date.now();
    const tickMs = 1000 / this.state.settings.tickRateHz;

    this.tickInterval = setInterval(() => {
      this.tick();
    }, tickMs);
  }

  private stopTickLoop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private tick() {
    if (!this.state.isHandInProgress || this.state.activePlayerIndex === null) {
      return;
    }

    const now = Date.now();
    const elapsed = now - this.lastTickTime;
    this.lastTickTime = now;

    const activePlayer = this.state.players[this.state.activePlayerIndex];
    if (!activePlayer || activePlayer.folded || activePlayer.isAllIn) {
      return;
    }

    // Drain time
    const updated = drainTime(activePlayer, elapsed);
    this.state.players[this.state.activePlayerIndex] = updated;

    // Sync connected player
    const connected = this.players.get(activePlayer.id);
    if (connected) {
      connected.player = updated;
    }

    // Broadcast tick
    this.broadcastTick();

    // Check timeout - player goes all-in with whatever they have
    if (isTimeout(updated)) {
      // Mark as all-in (they've committed all their time)
      updated.isAllIn = true;
      updated.hasActedThisStreet = true;
      this.state.players[this.state.activePlayerIndex] = updated;

      if (connected) {
        connected.player = updated;
      }

      // Broadcast the timeout as an all-in action
      this.broadcastAction(activePlayer.id, 'all-in', 0);

      // Check if betting round is complete and advance
      this.checkAndAdvanceAfterTimeout();
    }
  }

  private refundUncalledBet() {
    // When one player is all-in for less, refund the excess to the other player
    const p0 = this.state.players[0];
    const p1 = this.state.players[1];
    if (!p0 || !p1) return;

    // Find the smaller bet (the effective amount both players are risking)
    const minBet = Math.min(p0.currentBet, p1.currentBet);

    // Refund any excess to each player
    if (p0.currentBet > minBet) {
      const refund = p0.currentBet - minBet;
      p0.timeBank += refund;
      p0.currentBet = minBet;
      this.state.pot -= refund;
      console.log(`Refunded ${refund}s to ${p0.alias} (uncalled bet)`);
    }
    if (p1.currentBet > minBet) {
      const refund = p1.currentBet - minBet;
      p1.timeBank += refund;
      p1.currentBet = minBet;
      this.state.pot -= refund;
      console.log(`Refunded ${refund}s to ${p1.alias} (uncalled bet)`);
    }

    // Sync players
    this.state.players[0] = p0;
    this.state.players[1] = p1;
  }

  private checkAndAdvanceAfterTimeout() {
    const p0 = this.state.players[0];
    const p1 = this.state.players[1];
    if (!p0 || !p1) return;

    // If both players are now all-in, or one is all-in and other has acted
    const bothAllIn = p0.isAllIn && p1.isAllIn;
    const oneAllInOtherActed =
      (p0.isAllIn && p1.hasActedThisStreet && p1.currentBet >= p0.currentBet) ||
      (p1.isAllIn && p0.hasActedThisStreet && p0.currentBet >= p1.currentBet);

    // Special case: if all-in player's bet is <= opponent's current bet, no action needed
    // (opponent has already covered the all-in amount)
    const allInCoveredByOpponent =
      (p0.isAllIn && p1.currentBet >= p0.currentBet) ||
      (p1.isAllIn && p0.currentBet >= p1.currentBet);

    if (bothAllIn || oneAllInOtherActed || allInCoveredByOpponent) {
      // Refund any uncalled bet and broadcast to players
      this.refundUncalledBet();
      this.syncPlayers();
      this.broadcastPlayersUpdate();
      // Run out the hand to showdown
      this.runOutHand();
    } else {
      // Give action to the other player
      const currentActive = this.state.activePlayerIndex;
      const nextPlayerIndex: 0 | 1 = currentActive === 0 ? 1 : 0;
      const nextPlayer = this.state.players[nextPlayerIndex];

      if (nextPlayer && !nextPlayer.folded && !nextPlayer.isAllIn) {
        this.state.activePlayerIndex = nextPlayerIndex;
        this.broadcastTurn();
      } else {
        // Other player can't act either, refund and run out the hand
        this.refundUncalledBet();
        this.syncPlayers();
        this.broadcastPlayersUpdate();
        this.runOutHand();
      }
    }
  }

  private runOutHand() {
    const RUNOUT_DELAY_MS = 3000; // 3 seconds between each street

    // Note: Refund is already handled by engine's advanceStreet before we get here
    // The caller (handleAction or checkAndAdvanceAfterTimeout) broadcasts player updates

    // Check if we already have community cards to show (engine dealt first street)
    const hasInitialStreet = this.state.communityCards.length > 0;

    const showCurrentStreetAndContinue = () => {
      if (this.state.street === 'showdown' || !this.state.isHandInProgress) {
        return;
      }

      // Broadcast the current street (if we have community cards)
      if (this.state.communityCards.length > 0) {
        this.broadcastStreet();
      }

      // If we're at river, we need to advance to showdown
      if (this.state.street === 'river') {
        setTimeout(advanceToShowdown, RUNOUT_DELAY_MS);
      } else {
        // Schedule next street advancement
        setTimeout(advanceOneStreet, RUNOUT_DELAY_MS);
      }
    };

    const advanceOneStreet = () => {
      if (this.state.street === 'showdown' || !this.state.isHandInProgress) {
        return;
      }

      try {
        // Advance one street at a time
        const result = advanceStreet(this.state, this.deck);
        this.state = result.state;
        this.deck = result.deck;

        if (result.handResult) {
          // Hand ended (showdown from river)
          this.syncPlayers();
          this.broadcastResult(result.handResult);
          this.stopTickLoop();

          setTimeout(() => {
            if (this.canContinue()) {
              this.startNewHand();
            }
          }, 6000);
          return;
        } else {
          // Broadcast the new street, then schedule next
          this.broadcastStreet();

          if (this.state.street === 'river') {
            setTimeout(advanceToShowdown, RUNOUT_DELAY_MS);
          } else {
            setTimeout(advanceOneStreet, RUNOUT_DELAY_MS);
          }
        }
      } catch (err) {
        console.error('Error running out hand:', err);
      }
    };

    const advanceToShowdown = () => {
      try {
        const result = advanceStreet(this.state, this.deck);
        this.state = result.state;
        this.deck = result.deck;

        if (result.handResult) {
          this.syncPlayers();
          this.broadcastResult(result.handResult);
          this.stopTickLoop();

          setTimeout(() => {
            if (this.canContinue()) {
              this.startNewHand();
            }
          }, 6000);
        }
      } catch (err) {
        console.error('Error advancing to showdown:', err);
      }
    };

    // Start the runout sequence after initial delay
    // If we already have a street dealt (flop), show it first
    if (hasInitialStreet) {
      setTimeout(showCurrentStreetAndContinue, RUNOUT_DELAY_MS);
    } else {
      setTimeout(advanceOneStreet, RUNOUT_DELAY_MS);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Broadcasting
  // ─────────────────────────────────────────────────────────────

  private broadcast(message: S2CMessage) {
    const data = JSON.stringify(message);
    for (const connected of this.players.values()) {
      if (connected.ws.readyState === WebSocket.OPEN) {
        connected.ws.send(data);
      }
    }
  }

  private send(playerId: string, message: S2CMessage) {
    const connected = this.players.get(playerId);
    if (connected?.ws.readyState === WebSocket.OPEN) {
      connected.ws.send(JSON.stringify(message));
    }
  }

  // Check if we're in an all-in showdown situation where all cards should be revealed
  private isAllInShowdown(): boolean {
    const p0 = this.state.players[0];
    const p1 = this.state.players[1];
    if (!p0 || !p1) return false;
    if (p0.folded || p1.folded) return false;
    // At least one player is all-in and bets are equal (opponent has called)
    return (
      (p0.isAllIn || p1.isAllIn) &&
      p0.currentBet === p1.currentBet &&
      this.state.isHandInProgress
    );
  }

  private toPublicPlayer(player: Player | null, forPlayerId?: string): PlayerPublic | null {
    if (!player) return null;
    // Show hole cards if: it's your own hand, OR we're in all-in showdown
    const showCards = player.id === forPlayerId || this.isAllInShowdown();
    return {
      id: player.id,
      alias: player.alias,
      timeBank: Math.round(player.timeBank),
      holeCards: showCards ? player.holeCards : null,
      currentBet: player.currentBet,
      folded: player.folded,
      isAllIn: player.isAllIn,
      isConnected: player.isConnected,
      seatIndex: player.seatIndex,
    };
  }

  private sendRoomState(playerId: string) {
    const connected = this.players.get(playerId);
    if (!connected) return;

    const message: S2CMessage = {
      type: 'ROOM_STATE',
      roomId: this.state.roomId,
      yourPlayerId: playerId,
      yourSeatIndex: connected.player.seatIndex,
      players: [
        this.toPublicPlayer(this.state.players[0], playerId),
        this.toPublicPlayer(this.state.players[1], playerId),
      ],
      dealerIndex: this.state.dealerIndex,
      activePlayerIndex: this.state.activePlayerIndex,
      street: this.state.street,
      communityCards: this.state.communityCards,
      pot: this.state.pot,
      currentBet: this.state.currentBet,
      minRaise: this.state.minRaise,
      settings: this.state.settings,
      handNumber: this.state.handNumber,
      isHandInProgress: this.state.isHandInProgress,
      serverTime: Date.now(),
    };

    this.send(playerId, message);
  }

  private broadcastPlayerJoined(player: Player) {
    this.broadcast({
      type: 'PLAYER_JOINED',
      player: this.toPublicPlayer(player)!,
      seatIndex: player.seatIndex,
    });
  }

  private broadcastPlayerLeft(playerId: string, seatIndex: 0 | 1) {
    this.broadcast({
      type: 'PLAYER_LEFT',
      playerId,
      seatIndex,
    });
  }

  private broadcastSettingsUpdate() {
    this.broadcast({
      type: 'SETTINGS_UPDATED',
      settings: this.state.settings,
    });
  }

  private broadcastPlayerUpdate(player: Player) {
    this.broadcast({
      type: 'PLAYER_UPDATED',
      player: this.toPublicPlayer(player)!,
      seatIndex: player.seatIndex,
    });
  }

  private broadcastHandStart() {
    for (const [playerId, connected] of this.players) {
      const player = connected.player;
      this.send(playerId, {
        type: 'HAND_START',
        handNumber: this.state.handNumber,
        dealerIndex: this.state.dealerIndex,
        holeCards: player.holeCards!,
        players: [
          this.toPublicPlayer(this.state.players[0], playerId)!,
          this.toPublicPlayer(this.state.players[1], playerId)!,
        ],
        pot: this.state.pot,
        serverTime: Date.now(),
      });
    }

    this.broadcastTurn();
  }

  private broadcastTurn() {
    if (this.state.activePlayerIndex === null) return;

    this.broadcast({
      type: 'TURN',
      activePlayerIndex: this.state.activePlayerIndex,
      currentBet: this.state.currentBet,
      minRaise: this.state.minRaise,
      pot: this.state.pot,
      serverTime: Date.now(),
    });
  }

  private broadcastTick() {
    this.broadcast({
      type: 'TICK',
      activePlayerIndex: this.state.activePlayerIndex!,
      players: [
        { timeBank: Math.round(this.state.players[0]?.timeBank ?? 0) },
        { timeBank: Math.round(this.state.players[1]?.timeBank ?? 0) },
      ],
      serverTime: Date.now(),
    });
  }

  private broadcastPlayersUpdate() {
    // Send full player state to all clients (used after refunds)
    for (const [pid] of this.players) {
      this.send(pid, {
        type: 'PLAYERS_UPDATE',
        players: [
          this.toPublicPlayer(this.state.players[0], pid)!,
          this.toPublicPlayer(this.state.players[1], pid)!,
        ],
        pot: this.state.pot,
        serverTime: Date.now(),
      });
    }
  }

  private broadcastAction(playerId: string, action: ActionType, amount: number) {
    for (const [pid] of this.players) {
      this.send(pid, {
        type: 'ACTION_CONFIRM',
        playerId,
        action,
        amount,
        pot: this.state.pot,
        currentBet: this.state.currentBet,
        players: [
          this.toPublicPlayer(this.state.players[0], pid)!,
          this.toPublicPlayer(this.state.players[1], pid)!,
        ],
        serverTime: Date.now(),
      });
    }
  }

  private broadcastStreet() {
    this.broadcast({
      type: 'STREET',
      street: this.state.street,
      communityCards: this.state.communityCards,
      pot: this.state.pot,
      currentBet: this.state.currentBet,
      serverTime: Date.now(),
    });
  }

  private broadcastResult(result: {
    winnerId: string;
    winnerHandRank: string;
    potAwarded: number;
    showdown: boolean;
    winningCards?: Card[];
  }) {
    const p0 = this.state.players[0];
    const p1 = this.state.players[1];

    // Store hole cards for "show cards" feature
    this.lastHandHoleCards = {
      seat0: (p0?.holeCards as [Card, Card]) ?? null,
      seat1: (p1?.holeCards as [Card, Card]) ?? null,
      alreadyShown: new Set(),
      showdown: result.showdown,
    };

    for (const [pid] of this.players) {
      this.send(pid, {
        type: 'RESULT',
        result,
        players: [this.toPublicPlayer(p0, pid)!, this.toPublicPlayer(p1, pid)!],
        revealedCards: {
          seat0: result.showdown ? (p0?.holeCards ?? null) : null,
          seat1: result.showdown ? (p1?.holeCards ?? null) : null,
        },
        communityCards: this.state.communityCards,
        serverTime: Date.now(),
      });
    }
  }

  showCards(playerId: string): void {
    // Can only show cards after a hand has ended and before the next one starts
    if (this.state.isHandInProgress) {
      return;
    }

    // Check if player already showed
    if (this.lastHandHoleCards.alreadyShown.has(playerId)) {
      return;
    }

    // Find the player's seat
    const connected = this.players.get(playerId);
    if (!connected) {
      return;
    }

    const seatIndex = this.state.players.findIndex((p) => p?.id === playerId);
    if (seatIndex === -1) {
      return;
    }

    // Get the hole cards from last hand
    const cards = seatIndex === 0 ? this.lastHandHoleCards.seat0 : this.lastHandHoleCards.seat1;
    if (!cards) {
      return;
    }

    // If showdown happened, cards were already revealed
    if (this.lastHandHoleCards.showdown) {
      return;
    }

    // Mark as shown
    this.lastHandHoleCards.alreadyShown.add(playerId);

    // Broadcast to all players
    for (const [pid] of this.players) {
      this.send(pid, {
        type: 'CARDS_SHOWN',
        playerId,
        seatIndex: seatIndex as 0 | 1,
        cards,
      });
    }
  }
}
