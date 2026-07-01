from io import BytesIO
import logging
import platform
from importlib import metadata

from fastapi import FastAPI, HTTPException, Response, UploadFile
import cv2
import numpy as np
from PIL import Image, ImageOps
from pillow_heif import register_heif_opener

register_heif_opener()
logger = logging.getLogger("stuffed_zoo.rembg_service")

app = FastAPI(title="Stuffed Zoo Background Helper")
rembg_remove = None
rembg_import_error = None

REMBG_OPTIONS = {
    "alpha_matting": False,
    "only_mask": True,
}

MASK_THRESHOLD = 1
MASK_GROW_PIXELS = 50
MASK_SHRINK_PIXELS = 26
MASK_FEATHER_PIXELS = 2.0
FRAME_ALPHA_THRESHOLD = 8
FRAME_FILL_RATIO = 0.86


def package_version(package: str) -> str:
    try:
        return metadata.version(package)
    except metadata.PackageNotFoundError:
        return "not-installed"


def dependency_versions() -> dict[str, str]:
    return {
        "python": platform.python_version(),
        "numpy": package_version("numpy"),
        "numba": package_version("numba"),
        "llvmlite": package_version("llvmlite"),
        "onnxruntime": package_version("onnxruntime"),
        "pillow": package_version("pillow"),
        "pillow-heif": package_version("pillow-heif"),
        "opencv-python-headless": package_version("opencv-python-headless"),
        "pymatting": package_version("pymatting"),
        "rembg": package_version("rembg"),
    }


def get_rembg_remove():
    global rembg_import_error, rembg_remove
    if rembg_remove is not None:
        return rembg_remove
    try:
        from rembg import remove

        rembg_remove = remove
        rembg_import_error = None
        logger.info("rembg import succeeded", extra={"dependencies": dependency_versions()})
        return rembg_remove
    except Exception as exc:
        rembg_import_error = repr(exc)
        logger.exception("rembg import failed", extra={"dependencies": dependency_versions()})
        raise RuntimeError(f"rembg import failed: {exc}") from exc


def postprocess_plush_mask(mask: Image.Image) -> Image.Image:
    mask_array = np.array(mask.convert("L"))
    mask_array = np.where(mask_array >= MASK_THRESHOLD, 255, 0).astype(np.uint8)
    grow_kernel = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE,
        (MASK_GROW_PIXELS * 2 + 1, MASK_GROW_PIXELS * 2 + 1),
    )
    shrink_kernel = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE,
        (MASK_SHRINK_PIXELS * 2 + 1, MASK_SHRINK_PIXELS * 2 + 1),
    )
    mask_array = cv2.dilate(mask_array, grow_kernel)
    mask_array = cv2.erode(mask_array, shrink_kernel)
    mask_array = cv2.GaussianBlur(mask_array, (0, 0), MASK_FEATHER_PIXELS)
    return Image.fromarray(mask_array, "L")


def frame_cutout(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    alpha = image.getchannel("A")
    alpha_array = np.array(alpha)
    bbox_mask = Image.fromarray(
        np.where(alpha_array >= FRAME_ALPHA_THRESHOLD, 255, 0).astype(np.uint8),
        "L",
    )
    bbox = bbox_mask.getbbox()
    if bbox is None:
        return image

    cropped = image.crop(bbox)
    crop_width, crop_height = cropped.size
    frame_size = max(image.size)
    if crop_width <= 0 or crop_height <= 0 or frame_size <= 0:
        return image

    target_size = max(1, round(frame_size * FRAME_FILL_RATIO))
    scale = min(target_size / crop_width, target_size / crop_height)
    scaled_size = (
        max(1, round(crop_width * scale)),
        max(1, round(crop_height * scale)),
    )
    framed = Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0))
    resized = cropped.resize(scaled_size, Image.Resampling.LANCZOS)
    offset = (
        (frame_size - scaled_size[0]) // 2,
        (frame_size - scaled_size[1]) // 2,
    )
    framed.alpha_composite(resized, dest=offset)
    return framed


def remove_background_bytes(content: bytes) -> bytes:
    source = Image.open(BytesIO(content))
    source = ImageOps.exif_transpose(source).convert("RGBA")
    remove = get_rembg_remove()
    mask_bytes = remove(content, **REMBG_OPTIONS)
    mask = Image.open(BytesIO(mask_bytes)).convert("L")
    if mask.size != source.size:
        mask = mask.resize(source.size, Image.Resampling.LANCZOS)
    source.putalpha(postprocess_plush_mask(mask))
    source = frame_cutout(source)
    output = BytesIO()
    source.save(output, format="PNG", compress_level=4)
    return output.getvalue()


@app.on_event("startup")
def log_startup_diagnostics() -> None:
    logger.info("rembg service starting", extra={"dependencies": dependency_versions()})


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "ok": True,
        "rembgReady": rembg_remove is not None and rembg_import_error is None,
        "rembgImportError": rembg_import_error,
    }


@app.get("/diagnostics")
def diagnostics() -> dict[str, object]:
    ready = False
    import_error = rembg_import_error
    try:
        get_rembg_remove()
        ready = True
    except RuntimeError as exc:
        import_error = str(exc)
    return {
        "ok": ready,
        "dependencies": dependency_versions(),
        "rembgImportError": import_error,
    }


@app.post("/prepare")
async def prepare(file: UploadFile) -> Response:
    content = await file.read()
    logger.info(
        "prepare image requested",
        extra={"upload_filename": file.filename, "upload_bytes": len(content)},
    )
    try:
        image = Image.open(BytesIO(content))
        image = ImageOps.exif_transpose(image)
        image.thumbnail((512, 512), Image.Resampling.LANCZOS)
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
        output = BytesIO()
        image.save(output, format="JPEG", quality=86, optimize=True)
        return Response(output.getvalue(), media_type="image/jpeg")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not prepare image: {exc}") from exc


@app.post("/thumbnail")
async def thumbnail(file: UploadFile) -> Response:
    content = await file.read()
    logger.info(
        "thumbnail image requested",
        extra={"upload_filename": file.filename, "upload_bytes": len(content)},
    )
    try:
        image = Image.open(BytesIO(content))
        image = ImageOps.exif_transpose(image)
        image.thumbnail((192, 192), Image.Resampling.LANCZOS)
        if image.mode in ("RGBA", "LA"):
            image = image.convert("RGBA")
        elif image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
        output = BytesIO()
        image.save(output, format="WEBP", quality=58, method=6)
        return Response(output.getvalue(), media_type="image/webp")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not thumbnail image: {exc}") from exc


@app.post("/remove-background")
async def remove_background(file: UploadFile) -> Response:
    content = await file.read()
    logger.info(
        "background removal requested",
        extra={"upload_filename": file.filename, "upload_bytes": len(content)},
    )
    try:
        return Response(remove_background_bytes(content), media_type="image/png")
    except Exception as exc:
        logger.exception(
            "background removal failed",
            extra={"upload_filename": file.filename, "upload_bytes": len(content)},
        )
        raise HTTPException(status_code=422, detail=f"Could not remove background: {exc}") from exc
