interface TimerProps {
  timeBank: number;
  isActive: boolean;
  isAllIn: boolean;
}

export default function Timer({ timeBank, isActive, isAllIn }: TimerProps) {
  const seconds = Math.max(0, Math.round(timeBank));

  const formatted = `${seconds}s`;

  // Color based on time remaining
  let colorClass = 'text-white';
  if (seconds <= 10) {
    colorClass = 'text-red-500 animate-pulse';
  } else if (seconds <= 30) {
    colorClass = 'text-yellow-400';
  }

  // Show actual time bank value - player might have gotten a refund even if all-in
  if (isAllIn) {
    return (
      <div className="ml-2 px-3 py-1 bg-gray-700 rounded-lg">
        <span className={`font-mono text-sm ${seconds > 0 ? colorClass : 'text-gray-400'}`}>
          {formatted}
        </span>
      </div>
    );
  }

  return (
    <div className={`ml-2 px-3 py-1 rounded-lg ${isActive ? 'bg-yellow-500/30' : 'bg-gray-700'}`}>
      <span className={`font-mono text-sm font-bold ${colorClass}`}>{formatted}</span>
    </div>
  );
}
