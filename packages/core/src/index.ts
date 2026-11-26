export * from "./workspace.js";
export * from "./links.js";
export * from "./search.js";
export * from "./searchQuery.js";
export * from "./buildSearchChoices.js";

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

export function getWelcomeMessage(): string {
  return "A calm place for your notes, files, and ideas.";
}

const emojiByShortcode: Record<string, string> = {
  smile: "😄", grin: "😁", joy: "😂", laugh: "😆", wink: "😉", heart: "❤️",
  thumbsup: "👍", thumbsdown: "👎", clap: "👏", pray: "🙏", fire: "🔥",
  star: "⭐", tada: "🎉", rocket: "🚀", eyes: "👀", thinking: "🤔",
  sob: "😭", cry: "😢", wave: "👋", check: "✅", x: "❌", warning: "⚠️",
  coffee: "☕", sun: "☀️", moon: "🌙", dog: "🐶", cat: "🐱", pizza: "🍕",
};

export const emojiShortcodes = Object.keys(emojiByShortcode);
export const emojiShortcodeMap = emojiByShortcode;
export const emojiForShortcode = (shortcode: string) => emojiByShortcode[shortcode.toLowerCase()];
export const matchingEmojiShortcodes = (query: string) => emojiShortcodes.filter(name => name.includes(query.toLowerCase())).slice(0, 8);

export const initialMarkdown = `## Welcome to your note

This is your **Markdown editor**. Start typing, or use the toolbar to shape your thoughts.

### A few things to try

- Write a paragraph and make it **bold** or *italic*
- Organize ideas in a list
- Add a [link](https://example.com)

> Good notes make room for unfinished thoughts.

\`\`\`text
Use a code block for snippets or anything that benefits from a fixed-width typeface.
\`\`\`

- [ ] Capture an idea
- [ ] Come back to it later

---

Everything here is editable. Your content is represented as Markdown.`;
