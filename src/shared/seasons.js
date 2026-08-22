export function seasonForMonth(monthIndex) {
  if ([11, 0, 1].includes(monthIndex)) return 'winter';
  if ([2, 3, 4].includes(monthIndex)) return 'spring';
  if ([5, 6, 7].includes(monthIndex)) return 'summer';
  return 'autumn';
}

export function seasonForDate(date = new Date()) {
  return seasonForMonth(date.getMonth());
}
