import { useState } from 'react';

type Props = {
  title: string;
  text?: string;
  /** Se omitido, usa location.href. */
  url?: string;
  className?: string;
};

export default function ShareButtons({ title, text, url, className = '' }: Props) {
  const [copied, setCopied] = useState(false);

  function getUrl(): string {
    if (url) return url;
    if (typeof window !== 'undefined') return window.location.href;
    return '';
  }

  function shareNative() {
    const fullUrl = getUrl();
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({ title, text: text ?? title, url: fullUrl })
        .catch(() => {
          /* usuário cancelou ou erro — ignora */
        });
    } else {
      // Fallback: copia link
      copyLink();
    }
  }

  function shareWhatsApp() {
    const msg = `${text ?? title}\n${getUrl()}`;
    const link = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(link, '_blank', 'noopener,noreferrer');
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* navegador antigo — ignora */
    }
  }

  const hasNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {hasNativeShare && (
        <button
          type="button"
          onClick={shareNative}
          className="inline-flex items-center gap-2 rounded-full bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-navy-light"
        >
          📤 Compartilhar
        </button>
      )}
      <button
        type="button"
        onClick={shareWhatsApp}
        className="inline-flex items-center gap-2 rounded-full bg-[#25d366] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1ebe59]"
      >
        💬 WhatsApp
      </button>
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50"
      >
        {copied ? '✓ Copiado!' : '🔗 Copiar link'}
      </button>
    </div>
  );
}
