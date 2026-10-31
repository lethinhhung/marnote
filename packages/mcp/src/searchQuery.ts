export function normalize(text: string): string {
  return text.toLocaleLowerCase();
}

export function parseQuery(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(normalize);
}

export function hasWords(value: string, words: string[]): boolean {
  return words.every((word) => value.includes(word));
}