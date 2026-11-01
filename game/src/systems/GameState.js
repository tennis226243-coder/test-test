export const HEROINE_IDS = ['hina', 'rei', 'shiori'];

export function createInitialState() {
  return {
    version: 1,
    day: 0,
    time: 'morning',
    money: 3000,
    stats: { int: 10, charm: 10, stamina: 10 },
    affection: { hina: 0, rei: 0, shiori: 0 },
    eventStage: { hina: 0, rei: 0, shiori: 0 },
    flags: {},
    talkedToday: {},
    ended: null,
  };
}
