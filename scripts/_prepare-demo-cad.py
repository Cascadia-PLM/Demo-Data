#!/usr/bin/env python3
"""
Helper that runs INSIDE the cad-converter container to batch-convert all STEP
files in /work/step/ into GLB (/work/glb/) + PNG thumbnails (/work/thumbnails/).

Invoked by scripts/prepare-demo-cad.ts. Requires Xvfb running on DISPLAY=:99
for thumbnail rendering — the orchestrator handles that.

Honors:
  FORCE=1        re-convert files that already have a GLB
  ONLY=str       only process basenames containing the substring
  SKIP_THUMBS=1  leave existing thumbnails alone (geometry-only re-bake)
"""

from __future__ import annotations

import json
import os
import sys
import time
import traceback
from pathlib import Path

WORK_DIR = Path(sys.argv[1] if len(sys.argv) > 1 else "/work")
STEP_DIR = WORK_DIR / "step"
GLB_DIR = WORK_DIR / "glb"
THUMB_DIR = WORK_DIR / "thumbnails"
TMP_STL_DIR = Path("/tmp/demo-stl")

FORCE = os.environ.get("FORCE", "0") == "1"
ONLY = os.environ.get("ONLY", "")
SKIP_THUMBS = os.environ.get("SKIP_THUMBS", "0") == "1"

# One JSON per GLB, naming the parts inside it — looked up by the same
# `cadFileBase` key as glb/ and thumbnails/, so the seed needs no index.
# Written because the converter now returns them and the app needs them: an
# assembly GLB carries a glTF node per leaf part, and
# `vault_files.cad_metadata.nodes` is what tells the viewer a model can be
# taken apart. A model with no parts to select gets `{"nodes": []}` rather than
# no file, so a missing file means "not converted yet" and not "single part".
NODE_DIR = WORK_DIR / "nodes"

GLB_DIR.mkdir(parents=True, exist_ok=True)
THUMB_DIR.mkdir(parents=True, exist_ok=True)
NODE_DIR.mkdir(parents=True, exist_ok=True)
TMP_STL_DIR.mkdir(parents=True, exist_ok=True)

# Make the cad_converter package importable.
sys.path.insert(0, "/app/src")

from cad_converter.converter import convert_single_with_colors  # noqa: E402
from cad_converter.models import MeshQuality  # noqa: E402

steps = sorted(STEP_DIR.glob("*.step"))
if ONLY:
    steps = [s for s in steps if ONLY.lower() in s.stem.lower()]

print(f"[helper] {len(steps)} STEP files (FORCE={FORCE}, ONLY={ONLY!r})", flush=True)

ok = 0
skipped = 0
failed: list[tuple[str, str]] = []

t0 = time.time()
for i, step in enumerate(steps, start=1):
    base = step.stem
    glb_out = GLB_DIR / f"{base}.glb"
    thumb_out = THUMB_DIR / f"{base}.png"
    node_out = NODE_DIR / f"{base}.json"
    stl_out = TMP_STL_DIR / f"{base}.stl"

    if not FORCE and glb_out.exists() and thumb_out.exists() and node_out.exists():
        skipped += 1
        continue

    # Re-rendering a thumbnail from unchanged geometry produces a different
    # PNG for the same picture, which is churn in a 197 MB dataset for nothing.
    want_thumb = None if (SKIP_THUMBS and thumb_out.exists()) else str(thumb_out)

    print(f"[{i:>3}/{len(steps)}] {base}", flush=True)
    try:
        result = convert_single_with_colors(
            str(step),
            str(stl_out),
            str(glb_out),
            MeshQuality.STANDARD,
            True,
            want_thumb,
        )
        if glb_out.exists():
            nodes = [n.model_dump() for n in result.glb_nodes]
            node_out.write_text(
                json.dumps({"nodes": nodes}, indent=1), encoding="utf-8"
            )
            print(f"        {len(nodes)} selectable part(s)", flush=True)
            ok += 1
        else:
            failed.append((base, "GLB not produced"))
        # STLs aren't shipped — discard.
        try:
            stl_out.unlink(missing_ok=True)
        except Exception:
            pass
    except Exception as e:
        failed.append((base, f"{type(e).__name__}: {e}"))
        traceback.print_exc()

elapsed = time.time() - t0
print()
print(f"[helper] done in {elapsed:.1f}s — ok={ok}, skipped={skipped}, failed={len(failed)}", flush=True)
if failed:
    print("[helper] failures:", flush=True)
    for base, why in failed:
        print(f"   {base}: {why}", flush=True)

# Exit success even with some failures — the seed handles missing assets gracefully.
sys.exit(0)
