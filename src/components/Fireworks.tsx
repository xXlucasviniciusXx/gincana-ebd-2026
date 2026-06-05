import { useMemo } from 'react';

const COLORS = ['#f5b921', '#ef6a36', '#2ea3a5', '#ffffff', '#c0392b', '#a78bfa'];

/**
 * Fogos de artifício decorativos: vários estouros, cada um com
 * partículas que irradiam do centro (via CSS vars --tx/--ty e a
 * animação `firework` definida no tailwind.config.js).
 */
export default function Fireworks() {
  const bursts = useMemo(
    () =>
      Array.from({ length: 6 }, (_, b) => {
        const particles = Array.from({ length: 14 }, (_, p) => {
          const angle = (p / 14) * Math.PI * 2;
          const dist = 55 + Math.random() * 45;
          return {
            id: p,
            tx: Math.cos(angle) * dist,
            ty: Math.sin(angle) * dist,
            color: COLORS[(b + p) % COLORS.length],
          };
        });
        return {
          id: b,
          left: 8 + Math.random() * 84,
          top: 6 + Math.random() * 46,
          delay: Math.random() * 3.5,
          particles,
        };
      }),
    [],
  );

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {bursts.map((burst) => (
        <div
          key={burst.id}
          className="absolute"
          style={{ left: `${burst.left}%`, top: `${burst.top}%` }}
        >
          {burst.particles.map((p) => {
            const style = {
              backgroundColor: p.color,
              boxShadow: `0 0 6px ${p.color}`,
              animationDelay: `${burst.delay}s`,
              '--tx': `${p.tx}px`,
              '--ty': `${p.ty}px`,
            } as React.CSSProperties;
            return (
              <span
                key={p.id}
                className="absolute block h-1.5 w-1.5 rounded-full animate-firework"
                style={style}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
