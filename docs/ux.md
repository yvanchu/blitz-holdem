# Blitz Hold'em - UI Design Brief for Figma Make

## App Concept

**Blitz Hold'em** is a heads-up (1v1) No-Limit Texas Hold'em poker game where **time is the currency**. Instead of chips, players bet seconds from their "time bank" (starting at 60s). When your time bank hits zero, you lose. This creates intense, fast-paced gameplay where every second counts.

---

## Task

Design a mobile-first, high-fidelity UI for a real-time poker game. The design should feel like a premium digital poker experience with a modern, minimal aesthetic—not a casino game with gaudy decorations.

## Output

A responsive design system with frames for:

1. **Mobile portrait** (iPhone 15 Pro - 393×852px) - Primary focus
2. **Tablet landscape** (iPad - 1024×768px) - Secondary
3. **Desktop** (1440×900px) - Optional stretch goal

---

## Visual Style

### Theme: "Digital Neon Poker"

- **Background**: Deep forest green (#0D1F12) felt texture, subtle and classy
- **Accent colors**:
  - Emerald green (#10B981) for positive actions (check, call)
  - Amber/Gold (#F59E0B) for betting/raising
  - Red (#EF4444) for fold and warnings
  - Blue (#3B82F6) for informational elements
- **Typography**: Clean sans-serif (Inter or SF Pro) with **digital/mono font for numbers** (time banks, pot, bets)
- **Cards**: Clean, readable card faces with subtle shadows
- **Overall feel**: Dark mode, glassmorphic panels, subtle glows—like a high-end digital poker table

---

## Screen Layout (Mobile Portrait - Primary)

### Structure (top to bottom):

```
┌─────────────────────────────┐
│  Header: Room ID + Copy Link │  <- Minimal, dark bar
├─────────────────────────────┤
│                             │
│    [Opponent Seat]          │  <- Top of play area
│    Avatar + Name + Timer    │
│    [Two hole cards]         │
│    [Bet chip if betting]    │
│                             │
│  ─────────────────────────  │
│                             │
│    [5 Community Cards]      │  <- Center
│    [Pot: XXs]               │
│                             │
│  ─────────────────────────  │
│                             │
│    [Bet chip if betting]    │
│    [Your two hole cards]    │
│    Avatar + Name + Timer    │  <- Bottom of play area
│    [Your Seat]              │
│                             │
├─────────────────────────────┤
│      [Action Bar]           │  <- Sticky bottom
│  Fold | Call/Check | Raise  │
│  [Raise slider when active] │
└─────────────────────────────┘
```

---

## Key Components

### 1. Player Seat Component

Each player seat displays:

- **Avatar**: Circular, 40-48px, with first letter of alias
- **Alias**: Player name (max ~12 chars)
- **Time Bank**: Digital clock display (e.g., "45s") with color coding:
  - White/Green: > 30s (healthy)
  - Yellow: 10-30s (warning)
  - Red + pulse animation: < 10s (critical)
- **Active indicator**: Glowing ring or highlight when it's their turn
- **Dealer button**: Small "D" badge on the dealer
- **Status badges**: "ALL IN" (red) or "FOLD" (gray) when applicable
- **Current bet chip**: Yellow pill showing bet amount (e.g., "12s") positioned between player and center

**Layout**: Horizontal row: [Avatar] [Name column] [Timer]

### 2. Community Cards Area

- 5 card slots in a horizontal row
- Empty slots shown as dashed outlines
- Cards animate in when dealt
- Winning cards highlighted with golden glow at showdown

### 3. Pot Display

- Centered below community cards
- Dark pill/badge with "Pot: XXs"
- **Digital/mono font** for the number
- Subtle golden/yellow accent color

### 4. Action Bar (Critical Component)

Fixed to bottom of screen. Two states:

**Default State** (3-button row):

```
┌─────────────────────────────────────────┐
│  [FOLD]    [CALL XXs]    [RAISE]        │
│   red       green         amber          │
└─────────────────────────────────────────┘
```

**Raise Panel Expanded** (replaces default):

```
┌─────────────────────────────────────────┐
│  Presets:  [33%]  [75%]  [150%]  [MAX]  │
│                                          │
│  ◄━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━► │
│          [  42  ] s    (input field)     │
│                                          │
│  [FOLD]    [CALL]    [RAISE 42s]        │
│                        ↑ shows amount    │
└─────────────────────────────────────────┘
```

**Button behaviors**:

- FOLD: Always available, red/danger styling, extra padding to prevent misclicks
- CALL/CHECK: Green, shows "Check" when no bet to call, "Call Xs" when there's a bet
- RAISE/BET: Amber/gold, opens the raise panel, shows "Bet" pre-flop with no prior bet

### 5. Cards

- **Face-up cards**: White background, clear rank + suit, standard playing card look
- **Face-down cards**: Dark back design with subtle pattern
- **Size**: ~60×84px on mobile, scales up on larger screens
- **Winning highlight**: Golden border/glow on cards that make the winning hand

### 6. "Show Cards" Button

Appears after a hand ends (when you won by opponent folding):

- Small, secondary button near your cards
- "Show Cards" - reveals your hand to opponent (optional/voluntary)

---

## Interactions & States

### Turn Indicator

- When it's your turn: Action bar buttons fully enabled, your seat has glowing border
- When waiting: Action bar buttons dimmed/disabled, opponent seat highlighted

### Time Ticking

- Active player's time bank counts down in real-time
- At < 10 seconds: number turns red and pulses

### All-In Showdown

- When both players are all-in, both hole cards are revealed
- Community cards deal out with delays between streets
- Dramatic reveal moment

### Result State

- Winner's cards highlighted
- "+XXs" gain shown next to winner's timer
- Brief pause before next hand auto-starts

---

## Responsive Considerations

### Mobile (< 640px)

- Compact spacing, smaller cards
- Action bar takes full width
- Raise presets in scrollable row if needed

### Tablet/Desktop (≥ 640px)

- More breathing room
- Larger cards and text
- Action bar can be wider with more horizontal space

---

## Design Tokens (Figma Variables)

### Spacing

- `space-xs`: 4px
- `space-sm`: 8px
- `space-md`: 16px
- `space-lg`: 24px
- `space-xl`: 32px

### Colors

- `bg-felt`: #0D1F12 (main background)
- `bg-surface`: #1F2937 (panels, cards backgrounds)
- `bg-surface-dark`: #111827 (darker panels)
- `accent-success`: #10B981 (check, call, win)
- `accent-warning`: #F59E0B (raise, bet, pot)
- `accent-danger`: #EF4444 (fold, critical time)
- `accent-info`: #3B82F6 (informational)
- `text-primary`: #FFFFFF
- `text-secondary`: #9CA3AF
- `border-subtle`: #374151

### Typography

- `font-display`: Inter/SF Pro (UI text)
- `font-mono`: JetBrains Mono or SF Mono (numbers, timers)

---

## Reference Mood

- Clean like Apple's design language
- Dark mode aesthetic similar to Discord or Spotify
- The premium feel of a high-stakes poker app, not a casual mobile game
- Minimal chrome, maximum focus on the cards and action

---

## Framer Wireframer Prompt

> Note: Wireframer generates website pages, not app UI systems. Use this to create a landing page or game interface mockup.

### Landing Page Prompt

```
Create a dark, premium landing page for "Blitz Hold'em" - a heads-up poker game where you bet TIME instead of chips.

Hero section: Large headline "Bet Your Time. Win Their Time." with subtext explaining the concept. Show a mockup of the game interface on a phone. CTA button "Play Now" in emerald green.

Features section: 3 cards explaining - "Time is Money" (bet seconds from your 60s bank), "Heads-Up Action" (intense 1v1 battles), "Zero to Hero" (hit zero, you lose).

How it works: Simple 3-step visual - Join a room, Play poker with time bets, Winner takes the pot in seconds.

Style: Dark forest green background (#0D1F12), glassmorphic cards, emerald (#10B981) and amber (#F59E0B) accents, mono font for numbers, minimal and premium feel like a fintech app.

Footer: Simple links and "Start Playing" CTA.
```

### Game Interface Page Prompt

```
Create a poker game interface page with dark theme.

Layout (vertical, mobile-style):
- Top bar: "Room: ABC123" with copy icon
- Opponent area: Circle avatar with "P" letter, name "Player2", timer showing "45s" in mono font, two playing cards (face down), yellow chip showing "10s" bet
- Center: Row of 5 playing cards (3 face-up showing hearts/spades, 2 empty slots with dashed borders), below that a pill showing "Pot: 24s" in yellow
- Your area: Yellow chip "10s", two face-up cards (Ace of spades, King of hearts), circle avatar, name "You", timer "38s"
- Bottom action bar: Three buttons - "FOLD" (red outline), "CALL 10s" (green filled), "RAISE" (amber outline)

Colors: Background #0D1F12 (dark green), cards white with shadows, buttons use red (#EF4444), green (#10B981), amber (#F59E0B). All numbers in monospace font.

Feel: Premium poker app, minimal, dark mode, not a casino game.
```
