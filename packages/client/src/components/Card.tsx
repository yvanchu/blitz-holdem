import type { Card as CardType } from '@bullet-poker/common';

interface CardProps {
  card?: CardType;
  hidden?: boolean;
  size?: 'small' | 'normal';
  highlight?: boolean;
}

const SUIT_SYMBOLS: Record<string, string> = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠',
};

const RANK_DISPLAY: Record<string, string> = {
  T: '10',
  J: 'J',
  Q: 'Q',
  K: 'K',
  A: 'A',
};

// Spoken names for accessible labels (screen readers can't parse suit glyphs).
const RANK_NAMES: Record<string, string> = {
  A: 'Ace',
  K: 'King',
  Q: 'Queen',
  J: 'Jack',
  T: '10',
};

const SUIT_NAMES: Record<string, string> = {
  h: 'hearts',
  d: 'diamonds',
  c: 'clubs',
  s: 'spades',
};

export default function CardComponent({
  card,
  hidden = false,
  size = 'normal',
  highlight = false,
}: CardProps) {
  // Responsive sizes: smaller on mobile
  const sizeClasses =
    size === 'small'
      ? 'w-[44px] h-[62px] sm:w-[45px] sm:h-[63px] text-sm sm:text-sm'
      : 'w-[48px] h-[68px] sm:w-[60px] sm:h-[84px] text-base sm:text-lg';

  if (hidden || !card) {
    return (
      <div
        data-testid="card"
        data-card-hidden="true"
        role="img"
        aria-label="Face-down card"
        className={`${sizeClasses} rounded-lg bg-gradient-to-br from-blue-800 to-blue-900 shadow-lg flex items-center justify-center`}
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 4px,
            rgba(255, 255, 255, 0.05) 4px,
            rgba(255, 255, 255, 0.05) 8px
          )`,
        }}
      >
        <span className="text-white/30 text-2xl">🂠</span>
      </div>
    );
  }

  const isRed = card.suit === 'h' || card.suit === 'd';
  const rankDisplay = RANK_DISPLAY[card.rank] ?? card.rank;
  const suitSymbol = SUIT_SYMBOLS[card.suit];

  // Screen-reader name, e.g. "Ace of spades". Fold the winning state into the
  // label so it isn't communicated by the golden ring/glow alone (UX §Accessibility:
  // "Color is never the only indicator").
  const rankName = RANK_NAMES[card.rank] ?? card.rank;
  const cardLabel = `${rankName} of ${SUIT_NAMES[card.suit] ?? card.suit}`;
  const ariaLabel = highlight ? `${cardLabel}, winning card` : cardLabel;

  return (
    <div
      data-testid="card"
      data-card-rank={card.rank}
      data-card-suit={card.suit}
      role="img"
      aria-label={ariaLabel}
      className={`${sizeClasses} rounded-lg bg-white shadow-lg flex flex-col items-center justify-center font-bold ${
        isRed ? 'text-red-600' : 'text-gray-900'
      } ${highlight ? 'ring-2 ring-yellow-400 shadow-[0_0_14px_rgba(250,204,21,0.85)] animate-pulse' : ''}`}
    >
      <span aria-hidden="true">{rankDisplay}</span>
      <span className="text-xl" aria-hidden="true">
        {suitSymbol}
      </span>
    </div>
  );
}
