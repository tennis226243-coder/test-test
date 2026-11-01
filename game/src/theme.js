export const FONT = '"Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", Meiryo, sans-serif';
export const COLORS = { panel: 0x10131c, panelAlpha: 0.88, accent: 0xff8fa3, text: '#f4f1ea', sub: '#aab0c0', border: 0xffffff };
export const LOCATION_COLORS = {
  campus: 0x8a6d5a, library: 0x6b7f99, shopping: 0xc9804f, station: 0x7c7c86,
  home: 0x9a8f6a, shrine: 0xb0413e, cafe: 0x6f4e37, seaside: 0x4aa3c7,
};
export const text = (scene, x, y, str, size = 22, color = COLORS.text, extra = {}) =>
  scene.add.text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, ...extra });
