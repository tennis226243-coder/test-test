"""Builds game/src/data/map.json and game/src/data/locations.json (deterministic)."""
import json, random
from pathlib import Path

W, H = 60, 40
DATA = Path(__file__).resolve().parent.parent / "game" / "src" / "data"

LOCATIONS = [
    {"id": "campus",   "name": "大学キャンパス", "rect": {"x": 4,  "y": 2,  "w": 14, "h": 9}, "building": True},
    {"id": "library",  "name": "図書館",       "rect": {"x": 20, "y": 4,  "w": 7,  "h": 6}, "building": True},
    {"id": "shopping", "name": "駅前商店街",   "rect": {"x": 33, "y": 4,  "w": 12, "h": 6}, "building": True},
    {"id": "station",  "name": "駅",           "rect": {"x": 48, "y": 3,  "w": 9,  "h": 7}, "building": True},
    {"id": "home",     "name": "自宅",         "rect": {"x": 4,  "y": 19, "w": 6,  "h": 5}, "building": True},
    {"id": "shrine",   "name": "神社",         "rect": {"x": 13, "y": 18, "w": 8,  "h": 6}, "building": True},
    {"id": "cafe",     "name": "カフェ",       "rect": {"x": 34, "y": 19, "w": 7,  "h": 5}, "building": True},
    {"id": "seaside",  "name": "海辺の公園",   "rect": {"x": 32, "y": 29, "w": 20, "h": 3}, "building": False},
]

ACTIONS = {
    "campus":   [{"id": "class", "label": "授業を受ける", "effects": {"stats": {"int": 3}}, "condition": {"dayType": ["weekday"], "time": ["morning", "noon"]}}],
    "library":  [{"id": "study", "label": "自習する", "effects": {"stats": {"int": 2}}}],
    "shopping": [
        {"id": "buy_flowers",   "label": "花束を買う (1500円)",       "item": "flowers",   "cost": 1500},
        {"id": "buy_book",      "label": "本を買う (1200円)",         "item": "book",      "cost": 1200},
        {"id": "buy_accessory", "label": "アクセサリーを買う (3000円)", "item": "accessory", "cost": 3000},
        {"id": "buy_sweets",    "label": "スイーツを買う (800円)",     "item": "sweets",    "cost": 800},
    ],
    "cafe":     [{"id": "work", "label": "バイトする (+2000円)", "effects": {"money": 2000, "stats": {"stamina": -2}}}],
    "seaside":  [{"id": "run", "label": "ランニングする", "effects": {"stats": {"stamina": 3}}}],
    "shrine":   [{"id": "pray", "label": "お参りする", "effects": {"stats": {"charm": 2}}}],
    "home":     [{"id": "rest", "label": "休む (翌朝へ)", "sleep": True}, {"id": "save", "label": "セーブする", "save": True}],
    "station":  [{"id": "look", "label": "時刻表を眺める", "effects": {}}],
}

def build():
    t = [["g"] * W for _ in range(H)]
    for y in range(29, 32):
        for x in range(W): t[y][x] = "s"
    for y in range(32, H):
        for x in range(W): t[y][x] = "w"
    def road(x0, y0, x1, y1):
        for y in range(min(y0, y1), max(y0, y1) + 1):
            for x in range(min(x0, x1), max(x0, x1) + 1):
                if t[y][x] != "w": t[y][x] = "."
    road(1, 13, 58, 14)
    road(1, 26, 58, 27)
    road(28, 1, 29, 28)
    locs = []
    for L in LOCATIONS:
        r = L["rect"]
        door = {"x": r["x"] + r["w"] // 2, "y": r["y"] + r["h"]} if L["building"] else {"x": r["x"] + r["w"] // 2, "y": r["y"] - 1}
        if L["building"]:
            for y in range(r["y"], r["y"] + r["h"]):
                for x in range(r["x"], r["x"] + r["w"]): t[y][x] = "b"
        target = 14 if door["y"] < 20 else 26
        road(door["x"], door["y"], door["x"] + 1, target)
        locs.append({"id": L["id"], "name": L["name"], "rect": r, "door": door, "building": L["building"], "actions": ACTIONS[L["id"]]})
    rnd = random.Random(7)
    for _ in range(140):
        x, y = rnd.randrange(W), rnd.randrange(H)
        if t[y][x] == "g": t[y][x] = "t"
    for x in range(W):
        if t[0][x] == "g": t[0][x] = "t"
    for y in range(29):
        for x in (0, W - 1):
            if t[y][x] == "g": t[y][x] = "t"
    home = next(l for l in locs if l["id"] == "home")
    spawn = {"x": home["door"]["x"], "y": home["door"]["y"] + 1}
    (DATA / "map.json").write_text(json.dumps({"tileSize": 32, "spawn": spawn, "tiles": ["".join(r) for r in t]}, ensure_ascii=False, indent=1))
    (DATA / "locations.json").write_text(json.dumps(locs, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    build()
