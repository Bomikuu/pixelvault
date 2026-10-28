"""Decode untrusted raster uploads into bounded, metadata-free JPEG bytes."""

import io
import warnings

from config.errors import DomainError
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_PHOTO_BYTES = 3 * 1024 * 1024


def sanitized_photo(upload):
    if upload is None or not hasattr(upload, "read"):
        raise DomainError("INVALID_PHOTO", "Choose a JPEG, PNG or WebP profile photo.")
    if upload.size > MAX_PHOTO_BYTES:
        raise DomainError("INVALID_PHOTO", "Profile photos must be at most 3 MiB.")
    raw = upload.read(MAX_PHOTO_BYTES + 1)
    if not raw or len(raw) > MAX_PHOTO_BYTES:
        raise DomainError("INVALID_PHOTO", "Profile photos must be at most 3 MiB.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw), formats=("JPEG", "PNG", "WEBP")) as source:
                width, height = source.size
                if (
                    min(width, height) < 128
                    or max(width, height) > 4096
                    or width * height > 12_000_000
                ):
                    raise DomainError(
                        "INVALID_PHOTO",
                        "Use a photo at least 128 × 128 pixels, no more than 4096 pixels per side and 12 million pixels in total.",
                    )
                if getattr(source, "n_frames", 1) != 1 or getattr(source, "is_animated", False):
                    raise DomainError("INVALID_PHOTO", "Animated profile photos are not supported.")
                source.load()
                oriented = ImageOps.exif_transpose(source)
                oriented.thumbnail((768, 768), Image.Resampling.LANCZOS)
                rgba = oriented.convert("RGBA")
                clean = Image.new("RGB", rgba.size, "white")
                clean.paste(rgba, mask=rgba.getchannel("A"))
                destination = io.BytesIO()
                clean.save(destination, format="JPEG", quality=88, optimize=True)
                return destination.getvalue()
    except DomainError:
        raise
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        SyntaxError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ):
        raise DomainError(
            "INVALID_PHOTO",
            "This image cannot be safely read. Choose a nonanimated JPEG, PNG or WebP photo.",
        ) from None
