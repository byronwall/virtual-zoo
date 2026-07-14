# Development Background-Removal Work Summary

## 1. Scope and Context

The development server was processing the stuffed-zoo image backlog during startup, making local startup unnecessarily slow. The requested behavior was an immediate, reliable development startup with background removal reserved for dedicated checks.

The change covers the background-removal startup plugin, upload queueing, the zoo API snapshot, and client polling. Production processing and the image helper's `/unprocessed` upload conversion remain enabled.

## 2. Major Changes Delivered

- `app/src/lib/stuffed-zoo/image-processing.ts` now disables background-removal recovery and queueing when `NODE_ENV=development` unless `BACKGROUND_REMOVAL_IN_DEV=true`.
- `app/src/routes/api/zoo/animals.ts` reports whether background removal is enabled in the current runtime.
- `app/src/components/stuffed-zoo/ZooApp.tsx` only polls pending images when the server reports that processing is enabled, avoiding a permanent 3.5-second polling loop in development.
- `app/.env.example` and `README.md` document the development default and explicit opt-in.
- `app/src/lib/stuffed-zoo/image-processing.test.ts` covers development, opt-in, production, and disabled-provider behavior.

Intentionally unchanged:

- Production still recovers queued, failed, and stale images at startup.
- Dedicated development checks can exercise the complete removal path with `BACKGROUND_REMOVAL_IN_DEV=true`.
- Uploads still use the image helper to create the display-ready unprocessed WebP.

## 3. Design Decisions and Tradeoffs

### Keep the startup plugin, but make its work conditional

- Decision: return before reading the zoo store when background removal is disabled.
- Alternative: remove the Nitro recovery plugin in development through `app.config.ts`.
- Reason: one runtime policy now controls both startup recovery and per-upload queueing, preventing the two paths from drifting.
- Tradeoff: the policy relies on Vinxi setting `NODE_ENV=development`; the smoke start confirmed that the development path stayed quiet.

### Separate helper usage from background-removal usage

- Decision: leave `shouldUseService()` as the requirement for upload conversion, while `isBackgroundRemovalEnabled()` gates only expensive removal work.
- Alternative: disable the entire image helper in development.
- Reason: disabling the helper would make normal upload testing fail even though only background removal is unwanted.
- Tradeoff: the helper service remains necessary for testing new uploads.

### Expose processing state to the client

- Decision: add `backgroundRemovalEnabled` to the zoo snapshot.
- Alternative: leave pending images polling forever or infer the server environment in browser code.
- Reason: the server owns the runtime policy, and the client can stop polling without duplicating environment rules.
- Tradeoff: the internal API response gains one boolean field.

## 4. Problems Encountered and Resolutions

- Symptom: initial parallel `pnpm` verification commands stayed silent and consumed the command-runner sessions.
- Root cause: runner contention during simultaneous full-project tool invocations; the underlying binaries were healthy.
- Resolution: stopped duplicate sessions, ran the focused Vitest check with one worker, and invoked TypeScript and ESLint directly.
- Preventative action: run the focused test before parallel full-project gates in this repository when command-runner capacity is constrained.

- Symptom: the sandboxed dev-server smoke test could not bind a port.
- Root cause: local port binding is restricted in the default sandbox.
- Resolution: started Vinxi with approved elevated local-server access, observed its ready state, confirmed no background-removal recovery logs, and stopped it cleanly.
- Validation gap: a follow-up `curl` could not reach the elevated process across the runner boundary, so HTTP response verification was not completed.

## 5. Verification and Validation

- Passed: focused Vitest run, 4 tests in `app/src/lib/stuffed-zoo/image-processing.test.ts`.
- Passed: `app/node_modules/.bin/tsc --noEmit -p app/tsconfig.json`.
- Passed: `node_modules/.bin/eslint .` from `app/`.
- Passed: `git diff --check`.
- Manual smoke check: `node_modules/.bin/vinxi dev --port 3210` reached the ready state at `http://localhost:3210/` without logging backlog recovery or background-removal jobs.
- Not completed: localhost HTTP request from a separate runner process, due to runner network isolation.

## 6. Process Improvements

- Current pain: parallel package-script checks can hide useful output when the execution environment is resource-constrained.
- Proposed change: run the smallest relevant test with a single worker first, then type-check and lint.
- Expected benefit: faster failure isolation and fewer orphaned verification sessions.
- Suggested owner/place: repository validation checklist or a future test-runner skill.

## 7. Agent/Skill Improvements

- Current pain: the repository guidance documents background-removal architecture but did not state that expensive jobs should be opt-in during local development.
- Proposed change: add a short image-processing rule to `AGENTS.md`: preserve the development default of no recovery/queueing, and use `BACKGROUND_REMOVAL_IN_DEV=true` only for dedicated checks.
- Expected benefit: future image-pipeline changes are less likely to reintroduce slow development startup.
- Suggested owner/place: the `Jobs And Websockets` vicinity in `AGENTS.md`, or a new image-processing subsection.

## 8. Follow-ups and Open Risks

- Low priority: add an integration test around the Nitro startup plugin if the repository later gains server-start test infrastructure.
- Low priority: make the upload conversion independent of the rembg helper if local upload testing must work with no helper service at all.
- Open risk: an unusual development launcher that does not set `NODE_ENV=development` would retain production behavior. The supported `vinxi dev` path was smoke-tested successfully.
