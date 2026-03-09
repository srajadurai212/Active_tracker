export interface HighlightChunk {
  text: string;
  match: boolean;
}

interface UseHighlightInput {
  query: string | string[];
  text: string;
}

export function useHighlight({ query, text }: UseHighlightInput): HighlightChunk[] {
  const queries = (Array.isArray(query) ? query : [query]).filter((q) => q.trim().length > 0);
  if (!queries.length) return [{ text, match: false }];

  const escaped = queries.map((q) => q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const chunks: HighlightChunk[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      chunks.push({ text: text.slice(lastIndex, match.index), match: false });
    }
    chunks.push({ text: match[0], match: true });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    chunks.push({ text: text.slice(lastIndex), match: false });
  }
  return chunks.length ? chunks : [{ text, match: false }];
}
