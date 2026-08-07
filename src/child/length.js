export function lengthBarSvg(cm, maxCm = 20) {
  const widthPercent = Math.min(100, (cm / maxCm) * 100);
  return `<svg viewBox="0 0 100 20"><rect width="${widthPercent}" height="20" fill="#a8e6cf"/></svg>`;
}
