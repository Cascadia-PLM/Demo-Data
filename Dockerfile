# Demo CAD dataset packaged as a tiny image.
#
# Consumed by docker-compose.demo.yml in Cascadia-App: a one-shot init container
# copies /demo-data into a named volume, and the app reads it via DEMO_DATA_DIR.
# Kept out of cascadia-app so production deploys don't carry demo data they will
# never use.
#
# STEP files are filtered out by .dockerignore, which keeps this image identical
# whether it is built in CI (where step/ is gitignored and absent) or on a
# maintainer's machine after regenerating the dataset.
#
# freecad-demo/ carries its own CAD inside content-addressed blobs, so it cannot
# be trimmed by path the way robot-arm/step is. It is already trimmed at bake
# time instead: the exporter leaves STL out, since the viewer reads only the GLB.
#
# Every dataset directory needs its own COPY. Cascadia-App's `seed-demo.ts`
# seeds every dataset and exits non-zero when one is missing, and the quickstart
# only starts the server once that seed succeeds — so a dataset left out here is
# not a smaller demo, it is a demo that never boots. standard-library/ went
# missing exactly that way when it was added in v1.4.0. The publish workflow's
# "Verify image contents" step now checks every manifest.
#
#   docker build -t cascadia-demo-data .

FROM alpine:3.20

COPY robot-arm /demo-data/robot-arm
COPY freecad-demo /demo-data/freecad-demo
COPY standard-library /demo-data/standard-library

LABEL org.opencontainers.image.source="https://github.com/Cascadia-PLM/Demo-Data"
LABEL org.opencontainers.image.description="Cascadia PLM demo datasets (TDJ-25 robot arm, the FreeCAD/KiCad PUC cart + USV catamaran, and standard-library components)."
LABEL org.opencontainers.image.licenses="AGPL-3.0-only"
