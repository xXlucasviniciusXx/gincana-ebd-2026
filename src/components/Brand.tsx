import { useEffect, useState } from 'react';

type Variant = 'horizontal' | 'compact';

const FALLBACK_LOGO = '/logo-gincana.jpg';
const FALLBACK_CHURCH = '/logo-igreja.png';

function useImageExists(src: string) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setOk(true);
    img.onerror = () => setOk(false);
    img.src = src;
  }, [src]);
  return ok;
}

export function GincanaLogo({
  size = 48,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const exists = useImageExists(FALLBACK_LOGO);
  if (exists === false) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-brand-navy text-white font-bold ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.32 }}
        aria-label="Gincana EBD 2026"
      >
        EBD
      </div>
    );
  }
  return (
    <img
      src={FALLBACK_LOGO}
      alt="Gincana EBD 2026"
      width={size}
      height={size}
      className={`object-contain ${className}`}
    />
  );
}

export function ChurchLogo({
  size = 36,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const exists = useImageExists(FALLBACK_CHURCH);
  if (exists === false) {
    return (
      <span className={`text-xs font-semibold text-brand-red ${className}`}>
        Igreja Missionária Emanuel
      </span>
    );
  }
  return (
    <img
      src={FALLBACK_CHURCH}
      alt="Igreja Missionária Emanuel"
      height={size}
      style={{ height: size, width: 'auto' }}
      className={`object-contain ${className}`}
    />
  );
}

export function BrandHeader({ variant = 'horizontal' }: { variant?: Variant }) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <GincanaLogo size={36} />
        <div className="leading-tight">
          <div className="heading-display text-base font-bold text-white">
            Gincana EBD 2026
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <GincanaLogo size={56} />
      <div className="leading-tight">
        <div className="heading-display text-xl font-bold text-white">
          Gincana EBD 2026
        </div>
        <div className="text-[11px] uppercase tracking-widest text-white/70">
          Conhecendo a Palavra · Vivendo a Verdade
        </div>
      </div>
    </div>
  );
}
