export function normalize(text: string): string {
  return text.toLocaleLowerCase();
}

export function makeExcerpt(sourceText: string, query: string): string {
  const body = normalize(sourceText);
  const words = query.split(/\s+/).filter(Boolean).map(normalize);
  if (!words.length) {
    const trimmed = sourceText.replace(/\s+/g, " ").trim();
    return trimmed.slice(0, 140) + (trimmed.length > 140 ? "…" : "");
  }
  const matches = words.map(word => ({ word, index: body.indexOf(word) })).filter(m => m.index >= 0);
  if (!matches.length) return "";
  matches.sort((a, b) => a.index - b.index);
  const first = matches[0];
  const last = matches[matches.length - 1];
  const start = Math.max(0, first.index - 55);
  const end = Math.min(sourceText.length, last.index + last.word.length + 85);
  return `${start ? "…" : ""}${sourceText.slice(start, end).replace(/\s+/g, " ").trim()}${end < sourceText.length ? "…" : ""}`;
}