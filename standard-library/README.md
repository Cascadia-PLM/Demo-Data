# Standard Parts Library — Demo Dataset

Library components for the Cascadia demo, seeded by
`scripts/seed-demo-library.ts` into the **Standard Parts Library** (`STD-LIB`).

## What's here

```
manifest.json         the components and their properties
glb/*.glb             3D viewer payload, one per component
thumbnails/*.png      item card previews, one per component
```

| key                 | component                             | case L×W×H (mm) | mass    |
| ------------------- | ------------------------------------- | --------------- | ------- |
| `LIB-BATT-24V-75AH` | Battery, 24 V 75 Ah LiFePO4, built-in BMS | 330 × 180 × 220 | 19.5 kg |
| `LIB-BATT-24V-20AH` | Battery, 24 V 20 Ah LiFePO4, built-in BMS | 181 × 77 × 167  | 5.0 kg  |

They are the same family as the PUC cart's `PUC-1510` (24 V 50 Ah,
260 × 168 × 211, 10.5 kg), so the three read as one product line at three
capacities — and every dimension differs between all three, which is the point:
a library of genuinely distinct components, not one box relabelled.

## Two things that make this dataset different

**The parts seed unreleased.** Revision A, Draft, in no BOM. The library is
where a component sits while it is still a candidate, and the demo needs that
state to be visible.

**It carries no item numbers.** A library part draws from the shared `Part`
sequence — the same one a user creating a library part by hand draws from — so
a dataset pinning `PN-000001` would collide with whatever an install already
had. Parts are keyed by `key` here; the seeder allocates the number, advances
the sequence, and records the key on the item so a re-run recognises its own
work.

The seeder resolves `STD-LIB` and its main branch on the target for the same
reason the FreeCAD bundle cannot carry these at all: `db:seed` creates the
library on every install with a fixed design id but a per-install branch and
commit, and nothing baked could reference those.

## Source

Modelled in FreeCAD 1.1 (headless) by the FreeCADDemo repository's `library/`
build, exported to coloured STEP by its GUI pass, and converted to GLB by
Cascadia's own cad-converter — the same toolchain behind the PUC and USV
datasets, and the reason these GLBs carry the Z-up → Y-up root rotation glTF
mandates.

Regenerate with `library/build/build_all.py`, its `gui_export.py`, and
`library/build/export_dataset.py`.
