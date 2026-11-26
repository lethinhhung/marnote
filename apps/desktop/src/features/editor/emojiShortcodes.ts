import { searchEmojis } from "emoji-picker-react/data";

const emojiData = [...new Map(
  [..."abcdefghijklmnopqrstuvwxyz0123456789"]
    .flatMap(character => searchEmojis(character))
    .map(emoji => [emoji.unified, emoji]),
).values()];
const shortcode = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
const emojiByShortcode: Record<string, string> = {};
for (const emoji of emojiData) {
  for (const name of emoji.names) emojiByShortcode[shortcode(name)] ??= emoji.emoji;
  emojiByShortcode[shortcode(emoji.name)] = emoji.emoji;
}
Object.assign(emojiByShortcode, {
  smile: "😄", grin: "😁", joy: "😂", laugh: "😆", wink: "😉", heart: "❤️",
  thumbsup: "👍", thumbsdown: "👎", clap: "👏", pray: "🙏", fire: "🔥", star: "⭐",
  tada: "🎉", rocket: "🚀", eyes: "👀", thinking: "🤔", sob: "😭", cry: "😢", wave: "👋",
  check: "✅", x: "❌", warning: "⚠️", coffee: "☕", sun: "☀️", moon: "🌙",
  dog: "🐶", cat: "🐱", pizza: "🍕",
});

export const emojiShortcodes = Object.keys(emojiByShortcode);
export const emojiShortcodeMap = emojiByShortcode;
export const emojiForShortcode = (shortcode: string) => emojiByShortcode[shortcode.toLowerCase()];
export const matchingEmojiShortcodes = (query: string) => {
  const normalized = query.toLowerCase();
  const matches = emojiShortcodes.filter(name => name.includes(normalized));
  return [...matches.filter(name => name.startsWith(normalized)), ...matches.filter(name => !name.startsWith(normalized))].slice(0, 8);
};
