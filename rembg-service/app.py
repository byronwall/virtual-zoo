from io import BytesIO

from fastapi import FastAPI, HTTPException, Response, UploadFile
from PIL import Image, ImageOps
from pillow_heif import register_heif_opener
from rembg import remove

register_heif_opener()

app = FastAPI(title="Stuffed Zoo Background Helper")


@app.get("/health")
def health() -> dict[str, str]:
    return {"ok": "true"}


@app.post("/prepare")
async def prepare(file: UploadFile) -> Response:
    content = await file.read()
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


@app.post("/remove-background")
async def remove_background(file: UploadFile) -> Response:
    content = await file.read()
    try:
        return Response(remove(content), media_type="image/png")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not remove background: {exc}") from exc
