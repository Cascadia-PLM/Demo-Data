# Cascadia Demo Data — FreeCAD / KiCad datasets

Two products taken all the way through [Cascadia PLM](https://github.com/Cascadia-PLM/Cascadia-App),
seeded by one command:

```bash
npm run demo:fetch && npm run seed:freecaddemo
```

| Program | Design         | Product                                                                   |
| ------- | -------------- | ------------------------------------------------------------------------- |
| `PUC`   | `PUC-CART-24V` | 4WD skid-steer powered utility cart — post-release ECO flow               |
| `USV`   | `USV-CAT-3M`   | 3 m semi-autonomous survey catamaran — pre-release review flow            |

Unlike the robot arm, this is not just geometry. It carries the whole
engineering record: parts and assemblies with BOM and AML, requirements and V&V
with coverage gaps left in deliberately, ECO history, KiCad boards with Software
items and firmware source, MES travelers with work orders and serialized units
with genealogy, Cables-workbench harnesses, and TechDraw drawings.

## Contents

```
manifest.json    what the bundle holds, how to insert it, and the blob inventory
tables/          one JSON file per database table, ids already deterministic
files/           vault blobs, each named by its own SHA-256
```

## Why it is baked rather than scripted

The dataset is authored by a separate ~10k-line Python pipeline driving
FreeCAD 1.1, KiCad 10 and Cascadia's CAD-converter workers, pushing everything
through the HTTP API over one to two hours. That is a good way to author a
dataset and a hopeless way to seed one: it needs two CAD toolchains, Docker
workers, a live server and an API key, and it mints different UUIDs every run.

So the pipeline runs once and the answer is frozen here. Seeding replays it into
an empty database in seconds, with no toolchain and no network.

Ids are derived — `sha256(namespace + source id)`, shaped as a v4 UUID — so one
bundle seeds to the same ids on every machine and every run. Re-baking a *fresh*
pipeline run yields different ids, which is why `scripts/fetch-demo-data.ts` in
the application repo pins a tag.

## Assemblies can be taken apart in the viewer

Every assembly GLB here carries one glTF node per leaf part — named by its
instance path, placed by its own matrix — and the matching `nodes` manifest on
the file's `cad_metadata` row. That is what lets the 3D viewer highlight a part
under the cursor and open the part it belongs to; a viewer reading a GLB with no
`nodes` key treats the model as one solid, which is what it is.

127 of the 203 GLB rows are structured that way, describing 2,303 selectable
parts between them — the cart's top-level model alone has 239. The other 76 are
single parts, which have nothing to take apart and are written flat.

Re-baking these is not a JSON rewrite: a flat GLB groups its triangles by
colour, so an eighty-part assembly arrives as about six meshes with no part
identity anywhere in the file. The structure has to come from the STEP, which is
why the STEP blobs are shipped alongside — `python apply_to_dataset.py` in the
application repo's re-bake tooling reconverts from them in about 100 seconds.

## STL files are deliberately absent

The CAD converter emits an STL on the way from STEP to GLB, and the 3D viewer
reads only the GLB. Shipping both would have added roughly a third to the
download for nothing, so the STL rows are left out of the bundle entirely rather
than listed as files whose download fails.

GLB (what the viewer renders), STEP (neutral CAD interchange), the FreeCAD
source documents, drawing SVGs, board PDFs and thumbnails are all included.

## Licence

Same as the rest of this repository: AGPL-3.0-only. The CAD, boards and firmware
here are synthetic demonstration content, authored for this dataset.
