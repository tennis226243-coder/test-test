// Procedural pixel-art textures for the overworld (no external tile assets needed).
export const TILE = 32;

function tex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ add: false });
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function speckle(g, color, n, seed) {
  let s = seed;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  g.fillStyle(color, 1);
  for (let i = 0; i < n; i++) g.fillRect(Math.floor(r() * 30), Math.floor(r() * 30), 2, 2);
}

export function generateTileTextures(scene) {
  tex(scene, 'tile_g', TILE, TILE, (g) => { g.fillStyle(0x6fbf5a).fillRect(0, 0, TILE, TILE); speckle(g, 0x5aa84a, 10, 3); speckle(g, 0x8fd477, 4, 11); });
  tex(scene, 'tile_.', TILE, TILE, (g) => { g.fillStyle(0xc8c2b4).fillRect(0, 0, TILE, TILE); speckle(g, 0xb5ae9f, 8, 5); });
  tex(scene, 'tile_s', TILE, TILE, (g) => { g.fillStyle(0xead9a6).fillRect(0, 0, TILE, TILE); speckle(g, 0xd9c48a, 8, 7); });
  tex(scene, 'tile_w', TILE, TILE, (g) => {
    g.fillStyle(0x3d8fc6).fillRect(0, 0, TILE, TILE);
    g.lineStyle(2, 0x7cc3ec, 0.8);
    g.beginPath(); g.moveTo(4, 10); g.lineTo(10, 7); g.lineTo(16, 10); g.strokePath();
    g.beginPath(); g.moveTo(16, 24); g.lineTo(22, 21); g.lineTo(28, 24); g.strokePath();
  });
  tex(scene, 'tile_t', TILE, TILE, (g) => {
    g.fillStyle(0x6fbf5a).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0x6b4a2b).fillRect(14, 20, 4, 10);
    g.fillStyle(0x2f7d3a).fillCircle(16, 14, 12);
    g.fillStyle(0x3f9a4a).fillCircle(12, 11, 6);
  });
  tex(scene, 'tile_b', TILE, TILE, (g) => { g.fillStyle(0xe8e1d4).fillRect(0, 0, TILE, TILE); g.lineStyle(1, 0xcfc6b5).strokeRect(0, 0, TILE, TILE); });
  tex(scene, 'player', 24, 32, (g) => person(g, 0x3b5bdb, 0x2b2b2b));
}

function person(g, body, hair) {
  g.fillStyle(0x000000, 0.25).fillEllipse(12, 30, 18, 5);
  g.fillStyle(body).fillRoundedRect(4, 13, 16, 15, 4);
  g.fillStyle(0xf3d2b5).fillCircle(12, 8, 7);
  g.fillStyle(hair).fillRect(5, 1, 14, 5);
}

export function heroineSprite(scene, heroine) {
  const key = `npc_${heroine.id}`;
  const c = Phaser.Display.Color.HexStringToColor(heroine.color).color;
  const hair = { hina: 0x9a6a3c, rei: 0x1d1d22, shiori: 0x24242c }[heroine.id] ?? 0x333333;
  tex(scene, key, 24, 32, (g) => {
    person(g, c, hair);
    g.fillStyle(hair).fillRect(4, 4, 3, heroine.id === 'rei' ? 14 : 9).fillRect(17, 4, 3, heroine.id === 'rei' ? 14 : 9);
  });
  return key;
}
