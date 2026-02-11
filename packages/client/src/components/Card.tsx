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

export default function CardComponent({
  card,
  hidden = false,
  size = 'normal',
  highlight = false,
}: CardProps) {
  // Responsive sizes: smaller on mobile
  const sizeClasses =
    size === 'small'
      ? 'w-[36px] h-[50px] sm:w-[45px] sm:h-[63px] text-xs sm:text-sm'
      : 'w-[40px] h-[56px] sm:w-[60px] sm:h-[84px] text-sm sm:text-lg';

  if (hidden || !card) {
    return (
      <div
        data-testid="card"
        data-card-hidden="true"
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

  return (
    <div
      data-testid="card"
      data-card-rank={card.rank}
      data-card-suit={card.suit}
      className={`${sizeClasses} rounded-lg bg-white shadow-lg flex flex-col items-center justify-center font-bold ${
        isRed ? 'text-red-600' : 'text-gray-900'
      } ${highlight ? 'ring-2 ring-yellow-400 transform -translate-y-2 transition-transform' : ''}`}
    >
      <span>{rankDisplay}</span>
      <span className="text-xl">{suitSymbol}</span>
    </div>
  );
}
