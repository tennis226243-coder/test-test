import { FONT, LOCATION_COLORS } from '../theme.js';

const EXPR_LABEL = { normal: '通常', smile: '笑顔', shy: '照れ', surprised: '驚き', sad: '悲しみ' };

/** Returns a texture key for the portrait; draws a named silhouette if the real image is missing. */
export function ensurePortrait(scene, heroine, expr) {
  const key = `portrait_${heroine.id}_${expr}`;
  if (scene.textures.exists(key)) return key;
  const fallback = `ph_${key}`;
  if (scene.textures.exists(fallback)) return fallback;
  const w = 460, h = 680;
  const color = Phaser.Display.Color.HexStringToColor(heroine.color).color;
  const rt = scene.make.renderTexture({ width: w, height: h }, false);
  const g = scene.make.graphics({ add: false });
  g.fillStyle(color, 0.85);
  g.fillCircle(w / 2, 170, 105);
  g.fillRoundedRect(w / 2 - 170, 290, 340, 420, 120);
  g.fillStyle(0xffffff, 0.15).fillCircle(w / 2 - 35, 140, 30);
  rt.draw(g);
  const label = scene.make.text({ x: w / 2, y: 470, text: `${heroine.name}\n(${EXPR_LABEL[expr] ?? expr})`, style: { fontFamily: FONT, fontSize: '30px', color: '#ffffff', align: 'center' }, add: false }).setOrigin(0.5);
  rt.draw(label);
  rt.saveTexture(fallback);
  g.destroy(); label.destroy();
  return fallback;
}

export function ensureBackground(scene, location) {
  const key = `bg_${location.id}`;
  if (scene.textures.exists(key)) return key;
  const fallback = `ph_${key}`;
  if (scene.textures.exists(fallback)) return fallback;
  const w = 1280, h = 720;
  const base = Phaser.Display.Color.ValueToColor(LOCATION_COLORS[location.id] ?? 0x555555);
  const rt = scene.make.renderTexture({ width: w, height: h }, false);
  const g = scene.make.graphics({ add: false });
  for (let i = 0; i < 24; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(base.clone().lighten(30), base.clone().darken(40), 24, i);
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b)).fillRect(0, (h / 24) * i, w, h / 24 + 1);
  }
  rt.draw(g);
  const label = scene.make.text({ x: w / 2, y: h / 2 - 60, text: location.name, style: { fontFamily: FONT, fontSize: '96px', color: '#ffffff' }, add: false }).setOrigin(0.5).setAlpha(0.18);
  rt.draw(label);
  rt.saveTexture(fallback);
  g.destroy(); label.destroy();
  return fallback;
}
