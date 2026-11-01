import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadGameData } from '../src/data/index.js';
import { HEROINE_IDS } from '../src/systems/GameState.js';
import { TIME_SLOTS } from '../src/systems/TimeSystem.js';

const root = new URL('../src/data/', import.meta.url);
const fsFetch = async (path) => ({ ok: true, json: async () => JSON.parse(await readFile(new URL(path, root), 'utf8')) });
const data = await loadGameData(fsFetch);

const LOCS = ['campus', 'library', 'shopping', 'cafe', 'seaside', 'shrine', 'home', 'station'];
const EXPR = ['normal', 'smile', 'shy', 'surprised', 'sad'];
const SOLID = new Set(['b', 'w', 't']);

test('heroines are the three adults with valid schedules', () => {
  assert.deepEqual(data.heroines.map((h) => h.id), HEROINE_IDS);
  for (const h of data.heroines) {
    assert.ok(h.age >= 20 && h.age <= 24, `${h.id} age`);
    assert.ok(h.appearance && h.name && h.repeatLine);
    for (const dt of ['weekday', 'sat', 'sun']) for (const t of TIME_SLOTS) {
      const v = h.schedule[dt][t];
      assert.ok(v === null || LOCS.includes(v), `${h.id} ${dt} ${t}: ${v}`);
    }
  }
});

test('locations cover all ids and fit the map', () => {
  assert.deepEqual(data.locations.map((l) => l.id).sort(), [...LOCS].sort());
  const H = data.map.tiles.length, W = data.map.tiles[0].length;
  assert.deepEqual([W, H], [60, 40]);
  for (const row of data.map.tiles) assert.equal(row.length, W);
  const walkable = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !SOLID.has(data.map.tiles[y][x]);
  for (const l of data.locations) {
    assert.ok(l.rect.x + l.rect.w <= W && l.rect.y + l.rect.h <= H, l.id);
    assert.ok(walkable(l.door.x, l.door.y), `${l.id} door walkable`);
    assert.ok(walkable(l.door.x + 1, l.door.y), `${l.id} npc spot walkable`);
  }
  assert.ok(walkable(data.map.spawn.x, data.map.spawn.y));
});

test('every door is reachable from spawn', () => {
  const t = data.map.tiles, H = t.length, W = t[0].length;
  const seen = new Set([`${data.map.spawn.x},${data.map.spawn.y}`]);
  const q = [[data.map.spawn.x, data.map.spawn.y]];
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(k) || SOLID.has(t[ny][nx])) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  for (const l of data.locations) assert.ok(seen.has(`${l.door.x},${l.door.y}`), `${l.id} reachable`);
});

const DAY_TYPES = ['weekday', 'sat', 'sun'];
const STATS = ['int', 'charm', 'stamina'];
const subset = (obj, allowed) => Object.keys(obj ?? {}).filter((k) => !allowed.includes(k));

/** Returns a list of problems in a condition / effects object (empty = ok). */
function conditionProblems(c) {
  if (!c) return [];
  const p = subset(c, ['affection', 'stats', 'time', 'dayType', 'flag', 'notFlag', 'money']).map((k) => `unknown condition key ${k}`);
  p.push(...subset(c.affection, HEROINE_IDS).map((k) => `unknown heroine ${k}`));
  p.push(...subset(c.stats, STATS).map((k) => `unknown stat ${k}`));
  p.push(...(c.time ?? []).filter((t) => !TIME_SLOTS.includes(t)).map((t) => `unknown time ${t}`));
  p.push(...(c.dayType ?? []).filter((t) => !DAY_TYPES.includes(t)).map((t) => `unknown dayType ${t}`));
  return p;
}
function effectProblems(e) {
  if (!e) return [];
  const p = subset(e, ['affection', 'stats', 'money', 'setFlag']).map((k) => `unknown effect key ${k}`);
  p.push(...subset(e.affection, HEROINE_IDS).map((k) => `unknown heroine ${k}`));
  p.push(...subset(e.stats, STATS).map((k) => `unknown stat ${k}`));
  for (const v of [...Object.values(e.affection ?? {}), ...Object.values(e.stats ?? {})]) if (!Number.isFinite(v)) p.push(`non-numeric ${v}`);
  return p;
}

test('condition/effect validators catch typos', () => {
  assert.deepEqual(conditionProblems({ timeOfDay: ['noon'] }), ['unknown condition key timeOfDay']);
  assert.deepEqual(conditionProblems({ affection: { hnia: 5 } }), ['unknown heroine hnia']);
  assert.deepEqual(conditionProblems({ time: ['midnight'] }), ['unknown time midnight']);
  assert.deepEqual(effectProblems({ stats: { intel: 1 } }), ['unknown stat intel']);
  assert.deepEqual(effectProblems({ affectoin: {} }), ['unknown effect key affectoin']);
  assert.deepEqual(conditionProblems({ time: ['noon'], affection: { hina: 20 } }), []);
});

test('all conditions and effects in data are valid', () => {
  const problems = [];
  const lineSets = (d) => [d.lines, ...Object.values(d.branches ?? {})];
  for (const d of data.dialogues) {
    problems.push(...conditionProblems(d.condition).map((x) => `${d.id}: ${x}`));
    problems.push(...effectProblems(d.onComplete && { ...d.onComplete }).map((x) => `${d.id}: ${x}`));
    for (const lines of lineSets(d)) for (const ln of lines) for (const c of ln.choice ?? []) {
      problems.push(...conditionProblems(c.condition).map((x) => `${d.id}: ${x}`));
      problems.push(...effectProblems(c.effects).map((x) => `${d.id}: ${x}`));
    }
  }
  for (const l of data.locations) for (const a of l.actions) {
    problems.push(...conditionProblems(a.condition).map((x) => `${l.id}/${a.id}: ${x}`));
    problems.push(...effectProblems(a.effects).map((x) => `${l.id}/${a.id}: ${x}`));
  }
  assert.deepEqual(problems, []);
});

test('every heroine has an ending dialogue with the id the ending scene looks up', () => {
  for (const id of HEROINE_IDS) assert.ok(data.dialogues.find((d) => d.id === `${id}_ending` && d.type === 'ending'), id);
});

test('dialogues reference known ids, expressions and branches', () => {
  const speakers = new Set([...HEROINE_IDS, 'me', 'narration']);
  const checkLines = (d, lines, where) => {
    for (const ln of lines) {
      if (ln.choice) {
        assert.ok(ln.choice.length > 0, `${d.id} ${where} empty choice`);
        for (const c of ln.choice) if (c.next) assert.ok(d.branches?.[c.next], `${d.id} missing branch ${c.next}`);
        continue;
      }
      assert.ok(speakers.has(ln.speaker), `${d.id} speaker ${ln.speaker}`);
      assert.ok(typeof ln.text === 'string' && ln.text.length > 0, `${d.id} text`);
      if (HEROINE_IDS.includes(ln.speaker)) assert.ok(EXPR.includes(ln.expression), `${d.id} expr ${ln.expression}`);
    }
  };
  const ids = new Set();
  for (const d of data.dialogues) {
    assert.ok(!ids.has(d.id), `duplicate ${d.id}`); ids.add(d.id);
    assert.ok(['talk', 'event', 'ending', 'prologue'].includes(d.type), d.id);
    assert.ok(d.heroine === null || HEROINE_IDS.includes(d.heroine), d.id);
    if (d.location) assert.ok(LOCS.includes(d.location), d.id);
    checkLines(d, d.lines, 'main');
    for (const [k, b] of Object.entries(d.branches ?? {})) checkLines(d, b, k);
  }
});

test('each heroine has 3+ talks, events 1..5 at reachable places, and one ending', () => {
  for (const h of data.heroines) {
    const mine = data.dialogues.filter((d) => d.heroine === h.id);
    assert.ok(mine.filter((d) => d.type === 'talk').length >= 3, `${h.id} talks`);
    const places = new Set(Object.values(h.schedule).flatMap((s) => Object.values(s)));
    for (let n = 1; n <= 5; n++) {
      const evs = mine.filter((d) => d.type === 'event' && d.event === n);
      assert.equal(evs.length, 1, `${h.id} event ${n}`);
      assert.ok(places.has(evs[0].location), `${h.id} event ${n} location ${evs[0].location} not in schedule`);
    }
    assert.equal(mine.filter((d) => d.type === 'ending').length, 1, `${h.id} ending`);
  }
  assert.ok(data.dialogues.find((d) => d.id === 'ending_friend'));
  assert.ok(data.dialogues.find((d) => d.type === 'prologue'));
});
