import { store } from '../store.js';
import { text, COLORS } from '../theme.js';
import { getDate, TIME_LABELS } from '../systems/TimeSystem.js';

export class HUDScene extends Phaser.Scene {
  constructor() { super('HUD'); }

  create() {
    this.add.rectangle(12, 12, 360, 132, COLORS.panel, 0.75).setOrigin(0).setStrokeStyle(1, 0xffffff, 0.2);
    this.dateText = text(this, 28, 22, '', 28);
    this.moneyText = text(this, 28, 62, '', 18, COLORS.sub);
    this.statText = text(this, 28, 88, '', 18, COLORS.sub);
    this.affText = text(this, 28, 112, '', 18);
    this.toastBox = this.add.rectangle(this.scale.width / 2, 660, 760, 52, COLORS.panel, 0.9).setStrokeStyle(1, 0xffffff, 0.25).setVisible(false);
    this.toastText = text(this, this.scale.width / 2, 660, '', 20).setOrigin(0.5).setVisible(false);

    this.onChange = () => this.render();
    this.onToast = (msg) => this.showToast(msg);
    store.events.on('change', this.onChange);
    store.events.on('toast', this.onToast);
    this.events.once('shutdown', () => {
      store.events.off('change', this.onChange);
      store.events.off('toast', this.onToast);
    });
    if (this.sys.game.device.input.touch) this.touchPad();
    this.render();
  }

  render() {
    const s = store.state;
    if (!s) return;
    const d = getDate(s);
    this.dateText.setText(`${d.month}月${d.date}日(${d.weekdayLabel}) ${TIME_LABELS[s.time]}`);
    this.moneyText.setText(`所持金 ${s.money.toLocaleString()}円`);
    this.statText.setText(`知力 ${s.stats.int}  魅力 ${s.stats.charm}  体力 ${s.stats.stamina}`);
    this.affText.setText(store.data.heroines.map((h) => `${h.name.split(' ')[1]} ♥${s.affection[h.id]}`).join('  '));
  }

  showToast(msg) {
    this.toastBox.setVisible(true); this.toastText.setText(msg).setVisible(true);
    this.toastTimer?.remove();
    this.toastTimer = this.time.delayedCall(2200, () => { this.toastBox.setVisible(false); this.toastText.setVisible(false); });
  }

  touchPad() {
    const H = this.scale.height, W = this.scale.width;
    const btn = (x, y, label, dir) => {
      const b = this.add.circle(x, y, 38, 0xffffff, 0.18).setStrokeStyle(2, 0xffffff, 0.4).setInteractive();
      text(this, x, y, label, 28).setOrigin(0.5);
      const set = (v) => () => { store.touch[dir] = v; };
      b.on('pointerdown', set(true)); b.on('pointerup', set(false)); b.on('pointerout', set(false));
    };
    btn(110, H - 190, '▲', 'up'); btn(110, H - 70, '▼', 'down');
    btn(50, H - 130, '◀', 'left'); btn(170, H - 130, '▶', 'right');
    const a = this.add.circle(W - 90, H - 110, 52, 0xff8fa3, 0.35).setStrokeStyle(2, 0xffffff, 0.5).setInteractive();
    text(this, W - 90, H - 110, '話す', 24).setOrigin(0.5);
    a.on('pointerdown', () => store.events.emit('interact'));
  }
}
