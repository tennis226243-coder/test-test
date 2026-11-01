import { store } from '../store.js';
import { Menu } from '../ui/Menu.js';
import { TILE } from '../art/tiles.js';
import { text, LOCATION_COLORS } from '../theme.js';
import { locationOf } from '../systems/Schedule.js';
import { isFestival, TIME_LABELS } from '../systems/TimeSystem.js';
import { checkCondition } from '../systems/Conditions.js';
import { chooseEncounter, beginEncounter, giveGift, runAction, ITEMS } from '../systems/Encounter.js';

const SOLID = new Set(['b', 'w', 't']);
const SPEED = 170;
const NPC_OFFSETS = [[1, 0], [-1, 0], [2, 0]];
const STAT_LABELS = { int: '知力', charm: '魅力', stamina: '体力' };

export class WorldScene extends Phaser.Scene {
  constructor() { super('World'); }

  create({ isNew } = {}) {
    const { map } = store.data;
    this.tiles = map.tiles;
    this.mapW = this.tiles[0].length * TILE;
    this.mapH = this.tiles.length * TILE;
    this.busy = false;
    this.ending = false;
    this.cooldownUntil = 0;

    this.drawMap();
    const spawn = isNew ? map.spawn : (store.location('home').door);
    this.player = this.add.image((spawn.x + 0.5) * TILE, (spawn.y + 0.5) * TILE, 'player').setDepth(10);
    this.npcs = this.add.group();
    this.nightTint = this.add.rectangle(0, 0, this.mapW, this.mapH, 0x0b1440, 0).setOrigin(0).setDepth(50);

    this.cameras.main.setBounds(0, 0, this.mapW, this.mapH).startFollow(this.player, true, 0.15, 0.15);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.input.keyboard.on('keydown', (e) => {
      if (e.repeat) return; // holding a key must not repeat actions
      if (['Space', 'Enter', 'NumpadEnter'].includes(e.code)) this.interact();
    });

    this.onChange = () => this.refresh();
    store.events.on('change', this.onChange);
    this.onInteract = () => this.interact();
    store.events.on('interact', this.onInteract);
    this.events.once('shutdown', () => {
      store.events.off('change', this.onChange);
      store.events.off('interact', this.onInteract);
    });

    this.scene.launch('HUD');
    this.refresh();
    if (isNew) {
      const prologue = store.data.dialogues.find((d) => d.type === 'prologue');
      this.playDialogue(prologue, null, 'home', () => {});
    }
  }

  drawMap() {
    const rt = this.add.renderTexture(0, 0, this.mapW, this.mapH).setOrigin(0);
    this.tiles.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) rt.draw(`tile_${row[x]}`, x * TILE, y * TILE);
    });
    const g = this.add.graphics().setDepth(1);
    for (const loc of store.data.locations) {
      const { x, y, w, h } = loc.rect;
      const color = LOCATION_COLORS[loc.id];
      if (loc.building) {
        g.fillStyle(0x000000, 0.18).fillRect(x * TILE + 6, y * TILE + 8, w * TILE, h * TILE);
        g.fillStyle(color, 1).fillRect(x * TILE, y * TILE, w * TILE, h * TILE * 0.55);
        g.fillStyle(0xf2ebdd, 1).fillRect(x * TILE, y * TILE + h * TILE * 0.55, w * TILE, h * TILE * 0.45);
        g.lineStyle(3, 0x3a2f28, 0.6).strokeRect(x * TILE, y * TILE, w * TILE, h * TILE);
        g.fillStyle(0x7fb8d8, 1);
        for (let wx = x + 1; wx < x + w - 1; wx += 2) g.fillRect(wx * TILE + 6, (y + h - 2) * TILE + 2, 20, 18);
        g.fillStyle(0x5b3b24, 1).fillRect(loc.door.x * TILE + 4, (loc.door.y - 1) * TILE + 4, 24, 28);
      }
      text(this, (x + w / 2) * TILE, (loc.building ? y + 1 : y + 1.2) * TILE, loc.name, 20, '#ffffff', { stroke: '#2a2018', strokeThickness: 5 }).setOrigin(0.5).setDepth(2);
    }
  }

  refresh() {
    const s = store.state;
    if (!s || !this.npcs) return;
    this.npcs.clear(true, true);
    const byLoc = {};
    for (const h of store.data.heroines) {
      const locId = locationOf(h, s);
      if (!locId) continue;
      const loc = store.location(locId);
      const n = (byLoc[locId] = (byLoc[locId] ?? -1) + 1);
      const [ox, oy] = NPC_OFFSETS[n % NPC_OFFSETS.length];
      const px = (loc.door.x + ox + 0.5) * TILE;
      const py = (loc.door.y + oy + 0.5) * TILE;
      const sprite = this.add.image(px, py, `npc_${h.id}`).setDepth(9);
      sprite.heroine = h; sprite.locationId = locId;
      const label = text(this, px, py - 30, h.name.split(' ')[1] ?? h.name, 16, '#ffffff', { stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setDepth(9);
      const heart = text(this, px + 16, py - 22, s.talkedToday[h.id] ? '' : '💬', 14).setOrigin(0.5).setDepth(9);
      this.npcs.addMultiple([sprite, label, heart]);
    }
    const alpha = { morning: 0, noon: 0, evening: 0.18, night: 0.42 }[s.time];
    this.nightTint.fillColor = s.time === 'evening' ? 0xff7a30 : 0x0b1440;
    this.nightTint.setAlpha(alpha);
    if (isFestival(s) && s.time === 'night' && !this.ending) {
      this.ending = true;
      this.time.delayedCall(300, () => this.scene.start('Ending'));
    }
  }

  update(_, dtMs) {
    if (this.busy) return;
    const dt = dtMs / 1000;
    const t = store.touch;
    let dx = 0, dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown || t.left) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown || t.right) dx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown || t.up) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown || t.down) dy += 1;
    if (!dx && !dy) return;
    const len = Math.hypot(dx, dy);
    const nx = this.player.x + (dx / len) * SPEED * dt;
    const ny = this.player.y + (dy / len) * SPEED * dt;
    if (this.canStand(nx, this.player.y)) this.player.x = nx;
    if (this.canStand(this.player.x, ny)) this.player.y = ny;
    if (dx) this.player.setFlipX(dx < 0);
  }

  canStand(px, py) {
    const r = 9;
    for (const [cx, cy] of [[px - r, py + 2], [px + r, py + 2], [px - r, py + 14], [px + r, py + 14]]) {
      const tx = Math.floor(cx / TILE), ty = Math.floor(cy / TILE);
      if (tx < 0 || ty < 0 || ty >= this.tiles.length || tx >= this.tiles[0].length) return false;
      if (SOLID.has(this.tiles[ty][tx])) return false;
    }
    return true;
  }

  nearest(list, getXY, maxDist) {
    let best = null, bestD = maxDist;
    for (const item of list) {
      const [x, y] = getXY(item);
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y);
      if (d < bestD) { best = item; bestD = d; }
    }
    return best;
  }

  interact() {
    if (this.busy || this.ending || this.time.now < (this.cooldownUntil ?? 0)) return;
    const doorXY = (l) => [(l.door.x + 0.5) * TILE, (l.door.y + 0.5) * TILE];
    // Standing right on a door always means "use this place", even with a heroine next to it.
    const onDoor = this.nearest(store.data.locations, doorXY, TILE * 0.6);
    if (onDoor) return this.locationMenu(onDoor);
    const npc = this.nearest(this.npcs.getChildren().filter((c) => c.heroine), (c) => [c.x, c.y], TILE * 1.6);
    if (npc) return this.heroineMenu(npc.heroine, npc.locationId);
    const loc = this.nearest(store.data.locations, doorXY, TILE * 1.6);
    if (loc) this.locationMenu(loc);
  }

  heroineMenu(heroine, locationId) {
    const items = store.state.giftedToday?.[heroine.id] ? [] : Object.entries(store.state.inventory ?? {}).filter(([, n]) => n > 0);
    if (!items.length) return this.talk(heroine, locationId);
    this.busy = true;
    const options = [{ label: '話す' }, ...items.map(([id, n]) => ({ label: `${ITEMS[id]}をプレゼントする (×${n})` })), { label: 'やめる' }];
    new Menu(this, options, (i) => {
      this.busy = false;
      if (i === 0) return this.talk(heroine, locationId);
      if (i === options.length - 1) return;
      const [itemId] = items[i - 1];
      const before = store.state.affection[heroine.id];
      store.setState(giveGift(store.state, heroine, itemId));
      const diff = store.state.affection[heroine.id] - before;
      const reaction = diff >= 8 ? { expression: 'smile', text: 'わあ……! これ、すごく欲しかったの。ありがとう!' }
        : diff < 0 ? { expression: 'sad', text: 'あ、ありがとう……。気持ちはうれしい、かな。' }
          : { expression: 'normal', text: 'ありがとう。大事にするね。' };
      this.playDialogue({ id: 'gift', heroine: heroine.id, lines: [{ speaker: heroine.id, ...reaction }] }, heroine.id, locationId, () => {});
    }, { title: heroine.name, onCancel: () => { this.busy = false; } });
  }

  talk(heroine, locationId) {
    const enc = chooseEncounter(store.state, heroine, locationId, store.data.dialogues);
    store.setState(beginEncounter(store.state, heroine.id, enc));
    this.playDialogue(enc.dialogue, heroine.id, locationId, () => {
      if (enc.kind !== 'repeat') this.advance();
    });
  }

  advance() {
    const { state } = runAction(store.state, { id: 'pass', effects: {} });
    store.setState(state);
  }

  locationMenu(loc) {
    const s = store.state;
    const actions = loc.actions.map((a) => ({ a, ok: checkCondition(a.condition, s) && (!a.cost || s.money >= a.cost) }));
    const items = [...actions.map(({ a, ok }) => ({ label: a.label, disabled: !ok })), { label: 'やめる' }];
    this.busy = true;
    new Menu(this, items, (i) => {
      this.busy = false;
      if (i === actions.length) return;
      const { a } = actions[i];
      if (a.save) return this.saveMenu();
      const before = store.state;
      const res = runAction(store.state, a);
      if (!res.ok) return store.toast('お金が足りない……');
      store.setState(res.state);
      store.toast(this.describe(before, res.state, a));
    }, { title: `${loc.name}(${TIME_LABELS[s.time]})`, onCancel: () => { this.busy = false; } });
  }

  describe(before, after, action) {
    if (action.item) return `${ITEMS[action.item]}を買った。`;
    if (action.sleep) return 'ぐっすり眠った。';
    const parts = [];
    for (const k of Object.keys(STAT_LABELS)) {
      const d = after.stats[k] - before.stats[k];
      if (d) parts.push(`${STAT_LABELS[k]}${d > 0 ? '+' : ''}${d}`);
    }
    const m = after.money - before.money;
    if (m) parts.push(`所持金${m > 0 ? '+' : ''}${m}円`);
    return `${action.label.replace(/ \(.+\)$/, '')}。${parts.join(' / ')}`;
  }

  saveMenu() {
    this.busy = true;
    const slots = store.saves.list();
    const items = slots.map((sl, i) => ({ label: `スロット${i + 1}: ${sl == null ? '(空き)' : sl.corrupt ? '破損' : `${sl.month}月${sl.date}日 ${TIME_LABELS[sl.time]}`}` }));
    items.push({ label: 'やめる' });
    new Menu(this, items, (i) => {
      this.busy = false;
      if (i === slots.length) return;
      store.toast(store.saves.save(i, store.state) ? `スロット${i + 1}にセーブしました。` : 'セーブに失敗しました。');
    }, { title: 'セーブ', width: 460, onCancel: () => { this.busy = false; } });
  }

  playDialogue(dialogue, heroineId, locationId, onDone) {
    this.busy = true;
    this.scene.pause();
    this.scene.launch('Dialogue', {
      dialogue, heroineId, locationId,
      onDone: () => {
        this.scene.resume();
        this.busy = false;
        this.cooldownUntil = this.time.now + 200;
        onDone();
      },
    });
  }

  /** Test/debug helper: move next to a heroine or a location door. */
  teleportTo(target) {
    const npc = this.npcs.getChildren().find((c) => c.heroine?.id === target);
    if (npc) { this.player.setPosition(npc.x, npc.y + TILE); return true; }
    const loc = store.location(target);
    if (loc) { this.player.setPosition((loc.door.x + 0.5) * TILE, (loc.door.y + 0.5) * TILE); return true; }
    return false;
  }
}

