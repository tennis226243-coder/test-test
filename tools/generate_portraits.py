"""Generate photorealistic heroine portraits and backgrounds with the Gemini API.

Usage:
  python3 tools/generate_portraits.py                 # generate everything that is missing
  python3 tools/generate_portraits.py --only hina:smile --only bg:cafe
  python3 tools/generate_portraits.py --force         # regenerate even if files exist
  python3 tools/generate_portraits.py --list-models   # show models available to your key

Requires the environment variable GEMINI_API_KEY. Set GEMINI_IMAGE_MODEL to override the model.
"""
from __future__ import annotations

import argparse
import base64
import html
import io
import json
import os
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "game" / "src" / "data"
ASSETS = ROOT / "game" / "assets"
PROMPTS = Path(__file__).resolve().parent / "prompts"
OUT = Path(__file__).resolve().parent / "out"

API = "https://generativelanguage.googleapis.com/v1beta"
MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")
EXPRESSIONS = ["normal", "smile", "shy", "surprised", "sad"]
EXPRESSION_TEXT = {
    "normal": "a calm, gentle neutral expression with a faint smile",
    "smile": "a bright, happy open smile",
    "shy": "a shy, bashful look with slightly flushed cheeks, eyes glancing aside",
    "surprised": "a surprised look with widened eyes and slightly parted lips",
    "sad": "a sad, downcast expression with lowered eyes",
}
BACKGROUND_TEXT = {
    "campus": "a modern Japanese university campus courtyard with brick buildings, trees and benches",
    "library": "the quiet interior of a cozy public library with tall wooden bookshelves and reading tables by the window",
    "shopping": "a lively covered shopping arcade street near a train station with small shops and lanterns",
    "station": "a small local train station platform by the sea",
    "home": "a tidy small one-room apartment interior with a desk, bed and a window",
    "shrine": "a quiet Shinto shrine on a hill with a red torii gate, stone steps and trees",
    "cafe": "the warm interior of a small stylish coffee shop with a wooden counter and espresso machine",
    "seaside": "a seaside park promenade with a sandy beach, calm ocean and a lighthouse in the distance",
}
PORTRAIT_HEIGHT = 1600
BG_SIZE = (1920, 1080)
RETRY_WAITS = [2, 4, 8, 16]


class GenerationRefused(Exception):
    """The model answered without an image (safety filter or similar)."""


@dataclass
class Job:
    kind: str  # "portrait" | "background"
    id: str
    expr: str | None
    path: Path


def load_data():
    heroines = json.loads((DATA / "heroines.json").read_text(encoding="utf-8"))
    locations = json.loads((DATA / "locations.json").read_text(encoding="utf-8"))
    return heroines, locations


def portrait_path(hid, expr):
    return ASSETS / "portraits" / hid / f"{expr}.png"


def background_path(loc):
    return ASSETS / "backgrounds" / f"{loc}.jpg"


def plan_jobs(heroines, locations, only, force, exists_fn=lambda p: p.exists()):
    wanted = set(only or [])

    def selected(key):
        return not wanted or key in wanted

    jobs = []
    for h in heroines:
        for expr in EXPRESSIONS:  # "normal" first: the others use it as a reference image
            path = portrait_path(h["id"], expr)
            if selected(f"{h['id']}:{expr}") and (force or not exists_fn(path)):
                jobs.append(Job("portrait", h["id"], expr, path))
    for loc in locations:
        path = background_path(loc["id"])
        if selected(f"bg:{loc['id']}") and (force or not exists_fn(path)):
            jobs.append(Job("background", loc["id"], None, path))
    return jobs


def _template(name):
    return (PROMPTS / name).read_text(encoding="utf-8")


def build_portrait_prompt(heroine, expr="normal"):
    return _template("portrait.txt").format(
        age=heroine["age"], appearance=heroine["appearance"],
        personality=heroine.get("personality", ""), expression=EXPRESSION_TEXT[expr],
    )


def build_expression_prompt(heroine, expr):
    return _template("expression.txt").format(age=heroine["age"], expression=f"{expr} — {EXPRESSION_TEXT[expr]}")


def build_background_prompt(location):
    return _template("background.txt").format(description=BACKGROUND_TEXT.get(location["id"], location["name"]))


def call_gemini(prompt, ref_image_bytes=None, *, api_key, aspect_ratio=None,
                opener=urllib.request.urlopen, sleep=time.sleep):
    parts = [{"text": prompt}]
    if ref_image_bytes:
        parts.append({"inline_data": {"mime_type": "image/png", "data": base64.b64encode(ref_image_bytes).decode()}})
    body = {"contents": [{"parts": parts}], "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]}}
    if aspect_ratio:
        body["generationConfig"]["imageConfig"] = {"aspectRatio": aspect_ratio}
    data = json.dumps(body).encode()
    for attempt in range(len(RETRY_WAITS) + 1):
        req = urllib.request.Request(
            f"{API}/models/{MODEL}:generateContent", data=data, method="POST",
            headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        )
        try:
            with opener(req, timeout=180) as res:
                payload = json.loads(res.read())
            break
        except urllib.error.HTTPError as e:
            if (e.code == 429 or e.code >= 500) and attempt < len(RETRY_WAITS):
                sleep(RETRY_WAITS[attempt])
                continue
            raise
    for cand in payload.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                return base64.b64decode(inline["data"])
    reasons = [c.get("finishReason") for c in payload.get("candidates", [])]
    block = payload.get("promptFeedback", {}).get("blockReason")
    raise GenerationRefused(block or ",".join(filter(None, reasons)) or "no image in response")


def remove_green(img):
    """Chroma-key: make green-dominant pixels transparent, soften edges and remove green spill."""
    rgba = img.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            dominance = g - max(r, b)
            if dominance > 60:
                px[x, y] = (r, g, b, 0)
            elif dominance > 20:
                alpha = int(255 * (60 - dominance) / 40)
                px[x, y] = (r, max(r, b), b, alpha)
    return rgba


def finish_portrait(raw):
    img = remove_green(Image.open(io.BytesIO(raw)))
    bbox = img.getchannel("A").getbbox()
    if bbox:
        img = img.crop(bbox)
    scale = PORTRAIT_HEIGHT / img.height
    return img.resize((max(1, round(img.width * scale)), PORTRAIT_HEIGHT), Image.LANCZOS)


def finish_background(raw):
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    tw, th = BG_SIZE
    scale = max(tw / img.width, th / img.height)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    left, top = (img.width - tw) // 2, (img.height - th) // 2
    return img.crop((left, top, left + tw, top + th))


def run_one(job, api_key, heroines=None, locations=None):
    if heroines is None:
        heroines, locations = load_data()
    job.path.parent.mkdir(parents=True, exist_ok=True)
    if job.kind == "portrait":
        heroine = next(h for h in heroines if h["id"] == job.id)
        raw_dir = OUT / "raw" / job.id
        raw_dir.mkdir(parents=True, exist_ok=True)
        if job.expr == "normal":
            raw = call_gemini(build_portrait_prompt(heroine), api_key=api_key, aspect_ratio="3:4")
        else:
            ref = raw_dir / "normal.png"
            if not ref.exists():
                raise GenerationRefused("基本立ち絵 (normal) がないため表情差分を作れません。先に normal を生成してください")
            raw = call_gemini(build_expression_prompt(heroine, job.expr), ref.read_bytes(), api_key=api_key, aspect_ratio="3:4")
        Image.open(io.BytesIO(raw)).save(raw_dir / f"{job.expr}.png")
        finish_portrait(raw).save(job.path)
    else:
        loc = next(l for l in locations if l["id"] == job.id)
        raw = call_gemini(build_background_prompt(loc), api_key=api_key, aspect_ratio="16:9")
        finish_background(raw).save(job.path, quality=88)


def run_jobs(jobs, api_key, run_one=run_one):
    refused = []
    for i, job in enumerate(jobs, 1):
        label = f"{job.id}:{job.expr}" if job.expr else f"bg:{job.id}"
        print(f"[{i}/{len(jobs)}] {label} ...", flush=True)
        try:
            run_one(job, api_key)
        except GenerationRefused as e:
            print(f"  -> スキップ: {e}")
            refused.append((job, str(e)))
        except urllib.error.HTTPError as e:
            print(f"  -> APIエラー {e.code}: {e.read()[:300]!r}")
            refused.append((job, f"HTTP {e.code}"))
    return refused


def write_manifest(heroines, locations):
    manifest = {
        "portraits": {h["id"]: [e for e in EXPRESSIONS if portrait_path(h["id"], e).exists()] for h in heroines},
        "backgrounds": [l["id"] for l in locations if background_path(l["id"]).exists()],
    }
    (ASSETS / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


def write_contact_sheet(manifest):
    OUT.mkdir(parents=True, exist_ok=True)
    cells = []
    for hid, exprs in manifest["portraits"].items():
        for e in exprs:
            src = os.path.relpath(portrait_path(hid, e), OUT)
            cells.append(f'<figure><img src="{html.escape(src)}" style="height:320px;background:#ccc"><figcaption>{hid}:{e}</figcaption></figure>')
    for loc in manifest["backgrounds"]:
        src = os.path.relpath(background_path(loc), OUT)
        cells.append(f'<figure><img src="{html.escape(src)}" style="height:180px"><figcaption>bg:{loc}</figcaption></figure>')
    page = "<!doctype html><meta charset=utf-8><title>Contact sheet</title><style>body{font-family:sans-serif;display:flex;flex-wrap:wrap;gap:12px}</style>" + "".join(cells)
    (OUT / "contact_sheet.html").write_text(page, encoding="utf-8")


def list_models(api_key):
    req = urllib.request.Request(f"{API}/models?pageSize=200", headers={"x-goog-api-key": api_key})
    with urllib.request.urlopen(req, timeout=60) as res:
        for m in json.loads(res.read()).get("models", []):
            if "generateContent" in m.get("supportedGenerationMethods", []):
                print(m["name"].removeprefix("models/"))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--only", action="append", help="hina:smile や bg:cafe の形式で対象を絞る(複数指定可)")
    parser.add_argument("--force", action="store_true", help="既存の画像も作り直す")
    parser.add_argument("--list-models", action="store_true", help="使えるモデルを一覧表示する")
    args = parser.parse_args(argv)

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY が設定されていません。\n"
              "Google AI Studio (https://aistudio.google.com/apikey) で API キーを発行し、\n"
              "環境変数 GEMINI_API_KEY に設定してから再実行してください。")
        return 2
    if args.list_models:
        list_models(api_key)
        return 0

    heroines, locations = load_data()
    jobs = plan_jobs(heroines, locations, args.only, args.force)
    print(f"モデル: {MODEL} / 生成する画像: {len(jobs)} 枚")
    refused = run_jobs(jobs, api_key, run_one=lambda j, k: run_one(j, k, heroines, locations))
    manifest = write_manifest(heroines, locations)
    write_contact_sheet(manifest)
    print(f"一覧ページ: {OUT / 'contact_sheet.html'}")
    if refused:
        print("生成できなかった画像:")
        for job, reason in refused:
            print(f"  - {job.id}:{job.expr or 'bg'} ({reason})")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
