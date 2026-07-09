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
#   docker build -t cascadia-demo-data .

FROM alpine:3.20

COPY robot-arm /demo-data/robot-arm

LABEL org.opencontainers.image.source="https://github.com/Cascadia-PLM/Demo-Data"
LABEL org.opencontainers.image.description="Cascadia PLM demo dataset (TDJ-25 robot arm: 79 GLB + thumbnail pairs and a manifest)."
LABEL org.opencontainers.image.licenses="AGPL-3.0-only"
