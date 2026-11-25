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
