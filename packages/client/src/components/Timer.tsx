interface TimerProps {
  timeBank: number;
  isActive: boolean;
  isAllIn: boolean;
}

export default function Timer({ timeBank, isActive, isAllIn }: TimerProps) {
  const seconds = Math.max(0, Math.round(timeBank));
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  const formatted = minutes > 0 ? `${minutes}:${secs.toString().padStart(2, '0')}` : `${secs}s`;

  // Color based on time remaining
  let colorClass = 'text-white';
  if (seconds <= 10) {
    colorClass = 'text-red-500 animate-pulse';
  } else if (seconds <= 30) {
    colorClass = 'text-yellow-400';
  }

  if (isAllIn) {
    return (
      <div className="ml-2 px-3 py-1 bg-gray-700 rounded-lg">
        <span className="text-gray-400 font-mono text-sm">0s</span>
      </div>
    );
  }

  return (
    <div className={`ml-2 px-3 py-1 rounded-lg ${isActive ? 'bg-yellow-500/30' : 'bg-gray-700'}`}>
      <span className={`font-mono text-sm font-bold ${colorClass}`}>{formatted}</span>
    </div>
  );
}
