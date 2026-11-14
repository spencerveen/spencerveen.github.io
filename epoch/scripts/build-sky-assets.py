#!/usr/bin/env python3
"""Prepare reproducible local 2K WebP panoramas from CC0 Poly Haven sky HDRIs."""
from __future__ import annotations

import hashlib
import io
import json
import pathlib
import time
import urllib.parse
import urllib.request

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "sky"
ASSETS = {
    "day": "kloofendal_48d_partly_cloudy_puresky",
    "night": "kloppenheim_02_puresky",
}
HEADERS = {"User-Agent": "Epoch-Skybox-Builder/1.0 (noncommercial CC0 asset integration)"}


def download(url: str, max_bytes: int = 60_000_000) -> bytes:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.netloc not in {"dl.polyhaven.org", "api.polyhaven.com"}:
        raise ValueError(f"Unexpected sky asset source host: {parsed.netloc}")
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(request, timeout=80) as response:
                result = response.read(max_bytes + 1)
                if len(result) > max_bytes:
                    raise ValueError("Sky source exceeds download budget")
                return result
        except (OSError, TimeoutError) as exc:
            if attempt == 2:
                raise RuntimeError(f"Could not obtain {url}") from exc
            time.sleep(2 ** attempt)
    raise RuntimeError("Unreachable")


def find_tonemapped(files: dict) -> dict:
    tonemapped = files.get("tonemapped")
    if isinstance(tonemapped, dict) and isinstance(tonemapped.get("url"), str):
        return tonemapped
    # Tolerate the API exposing an optional format wrapper.
    if isinstance(tonemapped, dict):
        for child in tonemapped.values():
            if isinstance(child, dict) and child.get("url", "").lower().endswith((".jpg", ".jpeg")):
                return child
    raise RuntimeError("Official Poly Haven files manifest is missing its tonemapped JPG")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {
        "license": "CC0-1.0",
        "origin": "https://polyhaven.com",
        "resolution": [2048, 1024],
        "panoramas": {},
    }
    for mode, slug in ASSETS.items():
        files = json.loads(download(f"https://api.polyhaven.com/files/{slug}", max_bytes=2_000_000))
        selected = find_tonemapped(files)
        source = selected["url"]
        raw = download(source)
        if selected.get("md5") and hashlib.md5(raw).hexdigest() != selected["md5"]:
            raise ValueError(f"Official MD5 mismatch for {mode}")
        with Image.open(io.BytesIO(raw)) as image:
            image.load()
            if not 1.86 <= image.width / image.height <= 2.14:
                raise ValueError(f"{mode}: expected equirectangular sky, got {image.size}")
            resized = image.convert("RGB").resize((2048, 1024), Image.Resampling.LANCZOS)
            path = OUT / f"{mode}.webp"
            resized.save(path, format="WEBP", quality=84 if mode == "day" else 89, method=6)
        optimized = path.read_bytes()
        if len(optimized) > 1_200_000:
            raise ValueError(f"{mode} sky exceeded the 1.2 MB browser budget")
        manifest["panoramas"][mode] = {
            "polyhaven_id": slug,
            "page": f"https://polyhaven.com/a/{slug}",
            "file": path.name,
            "bytes": len(optimized),
            "sha256": hashlib.sha256(optimized).hexdigest(),
        }
        print(f"{mode}: {len(raw):,} source bytes -> {len(optimized):,} WebP bytes", flush=True)
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
