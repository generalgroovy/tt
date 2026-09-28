// Persistence is optional; blocked or corrupt browser storage must not stop play.
export function readSetting(key, fallback = '') {
  try { return globalThis.localStorage.getItem(key) ?? fallback; }
  catch { return fallback; }
}

export function writeSetting(key, value) {
  try { globalThis.localStorage.setItem(key, String(value)); return true; }
  catch { return false; }
}

export function readBestScore() {
  const value = Number(readSetting('thats-a-paddlin-best', '0'));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
