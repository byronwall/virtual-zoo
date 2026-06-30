# Violet's Stuffed Animal Zoo

A small SolidStart site for keeping a playful inventory and bedtime log for Violet's stuffed animals.

The app is intentionally simple:

- shared passcode gate, defaulting to `violet`
- iPad-friendly photo upload
- JSON and image files stored on disk under `APP_DATA_DIR`
- touch-drag animal pile with persisted positions
- two-week visual sleepover calendar
- optional asynchronous background removal through a local `rembg` helper service

## Layout

- `/app` - SolidStart application
- `/rembg-service` - Python FastAPI helper for image resize/HEIC support/background removal
- `/docs/stuffed-animal-zoo-intent-plan.md` - product intent and implementation plan
- `/docker-compose.yml` + `/Dockerfile` - Coolify-friendly production deployment

## Development

Requires Node `>=22` and pnpm `11.7.0`.

```bash
pnpm -C app install
pnpm -C app dev
```

Useful checks:

```bash
pnpm -C app type-check
pnpm -C app lint
pnpm -C app build
```

## Data

Local development defaults to `app/data/stuffed-zoo`. Docker Compose sets `APP_DATA_DIR=/app/data` and mounts that path to the `stuffed-zoo-data` volume.

Expected data shape:

```text
/app/data/stuffed-zoo/
  animals.json
  images/
    original/
    display/
    processed/
```

## Deployment

The app is intended to deploy through Coolify from `docker-compose.yml`.

Environment variables:

```text
STUFFED_ZOO_PASSCODE=violet
BACKGROUND_REMOVAL_PROVIDER=rembg
REMBG_SERVICE_URL=http://rembg:7000
APP_PORT=3000
BASE_PATH=/
```

Run locally with Docker:

```bash
docker compose up --build
```
