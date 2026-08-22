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
    gain.gain.setValueAtTime(0.8, ctx.currentTime);
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

export function speakText(text, language = 'fr-FR', speechApi = typeof window !== 'undefined' ? window : {}) {
  const synthesis = speechApi.speechSynthesis;
  const Utterance = speechApi.SpeechSynthesisUtterance;
  if (!text || !synthesis || !Utterance) return false;
  try {
    const utterance = new Utterance(text);
    utterance.lang = language;
    utterance.rate = 0.82;
    const voices = synthesis.getVoices?.() ?? [];
    const languagePrefix = language.toLowerCase().split('-')[0];
    utterance.voice = voices.find((voice) => String(voice.lang).toLowerCase() === language.toLowerCase())
      ?? voices.find((voice) => String(voice.lang).toLowerCase().startsWith(languagePrefix))
      ?? null;
    if (synthesis.speaking) synthesis.cancel?.();
    synthesis.resume?.();
    synthesis.speak(utterance);
    return true;
  } catch (err) {
    return false;
  }
}

export function speakEnglish(text, speechApi = typeof window !== 'undefined' ? window : {}) {
  return speakText(text, 'en-GB', speechApi);
}
