# Bullet Poker — MVP Product Requirements Document (PRD)

## Summary

Bullet Poker is a heads-up (2-player) no-limit Texas Hold'em poker variant where the currency is time rather than chips. Each player has a time bank measured in seconds. On a player's turn, their time bank continuously decreases; betting, calling, and raising commit seconds from their time bank into the pot. The winner of a hand receives the pot (in seconds) back into their time bank. The MVP delivers a fast, fair, and simple real-time web experience.

## Goals

- Deliver a playable, fair heads-up no-limit Hold'em experience using time as the betting currency.
- Keep UX minimal and intuitive: clear actions, visible countdowns, and simple table flow.
- Ensure low-latency, server-authoritative gameplay with robust synchronization.
- Support quick ad-hoc matches via shareable table links; no complex account system.

## Non-Goals (MVP)

- Multi-table, tournaments, or multi-player tables beyond 2 players.
- Rake, monetization, cosmetics, or complex progression systems.
- Full authentication system or social graphs; use lightweight aliases.
- Mobile-native apps; web-only responsive UI is sufficient.

## Target Users & User Stories

- Casual players seeking quick strategic matches.
- Competitive players interested in time-pressure poker.

User stories:

- As a player, I can create a heads-up table and share a link to invite an opponent.
- As a player, I see my remaining time bank and the pot clearly at all times.
- As a player, I can check, bet specific seconds, call, raise, or fold on my turn.
- As a player, I see a live countdown of my time decreasing during my turn.
- As a player, I can go all-in by committing my remaining seconds.
- As a player, I experience fair, synchronized gameplay even with moderate network latency.

## Core Game Rules (MVP)

- Variant: Heads-up no-limit Texas Hold'em.
- Deck: Standard 52-card deck; server-side shuffle, new deck per hand.
- Positions: Dealer button alternates each hand.
- Blinds: Time blinds (configurable; defaults: SB = 1s, BB = 2s) are posted automatically from players' time banks at the start of each hand.
- Betting currency: Seconds (whole integers; server may permit fractional tracking internally for precision, UI displays integers).
- Betting rules: No limit. Minimum bet/raise equals current big blind or the size of the last raise, consistent with standard NL rules.
- Streets: Preflop, Flop, Turn, River.
- Showdown: Best 5-card poker hand wins the pot (in seconds), which is credit back to the winner's time bank.
- All-in: A player can commit their entire remaining time bank. If both players are all-in prior to the river, remaining community cards are dealt automatically.
- Time drain: While it is a player's turn, their time bank decreases at 1 second per real-time second. Time drain pauses when it is the opponent's turn.
- Insufficient time (table stakes): If a player’s time bank reaches 0, they are **all-in for zero additional seconds** — they are NOT folded. Per standard table-stakes rules, a player cannot be forced to fold for lack of funds: they remain entitled to a showdown for the pot they have **already matched**, and the opponent’s **uncalled bet is refunded**. If checking is legal (no bet to face), they effectively check and stay in. (Table-stakes trumps the time rule. Contrast with **disconnection**, which auto-folds after the grace window — see "Disconnections".)
- Hand end: Winner receives pot seconds added to their time bank. Blinds for next hand are posted from updated banks.

## Time Bank Economy

- Initial time bank: Configurable per match (default: 180s per player). Range 60–900s for testing.
- Blinds: Deducted at hand start from the respective players' banks and immediately added to the pot.
- Action commitments:
  - Bet/Raise: Commits selected seconds from the player's bank to the pot.
  - Call: Commits the required seconds to match the current bet.
  - Check/Fold: Commits 0 seconds to the pot, but decision time still drains the bank.
- Conservation: Pot seconds are transferred to the winner, while decision-time drain reduces total match time over the course of play.

## Gameplay Flow

1. Table creation: Player A creates a table; gets a shareable link.
2. Join: Player B joins; both choose aliases (optional), confirm match settings.
3. Hand start: Server posts SB/BB (SB=dealer in heads-up). Deal hole cards.
4. Action loop per street:
   - Active player’s turn starts; time drain begins.
   - Player chooses action: Check/Call/Bet/Raise/Fold.
   - Server validates, updates pot, banks, and turn state.
   - Next action or next street until showdown or fold.
5. Showdown: Server evaluates hands, awards pot seconds to winner.
6. Next hand: Rotate dealer, post blinds, repeat.

## UX / UI Requirements

- Table UI: Two seats (You/Opponent), dealer button indicator, community cards, pot (seconds), blinds, and clear action buttons.
- Time banks: Prominent countdown displays for each player; active player's timer visibly ticking.
- Bet control: Simple numeric input with quick presets (e.g., 1s, 2s, 5s, pot, all-in). Keyboard shortcuts: C=Check/Call, B=Bet/Raise, F=Fold, A=All-in.
- Feedback: Real-time toasts/status for actions (e.g., "You bet 5s").
- Error states: Disabled actions when insufficient seconds; clear messaging.
- Accessibility: High-contrast theme, focus states, ARIA labels; responsive layout for desktop and mobile web.

## Technical Requirements

- Frontend: React + TypeScript. State management via lightweight solution (e.g., Zustand or Redux Toolkit). UI library optional (e.g., TailwindCSS or CSS Modules).
- Backend: Node.js with WebSocket (e.g., ws or Socket.IO). Server-authoritative game engine managing state, randomness, and rules.
- Synchronization: Server is source of truth for timers and state. Clients receive frequent tick updates (e.g., 4–10 Hz) and reconcile with local interpolation.
- Randomness: Secure, unbiased shuffle server-side (e.g., Fisher-Yates using crypto-grade RNG where available).
- Persistence: In-memory match state (MVP). No DB required. Logs written to server console.
- Deployment: Single-node for MVP. HTTPS and WSS required.

## Networking & Real-Time

- Protocol: WebSocket messages for join/leave, seat state, blinds, cards, betting actions, pot updates, street advancement, showdown, and timer ticks.
- Clock model: Server tracks authoritative remaining times and active turn. Clients render countdowns with drift correction using server timestamps.
- Latency handling: Input buffering with action timestamps. If a client sends an action slightly late due to network but within bank, server processes based on server time, not client.
- Disconnections: If a player disconnects mid-hand while facing action, a grace window (e.g., 5s) applies; time drain continues. After grace, auto-fold if still disconnected. Reconnect restores state.

## Security & Fairness

- Server authoritative: All card dealing, evaluations, pot/time accounting on server.
- Hidden information: Players only receive their own hole cards; no leakage.
- Validation: All actions validated for legality, sufficient time bank, and turn correctness.
- Anti-cheat: No client-side game logic trusted for outcomes. Rate-limit message floods.

## Edge Cases & Rules Clarifications

- Fractional seconds: Internal server math may be fractional; UI rounds to nearest whole second for display. Pot commits use integers by default.
- Minimum bet: At least big blind or size of last raise; enforce standard NL rules.
- Timeout = all-in for zero (table stakes): When a player’s time hits 0 they go all-in for **zero additional** seconds rather than folding. They contest only the pot they have already matched; any uncalled bet is refunded to the opponent, and the hand runs out to showdown. Only **disconnection** (not a timeout) results in an auto-fold — see "Disconnections".
- All-in with imbalance: Side pots handled using seconds analogous to chips; MVP may restrict to simple pots if complexity is high (prefer single-pot scenarios for MVP).
- Rejoining: Player can rejoin same table via link; seat reserved for a short timeout.

## Telemetry (MVP)

- Metrics: Hand count, average decision time, average pot size (seconds), folds vs showdowns, disconnect events.
- Client logs: Action events and latency samples; opt-in only.

## Configurable Settings (Server)

- Initial time bank (default 180s).
- Small blind (default 1s), big blind (default 2s).
- Timer tick rate (default 6 Hz).
- Disconnect grace period (default 5s).

## Acceptance Criteria

- Players can complete a full hand (preflop to showdown) with time blinds and seconds-based betting.
- Time drains only on the active player’s turn; stops when turn passes.
- Pot and time banks update correctly for bet, call, raise, fold, and showdown.
- All-in flows work; winner receives pot seconds.
- Server prevents illegal actions (e.g., bet with insufficient seconds).
- Two players can play via shareable link with synchronized state under <200ms median latency.

## Rollout Plan

- Internal playtest with scripted latencies.
- Closed beta via invite links; gather feedback.
- Iterate on UI clarity and timer sync issues.

## Roadmap (Post-MVP)

- Ranked queues and basic ELO.
- Replays and hand histories.
- Mobile-first refinements.
- Cosmetics and personalization.
- Persistent accounts and profiles.

## Open Questions

- Should call semantics require spending decision time equal to the call, or should call instantly commit required seconds regardless of deliberation time? (Current MVP: call commits required seconds; deliberation time drains separately.)
- Do we allow fractional-second bets in UI for finer control?
- Do we prefer antes over blinds for simplifying heads-up flow?
- Should time banks ever regenerate (e.g., per-hand refresh), or remain total-sum decreasing?
- What is the exact minimum raise rule mapping when using seconds (follow standard NL: min raise = last total raise amount)?
