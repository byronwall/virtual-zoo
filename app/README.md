# App Workspace

SolidStart app for Violet's Stuffed Animal Zoo.

## Commands

```bash
pnpm install
pnpm prepare
pnpm dev
pnpm lint
pnpm type-check
pnpm build
pnpm start
```

## App Structure

- `src/routes/index.tsx`: main zoo route
- `src/routes/api/zoo/*`: passcode, inventory, upload, and image APIs
- `src/components/stuffed-zoo/*`: feature UI
- `src/lib/stuffed-zoo/*`: schemas, passcode helpers, file store, and image helper client
- `src/components/ui/*`: shared Park/Panda UI wrappers

Runtime data is persisted under `APP_DATA_DIR/stuffed-zoo`, defaulting locally to `app/data/stuffed-zoo`.
