export const DIALOGUE_FILES = ['common', 'hina', 'rei', 'shiori'];

/** fetchFn(path) resolves relative to the data directory and returns a Response-like object. */
export async function loadGameData(fetchFn) {
  const get = async (path) => {
    const res = await fetchFn(path);
    if (!res.ok) throw new Error(`データの読み込みに失敗しました: ${path}`);
    return res.json();
  };
  const [heroines, locations, map, ...dialogueSets] = await Promise.all([
    get('heroines.json'), get('locations.json'), get('map.json'),
    ...DIALOGUE_FILES.map((f) => get(`dialogues/${f}.json`)),
  ]);
  return { heroines, locations, map, dialogues: dialogueSets.flat() };
}
