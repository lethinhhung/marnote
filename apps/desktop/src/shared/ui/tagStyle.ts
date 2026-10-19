export function tagStyle(color: string, surface = "#fffdf9") {
  const accent = color.toLowerCase() === "#74856b" ? "#526b58" : color;
  if (!/^#[\da-f]{6}$/i.test(accent)) return { backgroundColor: surface, color: "#526b58" };
  const backgroundColor = `color-mix(in srgb, ${accent} 9%, ${surface})`;
  return { backgroundColor, color: contrastText(accent, surface) };
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
