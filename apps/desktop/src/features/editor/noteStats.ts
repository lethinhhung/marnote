export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function countCharacters(text: string): number {
  return text.length;
}

export function calculateReadingTime(words: number): number {
  return Math.max(1, Math.ceil(words / 220));
}

export interface NoteStats {
  words: number;
  characters: number;
  readingTimeMinutes: number;
}

export function calculateNoteStats(text: string): NoteStats {
  const words = countWords(text);
  const characters = countCharacters(text);
  const readingTimeMinutes = calculateReadingTime(words);
  return { words, characters, readingTimeMinutes };
}