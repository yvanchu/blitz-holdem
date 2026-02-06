import { useHandHistoryStore } from '../store/handHistoryStore';

export function HandHistoryButton() {
  const { openModal, completedHands } = useHandHistoryStore();
  const handCount = completedHands.length;

  // Don't show button if no hands have been played
  if (handCount === 0) return null;

  return (
    <button
      onClick={openModal}
      className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-600 rounded-lg shadow-lg transition-all hover:scale-105 active:scale-95"
      aria-label="Hand History"
    >
      {/* Document icon */}
      <svg
        className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>

      <span className="text-zinc-200 text-sm font-medium">Hand History</span>

      {/* Badge with hand count */}
      <span className="min-w-[20px] h-5 px-1.5 bg-cyan-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
        {handCount > 99 ? '99+' : handCount}
      </span>
    </button>
  );
}
