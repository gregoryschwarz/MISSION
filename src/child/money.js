const COIN_SPECS = {
  '1c': { value: 1, label: '1 centime', radius: 24, outer: '#b46b3c', inner: '#d58a55' },
  '2c': { value: 2, label: '2 centimes', radius: 28, outer: '#b46b3c', inner: '#d58a55' },
  '5c': { value: 5, label: '5 centimes', radius: 32, outer: '#b46b3c', inner: '#d58a55' },
  '10c': { value: 10, label: '10 centimes', radius: 27, outer: '#c79a25', inner: '#f0cc58' },
  '20c': { value: 20, label: '20 centimes', radius: 31, outer: '#c79a25', inner: '#f0cc58' },
  '50c': { value: 50, label: '50 centimes', radius: 35, outer: '#c79a25', inner: '#f0cc58' },
  '1e': { value: 100, label: '1 euro', radius: 33, outer: '#e3bb43', inner: '#c8ccd1', valueLabel: '1€' },
  '2e': { value: 200, label: '2 euros', radius: 37, outer: '#c8ccd1', inner: '#e3bb43', valueLabel: '2€' },
};

const NOTE_SPECS = {
  '5e': { value: 500, label: '5 euros', valueLabel: '5', color: '#aeb1b5', dark: '#777d83' },
  '10e': { value: 1000, label: '10 euros', valueLabel: '10', color: '#df7770', dark: '#a8423e' },
};

function coinArtwork(id, spec) {
  const valueLabel = spec.valueLabel ?? id.replace('c', '');
  const fontSize = valueLabel.length > 2 ? 17 : 23;
  const stars = Array.from({ length: 8 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 8;
    const x = 50 + Math.cos(angle) * (spec.radius - 6);
    const y = 50 + Math.sin(angle) * (spec.radius - 6);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.2" fill="#fff" opacity=".72"/>`;
  }).join('');
  return `<svg class="euro-money euro-coin" viewBox="0 0 100 100" role="img" aria-label="${spec.label}">
    <defs><radialGradient id="shine-${id}" cx="35%" cy="28%"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".28" stop-color="${spec.inner}"/><stop offset="1" stop-color="${spec.outer}"/></radialGradient></defs>
    <circle cx="50" cy="50" r="${spec.radius}" fill="${spec.outer}" stroke="#fff" stroke-opacity=".45" stroke-width="1.5"/>
    <circle cx="50" cy="50" r="${Math.max(14, spec.radius - 8)}" fill="url(#shine-${id})" stroke="#5b4a2f" stroke-opacity=".35"/>
    ${stars}
    <text x="50" y="53" font-size="${fontSize}" font-family="Arial,sans-serif" font-weight="700" text-anchor="middle" fill="#272727">${valueLabel}</text>
    ${id.endsWith('c') ? '<text x="50" y="66" font-size="8" font-family="Arial,sans-serif" font-weight="700" text-anchor="middle" fill="#333">CENT</text>' : ''}
  </svg>`;
}

function noteArtwork(id, spec) {
  return `<svg class="euro-money euro-note" viewBox="0 0 180 92" role="img" aria-label="Billet de ${spec.label}">
    <defs><linearGradient id="note-${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f5f0df"/><stop offset=".28" stop-color="${spec.color}"/><stop offset="1" stop-color="${spec.dark}"/></linearGradient></defs>
    <rect x="2" y="2" width="176" height="88" rx="7" fill="url(#note-${id})" stroke="#f8f4df" stroke-width="2"/>
    <rect x="13" y="13" width="154" height="66" rx="4" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/>
    <path d="M67 68V35c0-15 24-15 24 0v33M63 68h33M67 48h24" fill="none" stroke="#f8f4df" stroke-width="4" opacity=".78"/>
    <rect x="116" y="4" width="10" height="84" fill="#d8d9dd" opacity=".9"/>
    <path d="M121 9v74" stroke="#fff" stroke-width="2" stroke-dasharray="3 4" opacity=".9"/>
    <text x="24" y="34" font-size="25" font-family="Arial,sans-serif" font-weight="800" fill="#fff">${spec.valueLabel}</text>
    <text x="24" y="58" font-size="21" font-family="Arial,sans-serif" font-weight="700" fill="#fff">€</text>
    <text x="151" y="72" font-size="23" font-family="Arial,sans-serif" font-weight="800" text-anchor="middle" fill="#fff">${spec.valueLabel}</text>
    <circle cx="150" cy="24" r="9" fill="none" stroke="#f8f4df" stroke-width="2" opacity=".72"/>
  </svg>`;
}

export const COINS = Object.fromEntries([
  ...Object.entries(COIN_SPECS).map(([id, spec]) => [id, { ...spec, svg: coinArtwork(id, spec) }]),
  ...Object.entries(NOTE_SPECS).map(([id, spec]) => [id, { ...spec, svg: noteArtwork(id, spec) }]),
]);

export function coinSvg(coinId) {
  return COINS[coinId]?.svg ?? '';
}

export function formatEuroCents(cents) {
  return `${(Number(cents) / 100).toFixed(2).replace('.', ',')} €`;
}

export function parseEuroInput(value) {
  const normalized = String(value).trim().replace(/\s|€/g, '').replace(',', '.');
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}
