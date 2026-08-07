export const COINS = {
  '1c': { value: 1, label: '1c', svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="24" fill="#c68642"/><text x="50" y="57" font-size="18" text-anchor="middle" fill="#fff">1c</text></svg>' },
  '2c': { value: 2, label: '2c', svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="29" fill="#c68642"/><text x="50" y="58" font-size="21" text-anchor="middle" fill="#fff">2c</text></svg>' },
  '5c': { value: 5, label: '5c', svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#c68642"/><text x="50" y="59" font-size="24" text-anchor="middle" fill="#fff">5c</text></svg>' },
  '10c': { value: 10, label: '10c', svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="26" fill="#d4af37"/><text x="50" y="57" font-size="17" text-anchor="middle" fill="#333">10c</text></svg>' },
  '20c': { value: 20, label: '20c', svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="31" fill="#d4af37"/><text x="50" y="58" font-size="19" text-anchor="middle" fill="#333">20c</text></svg>' },
  '50c': { value: 50, label: '50c', svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="36" fill="#d4af37"/><text x="50" y="59" font-size="21" text-anchor="middle" fill="#333">50c</text></svg>' },
  '1e': { value: 100, label: '1€', svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="32" fill="#e8c15c"/><circle cx="50" cy="50" r="18" fill="#c0c0c0"/><text x="50" y="58" font-size="20" text-anchor="middle" fill="#333">1€</text></svg>' },
  '2e': { value: 200, label: '2€', svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="#c0c0c0"/><circle cx="50" cy="50" r="22" fill="#e8c15c"/><text x="50" y="58" font-size="20" text-anchor="middle" fill="#333">2€</text></svg>' },
  '5e': { value: 500, label: '5€', svg: '<svg viewBox="0 0 100 60"><rect width="100" height="60" rx="6" fill="#8b5fa3"/><text x="50" y="37" font-size="24" text-anchor="middle" fill="#fff">5€</text></svg>' },
  '10e': { value: 1000, label: '10€', svg: '<svg viewBox="0 0 100 60"><rect width="100" height="60" rx="6" fill="#c0392b"/><text x="50" y="37" font-size="24" text-anchor="middle" fill="#fff">10€</text></svg>' },
};

export function coinSvg(coinId) {
  return COINS[coinId]?.svg ?? '';
}
