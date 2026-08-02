const STORAGE_KEY = 'missionsDeLuna.soundEnabled';

export function isSoundEnabled(storage = window.localStorage) {
  const raw = storage.getItem(STORAGE_KEY);
  return raw === null ? true : raw === 'true';
}

export function setSoundEnabled(enabled, storage = window.localStorage) {
  storage.setItem(STORAGE_KEY, String(enabled));
}

function playTone(frequency, durationMs, type = 'sine') {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + durationMs / 1000);
    oscillator.onended = () => ctx.close();
  } catch (err) {
    // Sound is a nice-to-have; never let it break gameplay.
  }
}

export function playCorrectSound() {
  playTone(880, 150);
  setTimeout(() => playTone(1174, 150), 100);
}

export function playIncorrectSound() {
  playTone(220, 200);
}

export function playMissionCompleteSound() {
  [523, 659, 784, 1047].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 180), i * 120);
  });
}

export function playLevelUpSound() {
  [784, 988, 1175, 1568].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 220), i * 100);
  });
}
