import type { CSSProperties } from "react";

export function tagStyle(color: string, surface = "#fffdf9") {
  const accent = color.toLowerCase() === "#74856b" ? "#526b58" : color;
  if (!/^#[\da-f]{6}$/i.test(accent)) return tagColors("#526b58", surface);
  return tagColors(accent, surface);
}

function tagColors(accent: string, surface: string): CSSProperties {
  const backgroundColor = `color-mix(in srgb, ${accent} 9%, ${surface})`;
  const darkBackground = `color-mix(in srgb, ${accent} 18%, #252a25)`;
  return {
    "--tag-light-background": backgroundColor,
    "--tag-light-color": contrastText(accent, surface),
    "--tag-dark-background": darkBackground,
    "--tag-dark-color": "#e2e5de",
    "--tag-accent": accent,
  } as CSSProperties;
}

function contrastText(accent: string, surface: string) {
  return contrastRatio(accent, surface) >= 4.5 ? accent : "#20251f";
}

function contrastRatio(first: string, second: string) {
  const values = [first, second].map(color => {
    const channels = [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16) / 255);
    const [red, green, blue] = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  }).sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
