# Blitz Hold'em - UX Design Principles

## Product Philosophy

**Blitz Hold'em** is heads-up No-Limit Texas Hold'em where time is the currency. Players bet seconds from their time bank—hit zero, you lose. Every design decision should reinforce that **time is precious** and **every second matters**.

---

## Core Design Principles

### 1. Clarity Over Decoration

**The Problem**: Casino games are cluttered with animations, gold trim, and visual noise that distract from gameplay.

**Our Approach**:

- Remove anything that doesn't serve gameplay
- No decorative elements (flames, sparkles, 3D effects)
- Clean typography, clear hierarchy
- Information should be scannable in <1 second

**Test**: Can a player glance at the screen and instantly know: whose turn it is, how much time they have, what the pot is, and what actions are available?

---

### 2. Time Anxiety is a Feature

**The Mechanic**: Time is literally draining. The UI should make this feel urgent without being stressful to the point of frustration.

**Implementation**:

- Time banks use monospace/digital font (numbers should feel like a countdown)
- Color progression: white → yellow (< 30s) → red (< 10s)
- Subtle pulse animation at critical levels (< 10s)
- No screen shake or aggressive animations—tension comes from the number itself

**Anti-pattern**: Don't hide the timer or make it small. It's the central mechanic.

---

### 3. Prevent Costly Mistakes

**The Stakes**: A misclick could cost you the entire pot (your time bank).

**Implementation**:

- FOLD button is visually distinct (outlined, not filled) and has extra padding
- Destructive actions require deliberate targeting
- RAISE requires two taps: first to open panel, second to confirm amount
- Call/Check are safe defaults (green, prominent)
- No confirmation dialogs—speed matters—but layout prevents accidents

**The Fold Zone**: Extra whitespace around the fold button. It should never be adjacent to Call/Raise.

---

### 4. Mobile-First, Touch-Optimized

**Reality**: Most players will be on phones, often one-handed.

**Implementation**:

- Minimum touch targets: 44×44px (Apple HIG)
- Action bar at bottom of screen (thumb-reachable)
- Important info in the center vertical third (easy to see without adjusting grip)
- Slider for raise amounts (more natural than +/- buttons on mobile)
- Preset buttons (33%, 75%, 150%, MAX) for quick betting

**Test**: Can you play a full hand holding your phone in one hand without repositioning?

---

### 5. Information Hierarchy

**What matters most** (in order):

1. Whose turn is it?
2. How much time do I/they have?
3. What are the hole cards?
4. What's on the board?
5. What's the pot?
6. What are my action options?

**Visual Hierarchy**:

- Active player has glowing/highlighted border
- Time banks are prominent with large, digital font
- Cards are the visual focus (largest elements)
- Pot is secondary (visible but not dominant)
- Action bar is distinct from the table area

---

### 6. State Communication

Every game state should be immediately obvious:

| State            | Visual Treatment                                    |
| ---------------- | --------------------------------------------------- |
| My turn          | Glowing border on my seat, action bar fully enabled |
| Waiting          | Opponent highlighted, action bar dimmed             |
| All-in           | Red "ALL IN" badge, cards revealed during runout    |
| Folded           | Gray "FOLD" badge, cards removed/dimmed             |
| Hand won         | Winner's cards highlighted golden, "+Xs" gain shown |
| Low time (< 10s) | Timer red + pulse animation                         |

---

### 7. Consistent Color Language

Colors have meaning. Use them consistently:

| Color           | Meaning           | Usage                             |
| --------------- | ----------------- | --------------------------------- |
| Green (#10B981) | Safe/positive     | Check, Call, winning              |
| Amber (#F59E0B) | Betting/neutral   | Raise, Bet, pot, chips            |
| Red (#EF4444)   | Danger/loss       | Fold, low time, losing            |
| White           | Default           | Text, healthy time                |
| Gray            | Disabled/inactive | Unavailable actions, folded state |

**Rule**: Never use green for a destructive action. Never use red for a positive outcome.

---

### 8. Typography Rules

**Fonts**:

- UI text: System sans-serif (Inter, SF Pro, or system default)
- Numbers: Monospace (for timers, pot, bets)—creates "digital clock" feel

**Sizing**:

- Time banks: Large (16-20px), bold
- Pot: Medium (14-16px)
- Player names: Small (12-14px)
- Buttons: Medium (14-16px), uppercase for actions

**Number Formatting**:

- Always show unit: "45s" not "45"
- Round to whole seconds in display
- Use tabular/monospace figures so numbers don't jump around

---

### 9. Animation Guidelines

**Do**:

- Cards dealing in (subtle slide + fade)
- Timer color transitions (smooth)
- Button state changes (quick, 150ms)
- Winning cards glow (pulse)

**Don't**:

- Screen shake
- Confetti/particles
- Slow, elaborate animations
- Anything that delays gameplay

**Rule**: Animations should be < 300ms. If it's not informative, cut it.

---

### 10. Dark Theme Rationale

**Why dark**:

- Reduces eye strain for extended play
- Creates focus (bright elements pop)
- Feels premium and modern
- Traditional poker table aesthetic (green felt)

**Background**: Deep forest green (#0D1F12)—poker table feel without being garish.

**Contrast**: All text must meet WCAG AA contrast (4.5:1 minimum).

---

## Component Guidelines

### Cards

- Aspect ratio: ~5:7 (standard playing card)
- Mobile size: 40-60px wide
- Desktop size: 60-80px wide
- Face-up: White background, clear rank/suit
- Face-down: Dark, subtle pattern
- Highlighted: Golden border/glow for winning hand

### Player Seat

- Avatar: Circle with initial letter (40-48px)
- Layout: `[Avatar] [Name + Timer]` horizontal
- Active state: Glowing ring/border
- Badges: Positioned top-left (Dealer "D", "ALL IN", "FOLD")

### Bet Chips

- Style: Pill/capsule shape
- Color: Amber/yellow
- Format: "12s" (amount + unit)
- Position: Between player and center (shows bet flowing to pot)

### Action Bar

- Position: Fixed to bottom
- Layout: 3 buttons minimum (Fold | Call/Check | Raise)
- Expanded: Slider + presets + amount display
- Height: ~120px default, ~200px expanded

---

## Responsive Breakpoints

| Breakpoint | Target  | Adjustments                           |
| ---------- | ------- | ------------------------------------- |
| < 640px    | Mobile  | Compact cards, full-width action bar  |
| 640-1024px | Tablet  | Larger cards, more spacing            |
| > 1024px   | Desktop | Maximum card size, comfortable layout |

**Principle**: The game should be playable at any size. Mobile is not a degraded experience.

---

## Accessibility Considerations

- Color is never the only indicator (use icons, text, position)
- Touch targets ≥ 44px
- Text contrast ≥ 4.5:1
- Animation respects `prefers-reduced-motion`
- Timer changes communicated through multiple channels (color + size + optional sound)

---

## Anti-Patterns to Avoid

❌ Chip stacks with 3D perspective  
❌ Realistic card textures/shadows  
❌ Avatar photo uploads (keep it simple)  
❌ Chat/social features in main UI  
❌ Sound that can't be muted  
❌ Landscape-only orientation  
❌ Slow dealing animations  
❌ Modal dialogs during gameplay  
❌ Hidden or collapsed critical info  
❌ Multiple font weights/sizes without purpose

---

## Reference Products

**Learn from**:

- Robinhood (financial UI, clean data display)
- Duolingo (gamification without clutter)
- Chess.com mobile (competitive game, clean UI)
- Apple Calculator (digital display aesthetic)

**Avoid**:

- Zynga Poker (cluttered, casino aesthetic)
- Most casino apps (visual noise, dark patterns)

---

## Success Metrics

The UI is successful if:

1. New players understand the game in < 30 seconds
2. Players can complete actions in < 2 seconds
3. Misclicks (especially fold) are rare (< 1%)
4. Players report the game "feels fast"
5. Mobile and desktop feel equally good
