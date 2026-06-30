from io import BytesIO
import logging
import platform
from importlib import metadata

from fastapi import FastAPI, HTTPException, Response, UploadFile
from PIL import Image, ImageOps
from pillow_heif import register_heif_opener

register_heif_opener()
logger = logging.getLogger("stuffed_zoo.rembg_service")

app = FastAPI(title="Stuffed Zoo Background Helper")
rembg_remove = None
rembg_import_error = None


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
        if image.mode not in ("RGB", "L"):
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
        remove = get_rembg_remove()
        return Response(remove(content), media_type="image/png")
    except Exception as exc:
        logger.exception(
            "background removal failed",
            extra={"upload_filename": file.filename, "upload_bytes": len(content)},
        )
        raise HTTPException(status_code=422, detail=f"Could not remove background: {exc}") from exc
