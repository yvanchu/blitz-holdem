import { useEffect, useState } from 'react';
import { useHandHistoryStore } from '../store/handHistoryStore';
import {
  formatHandHistoryStructured,
  formatHandHistory,
  formatCard,
  SUIT_COLORS,
} from '../utils/handHistoryFormatter';
import type { Card } from '@bullet-poker/common';

const SITE_URL = 'https://bullet-poker-client-production.up.railway.app';

// Card component for inline rendering
function CardDisplay({ card }: { card: Card }) {
  const colorClass = SUIT_COLORS[card.suit];
  return (
    <span className={`font-mono font-bold ${colorClass} bg-white px-1 rounded shadow-sm mx-0.5`}>
      {formatCard(card)}
    </span>
  );
}

// Cards display component
function CardsDisplay({ cards }: { cards: Card[] }) {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      {cards.map((card, i) => (
        <CardDisplay key={i} card={card} />
      ))}
    </span>
  );
}

export function HandHistoryModal() {
  const {
    isModalOpen,
    closeModal,
    completedHands,
    viewingIndex,
    navigatePrev,
    navigateNext,
    exportAllHands,
  } = useHandHistoryStore();

  const [copied, setCopied] = useState(false);

  // Keyboard support: Escape to close, ArrowLeft/Right to browse hands.
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigatePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, closeModal, navigatePrev, navigateNext]);

  if (!isModalOpen) return null;

  const currentHand = viewingIndex >= 0 ? completedHands[viewingIndex] : null;
  const formattedLines = currentHand ? formatHandHistoryStructured(currentHand) : [];
  const totalHands = completedHands.length;

  const handleShareHand = async () => {
    if (!currentHand) return;

    const handText = formatHandHistory(currentHand);
    const shareText = `${handText}

🃏 Played on Bullet Poker - ${SITE_URL}
⏱️ Fast-paced heads-up poker where time is money!`;

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hand-history-title"
        className="bg-zinc-900 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col border border-zinc-700 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h2 id="hand-history-title" className="text-xl font-bold text-white">
            Hand History
          </h2>
          <button
            onClick={closeModal}
            className="text-zinc-400 hover:text-white transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        {totalHands > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-800/50">
            <button
              onClick={navigatePrev}
              disabled={viewingIndex <= 0}
              className="p-2 rounded-lg hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous hand"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <span className="text-zinc-300 font-medium">
              Hand {viewingIndex + 1} of {totalHands}
            </span>

            <button
              onClick={navigateNext}
              disabled={viewingIndex >= totalHands - 1}
              className="p-2 rounded-lg hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next hand"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
          {totalHands === 0 ? (
            <div className="text-center text-zinc-500 py-8">
              <p className="text-4xl mb-4">📜</p>
              <p>No hands played yet.</p>
              <p className="text-xs mt-2">
                Hand history will appear here after each completed hand.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {formattedLines.map((line, i) => {
                switch (line.type) {
                  case 'divider':
                    return (
                      <div key={i} className="text-zinc-600 text-xs overflow-hidden">
                        {line.text}
                      </div>
                    );
                  case 'header':
                    return (
                      <div key={i} className="text-cyan-400 font-bold text-base">
                        {line.text}
                      </div>
                    );
                  case 'subheader':
                    return (
                      <div key={i} className="text-zinc-400 text-xs">
                        {line.text}
                      </div>
                    );
                  case 'section':
                    return (
                      <div
                        key={i}
                        className="text-yellow-500 font-semibold mt-2 flex items-center flex-wrap"
                      >
                        {line.text}
                        {line.cards && <CardsDisplay cards={line.cards} />}
                      </div>
                    );
                  case 'action':
                    return (
                      <div
                        key={i}
                        className={`pl-4 ${line.highlight ? 'text-cyan-300' : 'text-zinc-300'}`}
                      >
                        {line.text}
                      </div>
                    );
                  case 'result':
                    return (
                      <div
                        key={i}
                        className={`pl-4 flex items-center flex-wrap ${line.highlight ? 'text-green-400 font-semibold' : 'text-zinc-300'}`}
                      >
                        {line.text}
                        {line.cards && <CardsDisplay cards={line.cards} />}
                      </div>
                    );
                  case 'empty':
                    return <div key={i} className="h-2" />;
                  default:
                    return (
                      <div key={i} className="text-zinc-300">
                        {line.text}
                      </div>
                    );
                }
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-700 bg-zinc-800/50 space-y-2">
          {/* Share this hand button */}
          <button
            onClick={handleShareHand}
            disabled={totalHands === 0 || !currentHand}
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Share This Hand
              </>
            )}
          </button>

          {/* Export all hands button */}
          <button
            onClick={exportAllHands}
            disabled={totalHands === 0}
            className="w-full py-2.5 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export All Hands (JSON)
          </button>
        </div>
      </div>
    </div>
  );
}
