# Violet's Stuffed Animal Zoo Intent And Rough Plan

## Intent

This project is a small, kid-friendly website for keeping an inventory and playful virtual zoo of stuffed animals. The first version should be intentionally minimal: upload a picture from an iPad, create or edit a stuffed animal entry, display all animals together on a touch-friendly canvas, and let Violet record which animal slept in bed on a given night.

The app is a one-time family plaything, not a full product. It should be simple to deploy, easy to use on an iPad, and pleasant enough that a child wants to come back to it. Data can live as JSON and image files on disk in the Docker volume.

## Core User Story

Violet opens the site on an iPad, enters the family passcode if needed, taps an obvious add button, takes a picture of a stuffed animal, gives it a name and type, optionally adds notes, and saves it. The animal appears on the main zoo canvas as a large sticker-like cutout in a pile of animals. Tapping the animal selects it and shows details in a right-side panel. Violet can tap a large kid-friendly bedtime button to add a sleep log entry for last night.

## Non-Goals For The First Version

- No user accounts. Use a single shared passcode instead.
- No database server.
- No search, filters, tags, collections, achievements, or sharing in the first pass.
- No complex photo editor.
- No analytics, billing, email, or admin flows from the scaffold.
- No fully automated animal recognition unless it is trivial to add later.
- No native iPad app; this should stay a website.
- No export/backup button in the first pass, although the Docker volume should still be easy to back up manually.

## Product Decisions

- Site name: "Violet's Stuffed Animal Zoo".
- Main visual metaphor: a playful pile of animal stickers.
- Canvas labels: do not show names on the canvas by default; names appear after tapping/selecting.
- Detail image style: use the sticker/cutout treatment here too, not just on the main canvas.
- Initial animal types: `cat`, `dog`, `axolotl`, plus easy entry of new custom types.
- Type input: picker plus free text for adding a new type.
- Favorites: not needed for the first version.
- Editing: easy enough for a child.
- Deleting: possible, but intentionally hard with at least two deliberate presses.
- Sleep log display: visual two-week calendar where each day shows a small pile of animals that slept in bed that night.
- Empty selection behavior: tapping empty canvas space deselects the current animal.
- Default detail pane: when no animal is selected, show a little friendly copy plus the shared two-week sleep calendar.
- Selected animal detail pane: show the animal details plus the same two-week calendar filtered to only that animal.
- Empty selected-animal calendar state: if the animal has not been slept with in the last two weeks, show a gentle note such as "You haven't snuggled this friend lately."
- Bedtime logging button copy: "Had a sleepover last night!".
- Canvas arrangement: initial positions should be random with a little overlap. Animals should be movable with touch drag, and their saved positions should persist across page refreshes.

## App Shape

The main experience should be a two-pane app:

- Left pane: a large playful canvas with overlapping stuffed animal images.
- Right pane: selected animal details, edit controls, and sleep logging.
- Add/upload control: always visible and finger-friendly.

On iPad landscape, keep the two panes visible. On smaller widths or portrait mode, use a canvas-first layout where the details pane can slide in or stack below the canvas.

## Main Screens And Flows

### Main Zoo Canvas

- Shows every stuffed animal as an image tile or cutout.
- Animals overlap like a pile of stickers.
- Tapping an animal selects it.
- Tapping empty canvas space deselects the current animal.
- Animals can be moved around with touch drag.
- Dragged positions should persist to disk so the pile stays arranged.
- New animals get a random initial position with just enough overlap to feel like a pile, without hiding too much of the image.
- Selected animal should be visually obvious with scale, outline, glow, or a temporary name label.
- Animals with transparent processed backgrounds should render above animals that still have full photo backgrounds. This keeps the nicest cutouts near the top of the pile while asynchronous processing is still catching up.
- The layout can be deterministic, based on each animal's saved position/order, so the zoo does not jump around on each reload.

### Detail Pane

When no animal is selected, the detail pane should show:

- A small amount of friendly orientation copy.
- The two-week shared sleep calendar.
- Each calendar day should show the pile of animals logged for that night.

When an animal is selected, the detail pane should show:

- Large image preview.
- Name.
- Type, such as cat, dog, bear, bunny, dinosaur, etc.
- Notes/description text field.
- A two-week sleep calendar filtered to this animal.
- A gentle empty state if the animal has not been slept with recently, such as "You haven't snuggled this friend lately."
- A large kid-friendly primary button for logging that this animal was a bedtime buddy last night: "Had a sleepover last night!".

The first version should optimize for the one behavior that matters: quickly recording the sleep event. It should always log yesterday's date. Do not add date picking unless a later real use case proves it is needed.

### Add Animal Flow

The iPad camera upload is the key technical flow. The UI should use a file input configured for images and camera capture, roughly:

```html
<input type="file" accept="image/*" capture="environment" />
```

The `capture` attribute is not universally supported, but MDN documents it for file inputs with `accept="image/*"` and values such as `environment` for the outward-facing camera. On mobile devices it generally opens a camera/file selection interface; on desktop it may fall back to a normal file picker.

Upload flow:

1. Tap add animal.
2. Choose/take a photo on the iPad.
3. Upload the image to the server.
4. Server stores the full original image in the Docker-backed data directory.
5. Server converts HEIC/HEIF to JPEG when needed.
6. Server creates a web-sized display image, with a target maximum dimension around 512px.
7. UI creates a draft animal entry with the display image attached.
8. Child/parent fills in name, type, and optional notes.
9. Save writes the JSON index.
10. Background removal runs asynchronously after the entry exists.

## Data Model

Use a single JSON file plus image files under `APP_DATA_DIR`.

Suggested disk layout:

```text
/app/data/stuffed-zoo/
  animals.json
  images/
    original/
      <animalId>.<ext>
    display/
      <animalId>.jpg
    processed/
      <animalId>.png
```

Suggested JSON shape:

```json
{
  "version": 1,
  "animals": [
    {
      "id": "animal_abc123",
      "name": "Sprinkles",
      "type": "cat",
      "notes": "Soft gray cat with a bow.",
      "image": {
        "originalPath": "images/original/animal_abc123.heic",
        "displayPath": "images/display/animal_abc123.jpg",
        "processedPath": "images/processed/animal_abc123.webp",
        "backgroundRemoved": true,
        "backgroundRemovalStatus": "completed"
      },
      "canvas": {
        "x": 24,
        "y": 18,
        "rotation": -4,
        "scale": 1,
        "zIndex": 3
      },
      "sleepLog": [
        {
          "date": "2026-06-29",
          "source": "bedtime-buddy-button"
        }
      ],
      "createdAt": "2026-06-30T12:00:00.000Z",
      "updatedAt": "2026-06-30T12:00:00.000Z"
    }
  ]
}
```

Use Zod schemas around the JSON boundary. The stored JSON should be parsed before use, and write operations should use atomic file replacement to avoid partial writes.

Sleep log uniqueness should be enforced by `animalId + date`. Multiple animals can be logged for the same night, but the same animal should not be logged twice for the same night.

## Storage And Docker

The existing Docker Compose setup already mounts `/app/data` as a named volume and sets `APP_DATA_DIR=/app/data`. This project should keep that pattern and store all animal JSON and uploaded images beneath `APP_DATA_DIR/stuffed-zoo`.

Local development can default to `app/data/stuffed-zoo`, matching the starter's file-backed scaffold convention.

Deployment target is Coolify. The implementation should use Docker/Compose-friendly services that Coolify can build and deploy from the repository. The likely production shape is:

- `app`: the SolidStart web app and JSON/image storage owner.
- `rembg`: a small dedicated Python service or image that exposes a local HTTP API for background removal.
- shared Docker volume mounted into `app` for `/app/data`; the `rembg` service can receive uploaded image bytes over HTTP and does not need direct volume access unless that proves simpler.

Keep the Compose configuration explicit enough that Coolify can discover and deploy both services.

## Background Removal

Background removal should use `rembg` first, running as a separate helper service in the same Docker Compose deployment. The site should still work well with original photos if processing fails or takes time.

Recommended first design:

- Save the original upload immediately.
- Create the animal entry even if processing is pending.
- Store processing status per animal: `not_configured`, `pending`, `completed`, `failed`.
- Prefer the processed transparent PNG/WebP when available.
- Fall back to the original image when processing is missing or failed.
- Run background removal asynchronously so upload and entry creation do not block on CPU-heavy segmentation.
- Have the app call the local `rembg` service over HTTP instead of embedding Python/model dependencies in the Node app container.

Possible options:

- `rembg`: first-choice provider. It is open-source, can run as a CLI, Python library, HTTP server, or Docker container, and avoids per-image API cost. The tradeoff is runtime size and CPU work, which should be acceptable for a small family photo set.
- remove.bg API: simple HTTP API, supports direct uploads and URL references, and currently advertises the first 50 API calls per month on the API docs page.
- Photoroom Remove Background API: currently advertises 10 free credits per month and says the Basic plan is $0.02 per API call.
- Clipdrop/Jasper Remove Background API: docs describe a multipart upload API and say logged-in users can claim 100 free development/debugging credits, but the page also says Clipdrop is now part of Jasper and to contact Jasper for more current models and credits.

For this prototype, the safest implementation is a provider interface with one concrete provider selected by environment variables:

```text
BACKGROUND_REMOVAL_PROVIDER=none | rembg | removebg | photoroom | clipdrop
BACKGROUND_REMOVAL_API_KEY=...
```

Default to `rembg` through the local helper service. Add a hosted API only if local processing is too slow, too heavy for deployment, or gives poor results on plush animals.

## Passcode

Use a single shared passcode configured through the environment. Default it to Violet's name in lowercase for local/prototype use:

```text
STUFFED_ZOO_PASSCODE=violet
```

This is not meant to be strong authentication. It is a simple gate so the app is not immediately open to anyone who can reach the URL. Avoid user accounts, password reset, email, and session management complexity unless the deployment context later demands it.

After the passcode is entered successfully, set a simple effectively permanent cookie so the iPad does not need the passcode again unless the cookie is cleared. This can be a lightweight signed or opaque cookie; it does not need full user/session infrastructure.

## Image Handling

The server should accept whatever image the iPad uploads, including HEIC/HEIF. Preserve the original upload so images can be reprocessed later.

Processing steps:

1. Save original upload under `images/original/`.
2. If the original is HEIC/HEIF, convert it to JPEG.
3. Generate a display JPEG around 512px on its longest side.
4. Queue asynchronous `rembg` processing against the display image or a suitable intermediate image.
5. Store the transparent output as WebP under `images/processed/`.
6. Render processed WebP when available, otherwise render the display JPEG.

The full-resolution original does not need to be used in the normal UI.

## Touch And iPad Design

The site should be designed primarily for finger input:

- Large touch targets, at least 44px.
- Big add and sleep-log buttons.
- Avoid hover-only interactions.
- Avoid dense tables and tiny controls.
- Use immediate visual feedback after taps.
- Support touch dragging for arranging animals on the canvas.
- Keep text fields large enough for iPad typing.
- Keep the primary flow usable in Safari on iPad.

The visual direction should be playful: sticker-like animals, soft shadows, bright accents, and a colorful pile-of-animals feel. It should not feel like an enterprise dashboard.

## Suggested Implementation Phases

### Phase 1: Intent, Data, And Shell

- Create this intent document.
- Remove or hide starter SaaS surfaces that are not needed for the toy app.
- Define animal Zod schemas and disk storage helpers.
- Confirm Docker volume path and local data path.
- Add simple passcode configuration with `STUFFED_ZOO_PASSCODE=violet` as the prototype default.
- Add cookie-based passcode persistence.
- Adjust Docker Compose plan for Coolify deployment with an `app` service and a separate `rembg` service.

### Phase 2: Upload And Inventory

- Add server route/action for image upload.
- Store original images on disk.
- Convert HEIC/HEIF uploads to JPEG.
- Generate 512px display images.
- Create, update, and read `animals.json`.
- Build add/edit flow for name, type, and notes.
- Support a type picker with easy custom type entry.
- Validate iPad camera capture manually.

### Phase 3: Main Zoo UI

- Build the two-pane layout.
- Render overlapping sticker-like animal images on the canvas.
- Keep unprocessed full-background photos lower in the visual pile.
- Select animals with touch.
- Deselect animals by tapping empty canvas space.
- Support touch dragging and persist animal positions.
- Show selected detail pane.
- Save and load basic canvas positions.

### Phase 4: Sleep Logging

- Add a kid-friendly bedtime logging button, "Had a sleepover last night!", that records yesterday's date.
- Store sleep log dates per animal.
- Prevent duplicate entries for the same animal and date.
- Allow multiple different animals on the same date.
- Show a visual two-week shared calendar when no animal is selected.
- Show a visual two-week per-animal calendar when an animal is selected.
- Show a gentle "not slept with recently" note when the selected animal has no entries in the last two weeks.

### Phase 5: Background Removal

- Add optional processing status to uploads.
- Implement asynchronous `rembg` processing first through the separate helper service.
- Store processed transparent image separately from original.
- Add fallback UI when processing fails.

### Phase 6: Polish And Deployment

- Make the UI feel playful and stable on iPad.
- Confirm responsive behavior in landscape and portrait.
- Verify Docker deployment persists images and JSON across restarts.
- Add a short README section for backup/restore of `/app/data/stuffed-zoo`.
- Make delete available but hard to trigger accidentally, with at least two deliberate presses.

## Obvious Things To Watch

- iPad Safari upload behavior needs real-device testing early.
- Image files from iPads can be large; the server should resize or compress originals for web display.
- HEIC support should be assumed. Convert HEIC/HEIF to JPEG server-side.
- Disk writes need basic locking or atomic writes so two quick edits do not corrupt JSON.
- Backups matter because the whole app state is in a Docker volume.
- Deletion needs friction so animals are not removed accidentally.
- The shared passcode is only a lightweight gate, not security suitable for a public app.
- Background removal quality on plush toys may vary because fuzzy edges and low contrast can confuse segmentation.
- Coolify deployment should be tested with both the app and `rembg` service before assuming the helper service can be reached by service name.

## References

- MDN `capture` attribute: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture
- rembg: https://github.com/danielgatis/rembg
- remove.bg API: https://www.remove.bg/api
- Photoroom Remove Background API: https://www.photoroom.com/api/remove-background
- Clipdrop Remove Background API: https://clipdrop.co/apis/docs/remove-background

## Remaining Questions

None for the initial implementation plan.
