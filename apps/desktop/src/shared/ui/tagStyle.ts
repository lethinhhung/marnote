export function tagTextColor(background: string): string {
  const hex = background.replace("#", "");
  if (!/^[\da-f]{3}$|^[\da-f]{6}$/i.test(hex)) return "#263126";
  const rgb = hex.length === 3 ? [...hex].map(value => parseInt(value + value, 16)) : [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16));
  const luminance = rgb.map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  return luminance > 0.42 ? "#20251f" : "#ffffff";
}
