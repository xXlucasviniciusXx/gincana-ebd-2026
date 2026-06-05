import { type ReactNode } from 'react';

/**
 * Renderiza texto simples vindo do admin com suporte a:
 * - Quebras de linha (\n) — preservadas via `whitespace-pre-line`
 * - Negrito estilo markdown: **texto** vira <strong>texto</strong>
 * - Itálico estilo markdown: *texto* vira <em>texto</em>
 *
 * O <strong>/<em> não força cor: herda a cor do elemento pai,
 * então funciona tanto em fundo claro quanto escuro.
 */
function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // **negrito** primeiro, depois *itálico* (que não faça parte de **)
  const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      nodes.push(
        <strong key={key++} className="font-bold">
          {match[1]}
        </strong>,
      );
    } else if (match[2] !== undefined) {
      nodes.push(
        <em key={key++} className="italic">
          {match[2]}
        </em>,
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

type RichTextProps = {
  text: string;
  className?: string;
};

export default function RichText({ text, className }: RichTextProps) {
  return (
    <p className={`whitespace-pre-line ${className ?? ''}`}>{parseInline(text)}</p>
  );
}
