import { useHandHistoryStore } from '../store/handHistoryStore';

export function HandHistoryButton() {
  const { openModal, completedHands } = useHandHistoryStore();
  const handCount = completedHands.length;

  const hasHistory = handCount > 0;

  return (
    <button
      onClick={hasHistory ? openModal : undefined}
      disabled={!hasHistory}
      className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg border shadow-lg transition-colors ${
        hasHistory
          ? 'bg-zinc-800/90 hover:bg-zinc-700 border-zinc-600'
          : 'bg-zinc-900/70 border-zinc-700 opacity-60 cursor-not-allowed'
      }`}
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
      <span
        className={`min-w-[20px] h-5 px-1.5 text-white text-xs font-bold rounded-full flex items-center justify-center ${
          hasHistory ? 'bg-cyan-500' : 'bg-zinc-600'
        }`}
      >
        {handCount > 99 ? '99+' : handCount}
      </span>
    </button>
  );
}
