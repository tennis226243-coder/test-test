import { findAvailableEvent, tryDailyTalk, addAffection, giftDelta } from './Affection.js';
import { applyEffects } from './DialogueRunner.js';
import { advanceTime, sleep, isFestival } from './TimeSystem.js';

export const TALK_AFFECTION = 2;
export const ITEMS = { flowers: '花束', book: '本', accessory: 'アクセサリー', sweets: 'スイーツ' };

/** Picks what happens when the player speaks to a heroine. rng() returns [0,1). */
export function chooseEncounter(state, heroine, locationId, dialogues, rng = Math.random) {
  if (state.talkedToday[heroine.id]) {
    return { kind: 'repeat', dialogue: { id: `${heroine.id}_repeat`, heroine: heroine.id, type: 'talk', lines: [{ speaker: heroine.id, expression: 'smile', text: heroine.repeatLine }] } };
  }
  const event = findAvailableEvent(state, heroine.id, locationId, dialogues);
  if (event) return { kind: 'event', dialogue: event };
  const talks = dialogues.filter((d) => d.type === 'talk' && d.heroine === heroine.id);
  const unread = talks.filter((d) => !state.flags[`seen_${d.id}`]);
  const pool = unread.length ? unread : talks;
  return { kind: 'talk', dialogue: pool[Math.floor(rng() * pool.length)] };
}

/** State changes applied when an encounter starts (before its dialogue runs). */
export function beginEncounter(state, heroineId, encounter) {
  if (encounter.kind === 'repeat') return state;
  if (encounter.kind === 'talk') {
    const s = tryDailyTalk(state, heroineId, TALK_AFFECTION);
    return { ...s, flags: { ...s.flags, [`seen_${encounter.dialogue.id}`]: true } };
  }
  return { ...state, talkedToday: { ...state.talkedToday, [heroineId]: true } };
}

export function giveGift(state, heroine, itemId) {
  const count = state.inventory[itemId] ?? 0;
  if (count <= 0 || state.giftedToday?.[heroine.id]) return state;
  const inventory = { ...state.inventory };
  if (count === 1) delete inventory[itemId]; else inventory[itemId] = count - 1;
  const giftedToday = { ...state.giftedToday, [heroine.id]: true };
  return addAffection({ ...state, inventory, giftedToday }, heroine.id, giftDelta(heroine, itemId));
}

/** Runs a location action. Returns { ok, state, advanced }. */
export function runAction(state, action) {
  if (action.item) {
    if (state.money < action.cost) return { ok: false, state, advanced: false };
    const inventory = { ...state.inventory, [action.item]: (state.inventory[action.item] ?? 0) + 1 };
    return { ok: true, state: { ...state, money: state.money - action.cost, inventory }, advanced: false };
  }
  if (action.sleep) {
    // On festival day there is no tomorrow: resting moves to the festival night.
    const next = isFestival(state) ? { ...state, time: 'night' } : sleep(state);
    return { ok: true, state: next, advanced: true };
  }
  return { ok: true, state: advanceTime(applyEffects(state, action.effects)), advanced: true };
}
