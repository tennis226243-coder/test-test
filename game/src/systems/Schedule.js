import { dayType, isFestival } from './TimeSystem.js';

export function locationOf(heroine, state) {
  if (isFestival(state)) return 'shrine';
  return heroine.schedule?.[dayType(state)]?.[state.time] ?? null;
}

export function heroinesAt(heroines, state, locationId) {
  return heroines.filter((h) => locationOf(h, state) === locationId);
}
