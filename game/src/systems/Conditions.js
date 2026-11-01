import { dayType } from './TimeSystem.js';

const atLeast = (actual, mins) => Object.entries(mins).every(([k, v]) => (actual[k] ?? 0) >= v);

export function checkCondition(cond, state) {
  if (!cond) return true;
  if (cond.affection && !atLeast(state.affection, cond.affection)) return false;
  if (cond.stats && !atLeast(state.stats, cond.stats)) return false;
  if (cond.time && !cond.time.includes(state.time)) return false;
  if (cond.dayType && !cond.dayType.includes(dayType(state))) return false;
  if (cond.flag && !state.flags[cond.flag]) return false;
  if (cond.notFlag && state.flags[cond.notFlag]) return false;
  if (cond.money != null && state.money < cond.money) return false;
  return true;
}
