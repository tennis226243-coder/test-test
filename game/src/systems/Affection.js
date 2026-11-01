import { HEROINE_IDS } from './GameState.js';
import { checkCondition } from './Conditions.js';

export const EVENT_THRESHOLDS = [20, 40, 60, 75, 90];
export const FINAL_STAGE = 5;

const clamp = (v) => Math.max(0, Math.min(100, v));

export function addAffection(state, id, delta) {
  return { ...state, affection: { ...state.affection, [id]: clamp(state.affection[id] + delta) } };
}

export function addStat(state, stat, delta) {
  return { ...state, stats: { ...state.stats, [stat]: clamp(state.stats[stat] + delta) } };
}

export function tryDailyTalk(state, id, delta) {
  const next = state.talkedToday[id] ? state : addAffection(state, id, delta);
  return { ...next, talkedToday: { ...next.talkedToday, [id]: true } };
}

export function giftDelta(heroine, itemId) {
  if (heroine.likes?.includes(itemId)) return 8;
  if (heroine.dislikes?.includes(itemId)) return -2;
  return 3;
}

export function findAvailableEvent(state, heroineId, locationId, dialogues) {
  const stage = state.eventStage[heroineId];
  if (stage >= FINAL_STAGE) return null;
  if (state.affection[heroineId] < EVENT_THRESHOLDS[stage]) return null;
  return dialogues.find((d) =>
    d.type === 'event' && d.heroine === heroineId && d.event === stage + 1 &&
    (!d.location || d.location === locationId) && checkCondition(d.condition, state)
  ) ?? null;
}

export function determineEnding(state) {
  let best = 'friend';
  let bestScore = -1;
  for (const id of HEROINE_IDS) {
    if (state.eventStage[id] >= FINAL_STAGE && state.affection[id] > bestScore) {
      best = id;
      bestScore = state.affection[id];
    }
  }
  return best;
}
