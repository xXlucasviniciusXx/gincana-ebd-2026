import { useEffect, useState } from 'react';

type Props = {
  target: string | Date;
  label?: string;
};

function diff(target: Date) {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export default function Countdown({ target, label }: Props) {
  const targetDate = typeof target === 'string' ? new Date(target) : target;
  const [remaining, setRemaining] = useState(() => diff(targetDate));

  useEffect(() => {
    const id = setInterval(() => setRemaining(diff(targetDate)), 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (!remaining) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
        ⏱️ Encerrado
      </div>
    );
  }

  const segments: { value: number; unit: string }[] = [
    { value: remaining.days, unit: 'd' },
    { value: remaining.hours, unit: 'h' },
    { value: remaining.minutes, unit: 'm' },
    { value: remaining.seconds, unit: 's' },
  ];

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white">
      ⏰ {label && <span className="opacity-80">{label}</span>}
      <span className="flex items-baseline gap-1 font-mono">
        {segments.map((s, i) => (
          <span key={s.unit}>
            <span className="text-sm font-bold">{String(s.value).padStart(2, '0')}</span>
            <span className="opacity-70">{s.unit}</span>
            {i < segments.length - 1 && <span className="mx-0.5 opacity-40">·</span>}
          </span>
        ))}
      </span>
    </div>
  );
}
