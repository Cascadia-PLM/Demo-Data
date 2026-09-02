# Cascadia Demo Data

The datasets behind the [Cascadia PLM](https://github.com/Cascadia-PLM/Cascadia-App)
demo:

- **`robot-arm/`** — a 6-axis robot arm, ~88 parts and ~101 BOM relationships,
  pre-converted to web-ready GLB with per-face colors. Geometry and structure.
- **`freecad-demo/`** — two products taken through the *whole* PLM record: a
  powered utility cart (`PUC`) and a survey catamaran (`USV`), with BOM and AML,
  requirements and V&V, ECO history, KiCad boards and firmware source, MES
  travelers and serialized genealogy, harnesses and drawings. Built with an open
  toolchain (FreeCAD 1.1, KiCad 10) and baked from a real seeded database.

They live here rather than in Cascadia-App because they are large (~420 MB
together) and change rarely, while the application repo is ~5 MiB and changes
constantly. Keeping them together meant every clone of the app paid for the
datasets, and every image build shipped them as build context.

## Contents

| Path | What | Size |
|---|---|---|
| `robot-arm/glb/` | 79 GLB models, colors baked per face | 197 MB |
| `robot-arm/thumbnails/` | 79 PNG thumbnails, one per model | 2.1 MB |
| `robot-arm/manifest.json` | Part numbers, BOM structure, Make/Buy classification | 44 KB |
| `robot-arm/step/` | STEP sources — **gitignored**, regenerated on demand | 393 MB |
| `freecad-demo/tables/` | One JSON per database table, ids already deterministic | 5.9 MB |
| `freecad-demo/files/` | 616 vault blobs, each named by its own SHA-256 | 213 MB |
| `freecad-demo/manifest.json` | Insert order, deferred columns, blob inventory | 130 KB |

See [`freecad-demo/README.md`](./freecad-demo/README.md) for what that dataset
contains and why it is baked rather than scripted.

## How it is consumed

Published as `ghcr.io/cascadia-plm/cascadia-demo-data`, an `alpine` image whose
only content is `/demo-data/robot-arm` and `/demo-data/freecad-demo`.
Cascadia-App's `docker-compose.demo.yml` runs it as a one-shot init container
that copies the datasets into a named volume, which the app then reads via
`DEMO_DATA_DIR`.

The image ships GLB + thumbnails only. Cascadia-App's seed treats STEP files as
optional and builds its 3D viewer from the GLB, so parts show no "STEP file" pill
in the demo. That is expected, not a bug.

For local development against Cascadia-App, `npm run demo:fetch` in that repo
shallow-clones this one at a pinned tag, then `npm run db:seed:demo` seeds the
robot arm and `npm run seed:freecaddemo` seeds the FreeCAD/KiCad datasets.

## Regenerating the datasets

`freecad-demo/` is produced by `npm run demo:bake:freecad` in Cascadia-App,
against a database its Python authoring pipeline has seeded. That pipeline lives
in the private `Cascadia-PLM/FreeCADDemo` repo and needs FreeCAD 1.1, KiCad 10
and the CAD-converter workers; baking freezes its result so seeding needs none
of them.

The robot arm is maintainer-only, and it needs the private
[`Cascadia-App-archive`](https://github.com/Cascadia-PLM/Cascadia-App-archive)
repo, which holds the SolidWorks source, `assembly-structure.json`, and
`step-output/`. Clone it as a sibling of this repo, or set `ARCHIVE_DIR`.

```bash
npm install

# 1. SolidWorks -> self-contained AP214 STEP (needs SOLIDWORKS installed).
#    Only required if the CAD itself changed.
pwsh ./scripts/export-demo-steps.ps1

# 2. Rebuild manifest.json and stage canonical STEPs into robot-arm/step/.
npm run build:manifest

# 3. STEP -> GLB + thumbnails, via the published cad-converter image.
npm run build:cad
```

`prepare-demo-cad.ts` pulls `ghcr.io/cascadia-plm/cascadia-cad-converter:latest`.
Set `CAD_IMAGE` to a locally-built tag to test a converter change before it lands.

## Provenance and licensing

The assembly is derived from an FRC-style robot arm and includes vendor
components (West Coast Products, REV Robotics, McMaster-Carr, CTR Electronics)
alongside custom `TDJ-25-*` parts. Vendor geometry is redistributed here in
neutral GLB form for demonstration purposes only. Native SolidWorks files are not
published.

Tooling in `scripts/` is AGPL-3.0-only, matching Cascadia-App.
