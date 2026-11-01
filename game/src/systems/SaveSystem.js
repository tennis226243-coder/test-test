import { getDate } from './TimeSystem.js';

export const SLOT_COUNT = 3;
export const SAVE_VERSION = 1;
const key = (slot) => `ows_save_${slot}`;
const validSlot = (slot) => Number.isInteger(slot) && slot >= 0 && slot < SLOT_COUNT;

export function createSaveSystem(storage) {
  function readRaw(slot) {
    let raw;
    try { raw = storage.getItem(key(slot)); } catch { return { error: 'corrupt' }; }
    if (raw == null) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.version !== SAVE_VERSION || typeof parsed.state.day !== 'number') return { error: 'corrupt' };
      getDate(parsed.state); // throws on an impossible day
      return parsed;
    } catch {
      return { error: 'corrupt' };
    }
  }

  return {
    save(slot, state) {
      if (!validSlot(slot)) return false;
      try {
        storage.setItem(key(slot), JSON.stringify({ savedAt: Date.now(), state }));
        return true;
      } catch {
        return false;
      }
    },
    load(slot) {
      if (!validSlot(slot)) return null;
      const r = readRaw(slot);
      if (r == null || r.error) return r;
      return r.state;
    },
    list() {
      return Array.from({ length: SLOT_COUNT }, (_, slot) => {
        const r = readRaw(slot);
        if (r == null) return null;
        if (r.error) return { corrupt: true };
        const { month, date } = getDate(r.state);
        return { month, date, time: r.state.time, savedAt: r.savedAt };
      });
    },
  };
}
