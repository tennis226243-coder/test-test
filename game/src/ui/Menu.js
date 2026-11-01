import { COLORS, FONT } from '../theme.js';

/**
 * Vertical list menu. Keyboard: Up/Down/W/S to move, Enter/Space to pick, Esc to cancel.
 * new Menu(scene, items:[{label, disabled?}], onSelect(index), { x, y, width, onCancel, title })
 */
export class Menu {
  constructor(scene, items, onSelect, opts = {}) {
    this.scene = scene;
    this.items = items;
    this.onSelect = onSelect;
    this.onCancel = opts.onCancel;
    this.index = Math.max(0, items.findIndex((i) => !i.disabled));
    const width = opts.width ?? 420;
    const rowH = 48;
    const titleH = opts.title ? 44 : 0;
    const h = items.length * rowH + 24 + titleH;
    const x = opts.x ?? (scene.scale.width - width) / 2;
    const y = opts.y ?? (scene.scale.height - h) / 2;
    this.container = scene.add.container(x, y).setDepth(1000).setScrollFactor(0);
    const bg = scene.add.rectangle(0, 0, width, h, COLORS.panel, COLORS.panelAlpha).setOrigin(0).setStrokeStyle(2, COLORS.border, 0.25);
    this.container.add(bg);
    if (opts.title) this.container.add(scene.add.text(20, 14, opts.title, { fontFamily: FONT, fontSize: '20px', color: COLORS.sub }));
    this.cursor = scene.add.rectangle(10, 0, width - 20, rowH - 6, COLORS.accent, 0.25).setOrigin(0);
    this.container.add(this.cursor);
    this.rows = items.map((item, i) => {
      const t = scene.add.text(28, 12 + titleH + i * rowH + 10, item.label, {
        fontFamily: FONT, fontSize: '22px', color: item.disabled ? '#666b78' : COLORS.text,
      });
      t.setInteractive({ useHandCursor: !item.disabled });
      t.on('pointerover', () => { if (!item.disabled) { this.index = i; this._draw(); } });
      t.on('pointerdown', () => { if (!item.disabled) this._pick(i); });
      this.container.add(t);
      return t;
    });
    this.rowH = rowH; this.titleH = titleH;
    this._draw();
    this.ready = false;
    scene.time.delayedCall(120, () => { this.ready = true; });
    this._onKey = (e) => this._key(e);
    scene.input.keyboard.on('keydown', this._onKey);
  }

  _draw() { this.cursor.y = 12 + this.titleH + this.index * this.rowH + 2; }

  _move(dir) {
    if (!this.items.some((i) => !i.disabled)) return;
    let i = this.index;
    do { i = (i + dir + this.items.length) % this.items.length; } while (this.items[i].disabled);
    this.index = i;
    this._draw();
  }

  _key(e) {
    if (!this.ready || this.destroyed) return;
    if (['ArrowUp', 'KeyW'].includes(e.code)) this._move(-1);
    else if (['ArrowDown', 'KeyS'].includes(e.code)) this._move(1);
    else if (['Enter', 'Space', 'NumpadEnter'].includes(e.code)) { if (!this.items[this.index]?.disabled) this._pick(this.index); }
    else if (e.code === 'Escape' && this.onCancel) { this.destroy(); this.onCancel(); }
  }

  _pick(i) {
    if (!this.ready || this.destroyed) return;
    this.destroy();
    this.onSelect(i);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.input.keyboard.off('keydown', this._onKey);
    this.container.destroy();
  }
}
