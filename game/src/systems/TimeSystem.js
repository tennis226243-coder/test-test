export const TIME_SLOTS = ['morning', 'noon', 'evening', 'night'];
export const TIME_LABELS = { morning: '朝', noon: '昼', evening: '夕', night: '夜' };
export const LAST_DAY = 121; // day 0 = 4/1, day 121 = 7/31
export const START_WEEKDAY = 3; // 4/1 is Wednesday (0 = Sunday)
const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
const MONTHS = [[4, 30], [5, 31], [6, 30], [7, 31]];

export function getDate(state) {
  let rest = state.day;
  for (const [month, len] of MONTHS) {
    if (rest < len) {
      const weekday = (START_WEEKDAY + state.day) % 7;
      return { month, date: rest + 1, weekday, weekdayLabel: WEEKDAY_LABELS[weekday] };
    }
    rest -= len;
  }
  throw new RangeError(`day out of range: ${state.day}`);
}

export function dayType(state) {
  const { weekday } = getDate(state);
  return weekday === 6 ? 'sat' : weekday === 0 ? 'sun' : 'weekday';
}

export function isFestival(state) {
  return state.day === LAST_DAY;
}

function nextMorning(state) {
  return { ...state, day: Math.min(state.day + 1, LAST_DAY), time: 'morning', talkedToday: {}, giftedToday: {} };
}

export function advanceTime(state) {
  const i = TIME_SLOTS.indexOf(state.time);
  if (i === TIME_SLOTS.length - 1) return nextMorning(state);
  return { ...state, time: TIME_SLOTS[i + 1] };
}

export function sleep(state) {
  return nextMorning(state);
}
