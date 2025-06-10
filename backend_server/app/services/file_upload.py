import os
import aiofiles
from fastapi import UploadFile, HTTPException
from app.core.config import settings
from PIL import Image
import uuid
from typing import List
import magic

ALLOWED_IMAGE_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp'
}

async def save_upload_file(upload_file: UploadFile, folder: str = "uploads") -> str:
    try:
        # Create directory if it doesn't exist
        upload_dir = os.path.join(settings.UPLOAD_DIR, folder)
        os.makedirs(upload_dir, exist_ok=True)

        # Read file content
        content = await upload_file.read()
        
        # Check file type
        file_type = magic.from_buffer(content, mime=True)
        if file_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_type} not allowed. Allowed types: {', '.join(ALLOWED_IMAGE_TYPES.keys())}"
            )

        # Generate unique filename
        file_extension = ALLOWED_IMAGE_TYPES[file_type]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(upload_dir, unique_filename)

        # Save file
        async with aiofiles.open(file_path, 'wb') as out_file:
            await out_file.write(content)

        # Process image if it's an image file
        if file_type.startswith('image/'):
            await process_image(file_path)

        return os.path.join(folder, unique_filename)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def process_image(file_path: str) -> None:
    """Process uploaded image: resize, optimize, etc."""
    try:
        with Image.open(file_path) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')

            # Resize if too large
            max_size = (1920, 1080)
            if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                img.thumbnail(max_size, Image.Resampling.LANCZOS)

            # Save optimized image
            img.save(file_path, 'JPEG', quality=85, optimize=True)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

async def delete_file(file_path: str) -> None:
    """Delete a file from the uploads directory."""
    try:
        full_path = os.path.join(settings.UPLOAD_DIR, file_path)
        if os.path.exists(full_path):
            os.remove(full_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")

async def save_multiple_files(files: List[UploadFile], folder: str = "uploads") -> List[str]:
    """Save multiple files and return their paths."""
    saved_paths = []
    for file in files:
        path = await save_upload_file(file, folder)
        saved_paths.append(path)
    return saved_paths 