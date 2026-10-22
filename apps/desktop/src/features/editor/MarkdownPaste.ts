function containsMarkdown(text: string) {
  return /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|```)/m.test(text)
    || /\[[^\]\n]+\]\([^)]+\)/.test(text)
    || /\|.+\|\s*\n\s*\|?(?:\s*:?-{3,}:?\s*\|)+/m.test(text);
}

export function insertMarkdownPaste(text: string, parse: (text: string) => { content?: unknown } | undefined, insert: (content: unknown) => void) {
  if (!containsMarkdown(text)) return false;
  insert(parse(text)?.content ?? text);
  return true;
}
