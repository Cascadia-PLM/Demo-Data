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
#   docker build -t cascadia-demo-data .

FROM alpine:3.20

COPY robot-arm /demo-data/robot-arm
COPY freecad-demo /demo-data/freecad-demo

LABEL org.opencontainers.image.source="https://github.com/Cascadia-PLM/Demo-Data"
LABEL org.opencontainers.image.description="Cascadia PLM demo datasets (TDJ-25 robot arm, and the FreeCAD/KiCad PUC cart + USV catamaran)."
LABEL org.opencontainers.image.licenses="AGPL-3.0-only"
