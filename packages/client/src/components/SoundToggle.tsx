import { useState } from 'react';
import { isMuted, toggleMuted } from '../sound/soundEngine';

export function SoundToggle() {
  const [muted, setMutedState] = useState(isMuted());

  const handleClick = () => {
    toggleMuted();
    setMutedState(isMuted());
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
      aria-pressed={muted}
      title={muted ? 'Sound off' : 'Sound on'}
      className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800/90 hover:bg-gray-700 border border-zinc-600 shadow-lg transition-colors"
    >
      <svg
        className="w-5 h-5 text-zinc-200"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        {/* Speaker body */}
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M11 5L6 9H3v6h3l5 4V5z"
        />
        {muted ? (
          // Muted: an X to the right of the speaker
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 9l4 6m0-6l-4 6"
          />
        ) : (
          // Active: sound waves
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15.54 8.46a5 5 0 010 7.07M18.07 5.93a9 9 0 010 12.73"
          />
        )}
      </svg>
    </button>
  );
}
