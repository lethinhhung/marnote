export function tagStyle(color: string, surface = "#fffdf9") {
  const accent = color.toLowerCase() === "#74856b" ? "#526b58" : color;
  if (!/^#[\da-f]{6}$/i.test(accent)) return { backgroundColor: surface, color: "#526b58" };
  return { backgroundColor: `color-mix(in srgb, ${accent} 9%, ${surface})`, color: accent };
}
