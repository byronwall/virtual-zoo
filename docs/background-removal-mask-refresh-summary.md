# Background Removal Mask Refresh Summary

## 1) Scope and Context

- Request: make the `grow50 feather2` background-removal probe the production option and ensure production regenerates already-processed images.
- Area changed: the `rembg-service` background-removal endpoint and the stuffed-zoo app's background-removal recovery/version tracking.
- Constraints: existing uploads are file-backed under `APP_DATA_DIR`; processed WebP cutouts are generated asynchronously by the Python helper service; completed images previously had no algorithm version marker, so the app could not distinguish old cutouts from current cutouts.

## 2) Major Changes Delivered

- `rembg-service/app.py`
  - Replaced direct `rembg.remove(..., alpha_matting=True)` output with a mask pipeline:
    - request `only_mask=True`
    - threshold mask at `1`
    - grow by `50px`
    - shrink by `26px`
    - feather by `2px`
    - apply the resulting alpha mask to the source image
  - Uses OpenCV morphology for mask grow/shrink so large-kernel operations remain practical on full-resolution uploads.
  - Keeps PNG output compression moderate with `compress_level=4` instead of expensive optimize compression.
- `rembg-service/requirements.txt`
  - Added explicit `opencv-python-headless==4.11.0.86` because production service code now imports `cv2` directly.
- `app/src/lib/stuffed-zoo/schema.ts`
  - Added optional `image.backgroundRemovalVersion`.
- `app/src/lib/stuffed-zoo/store.ts`
  - Background-removal retry candidates now include completed images whose `backgroundRemovalVersion` differs from the current algorithm version.
  - Completion now records the algorithm version.
- `app/src/lib/stuffed-zoo/image-processing.ts`
  - Added current version string `rembg-u2net-mask-threshold1-grow50-shrink26-feather2`.
  - Recovery logs stale completed images and requeues them, causing production to overwrite old processed cutouts after deployment and the next zoo data load.

Intentionally unchanged: upload/display/thumbnail storage paths and the public image URL format remain the same.

## 3) Design Decisions and Tradeoffs

- Decision: use mask post-processing rather than more alpha-matting threshold tuning.
  - Alternatives considered: broader rembg alpha-matting threshold sweeps, model preprocessing, color/texture rescue.
  - Why chosen: calibration showed rembg's low-confidence mask already sees the missing right appendage, while alpha-matting settings produced little variety.
  - Tradeoff: global grow/shrink can add a slight halo, but it keeps more plush detail and avoids hand-coded per-image regions.
- Decision: version processed images in store metadata instead of deleting files manually.
  - Alternatives considered: ad-hoc production cleanup or one-off script.
  - Why chosen: the app can self-heal after deployment and future algorithm changes can bump the version string.
  - Tradeoff: regeneration starts when `ensureBackgroundRemovalRecoveryStarted()` runs, currently via the authenticated animals API path.

## 4) Problems Encountered and Resolutions

- Symptom: early alpha-matting sweeps looked almost identical.
  - Root cause: the base rembg segmentation mask dominated the result.
  - Resolution: generated stress and ROI repair sheets using mask thresholding, grow/shrink, feathering, and color rescue.
- Symptom: direct preview of the PNG looked like it still contained the full carpet.
  - Root cause: the image viewer displayed original RGB under transparent pixels; alpha coverage was correct.
  - Resolution: verified the output composited over a checkerboard.
- Symptom: Pillow large-kernel morphology was slow during probing.
  - Root cause: full-resolution rank filters with large kernels are expensive.
  - Resolution: production implementation uses OpenCV morphology.

## 5) Verification and Validation

- Passed: `pnpm -C app type-check`.
- Passed: `pnpm -C app lint`.
  - Existing warning remains: `app/src/components/stuffed-zoo/ZooApp.tsx` exceeds the max-lines guardrail.
- Passed: `tmp/background-removal-calibration/.venv/bin/python -m py_compile rembg-service/app.py`.
- Passed: local sample call to `remove_background_bytes(...)` against the downloaded bear image; wrote `tmp/background-removal-calibration/production-option-preview.png`.
- Manual check: composited the preview on a checkerboard and confirmed the right appendage is preserved and connected.

Not run: Docker image build. The change adds one explicit Python dependency, so deployment should rebuild the `rembg` service image.

## 6) Process Improvements

- Keep future segmentation tuning scripts capable of producing checkerboard previews, not only raw PNGs, because raw viewers may show hidden RGB under transparent pixels.
- Prefer OpenCV morphology for full-resolution mask experiments when kernel sizes exceed small edge cleanup values.
- Keep calibration outputs under `tmp/background-removal-calibration/` so visual probes remain reproducible without polluting source files.

## 7) Agent/Skill Improvements

- Proposed AGENTS addition: when changing background-removal algorithms, bump a persisted algorithm version and verify stale completed images are requeued.
  - Benefit: prevents production from serving old processed files after algorithm changes.
- Proposed skill/checklist addition: segmentation work should include at least one checkerboard-composited preview and alpha coverage stats.
  - Benefit: avoids misreading transparent PNGs in viewers that display hidden RGB.

## 8) Follow-ups and Open Risks

- Deployment must rebuild both app and rembg service containers so the version marker and Python mask pipeline ship together.
- Existing processed images regenerate after the authenticated animals endpoint triggers recovery; if no one opens the zoo after deploy, regeneration will not start.
- The new global grow/shrink/feather setting may add a mild halo on images where the background is close to the plush. This is the accepted tradeoff for preserving more of the stuffed animal.
