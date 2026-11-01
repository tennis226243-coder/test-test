import { createSaveSystem } from './systems/SaveSystem.js';

function safeStorage() {
  try {
    const ls = window.localStorage;
    return { getItem: (k) => ls.getItem(k), setItem: (k, v) => ls.setItem(k, v) };
  } catch {
    const m = new Map();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  }
}

const storage = safeStorage();

export const store = {
  data: null,
  state: null,
  manifest: { portraits: {}, backgrounds: [] },
  saves: createSaveSystem(storage),
  events: new Phaser.Events.EventEmitter(),
  touch: { up: false, down: false, left: false, right: false },
  setState(next) {
    this.state = next;
    this.events.emit('change', next);
  },
  toast(text) { this.events.emit('toast', text); },
  heroine(id) { return this.data.heroines.find((h) => h.id === id); },
  location(id) { return this.data.locations.find((l) => l.id === id); },
  endingsSeen() {
    try { return JSON.parse(storage.getItem('ows_endings') ?? '[]'); } catch { return []; }
  },
  recordEnding(id) {
    const seen = new Set(this.endingsSeen());
    seen.add(id);
    try { storage.setItem('ows_endings', JSON.stringify([...seen])); } catch { /* storage unavailable */ }
  },
};
