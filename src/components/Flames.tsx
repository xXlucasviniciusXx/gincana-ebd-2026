import { useMemo } from 'react';

const FIRE_URL =
  'https://dmvqnqjctlgxeacdnkoq.supabase.co/storage/v1/object/public/gincana/escape/fire.gif';

/**
 * Chamas decorativas no rodapé — em todas as páginas enquanto o Escape
 * está ABERTO. Usa um GIF de fogo real (Nevit, CC BY-SA 3.0) como faixa
 * no rodapé; o fundo preto é fundido no conteúdo por uma máscara que
 * desaparece no topo. Brasas sobem por cima. Decorativo (`pointer-events: none`).
 */
export default function Flames() {
  const embers = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 5,
        dur: 1.8 + Math.random() * 2,
        delay: Math.random() * 3,
        ex: `${Math.random() * 60 - 30}px`,
      })),
    [],
  );

  const fade = 'linear-gradient(to top, #000 18%, rgba(0,0,0,0.85) 45%, transparent 100%)';

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-44"
      style={{ overflow: 'visible' }}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${FIRE_URL})`,
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'auto 100%',
          backgroundPosition: 'center bottom',
          WebkitMaskImage: fade,
          maskImage: fade,
        }}
      />

      {/* brasas subindo */}
      {embers.map((e) => (
        <span
          key={`e${e.id}`}
          className="absolute bottom-6 block rounded-full"
          style={
            {
              left: `${e.left}%`,
              width: `${e.size}px`,
              height: `${e.size}px`,
              background: '#ffd24a',
              boxShadow: '0 0 7px 1px #ff8a00',
              '--ex': e.ex,
              animation: `ember-rise ${e.dur}s ease-out ${e.delay}s infinite`,
            } as React.CSSProperties
          }
        />
      ))}

      {/* crédito da licença (CC BY-SA 3.0) */}
      <a
        href="https://commons.wikimedia.org/wiki/File:Animated_fire_by_nevit.gif"
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto absolute bottom-0 right-1 text-[9px] text-white/45 hover:text-white/80"
      >
        fogo: Nevit · CC BY-SA 3.0
      </a>
    </div>
  );
}
