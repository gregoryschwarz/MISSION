function angleToPoint(cx, cy, length, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + length * Math.cos(rad), y: cy + length * Math.sin(rad) };
}

export function clockFaceSvg(hour12, minute) {
  const hourAngle = (hour12 % 12) * 30 + minute * 0.5 - 90;
  const minuteAngle = minute * 6 - 90;
  const hourPoint = angleToPoint(50, 50, 25, hourAngle);
  const minutePoint = angleToPoint(50, 50, 35, minuteAngle);
  return `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#fff" stroke="#3a2f6b" stroke-width="4"/><line x1="50" y1="50" x2="${hourPoint.x.toFixed(1)}" y2="${hourPoint.y.toFixed(1)}" stroke="#3a2f6b" stroke-width="5" stroke-linecap="round"/><line x1="50" y1="50" x2="${minutePoint.x.toFixed(1)}" y2="${minutePoint.y.toFixed(1)}" stroke="#3a2f6b" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="50" r="3" fill="#3a2f6b"/></svg>`;
}

export function formatTime(hour24, minute) {
  return `${hour24}h${minute === 0 ? '00' : '30'}`;
}
