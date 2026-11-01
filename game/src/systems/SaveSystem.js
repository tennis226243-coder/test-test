import { TIME_SLOTS, LAST_DAY } from './TimeSystem.js';
import { getDate } from './TimeSystem.js';
import { HEROINE_IDS, STAT_IDS } from './GameState.js';

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const numbersFor = (obj, keys) => isObj(obj) && keys.every((k) => Number.isFinite(obj[k]));

/** Shape check so a damaged save shows as 破損 instead of crashing the game later. */
export function isValidState(s) {
  return isObj(s) && s.version === SAVE_VERSION &&
    Number.isInteger(s.day) && s.day >= 0 && s.day <= LAST_DAY &&
    TIME_SLOTS.includes(s.time) && Number.isFinite(s.money) &&
    numbersFor(s.affection, HEROINE_IDS) && numbersFor(s.eventStage, HEROINE_IDS) &&
    numbersFor(s.stats, STAT_IDS) && isObj(s.flags) && isObj(s.talkedToday) &&
    (s.inventory === undefined || isObj(s.inventory)) &&
    (s.giftedToday === undefined || isObj(s.giftedToday));
}

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
      if (!isValidState(parsed?.state)) return { error: 'corrupt' };
      // Fields added after the first save format get defaults.
      return { ...parsed, state: { inventory: {}, giftedToday: {}, ...parsed.state } };
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
