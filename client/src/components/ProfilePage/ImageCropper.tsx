import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropperProps {
  imageUrl: string;
  onSubmit: (croppedFile: File) => void;
  onCancel: () => void;
  isUploading: boolean;
}

export const ImageCropper = ({ imageUrl, onSubmit, onCancel, isUploading }: ImageCropperProps) => {
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState<string>('');
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(1);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Update preview whenever crop area changes
  const updatePreview = useCallback(() => {
    const previewCanvas = previewCanvasRef.current;
    const image = imageRef.current;
    
    if (!previewCanvas || !image) return;
    
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    // Set preview canvas size
    const previewSize = Math.min(200, cropArea.width * 0.6);
    const previewHeight = previewSize / imageAspectRatio;
    
    previewCanvas.width = previewSize;
    previewCanvas.height = previewHeight;

    // Calculate scale factors
    const scaleX = image.naturalWidth / image.offsetWidth;
    const scaleY = image.naturalHeight / image.offsetHeight;

    // Draw the cropped portion
    ctx.drawImage(
      image,
      cropArea.x * scaleX,
      cropArea.y * scaleY,
      cropArea.width * scaleX,
      cropArea.height * scaleY,
      0,
      0,
      previewSize,
      previewHeight
    );
  }, [cropArea, imageAspectRatio]);

  // Update preview when crop area changes
  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      const { offsetWidth, offsetHeight, naturalWidth, naturalHeight } = imageRef.current;
      
      // Calculate the original aspect ratio from the actual image
      const aspectRatio = naturalWidth / naturalHeight;
      setImageAspectRatio(aspectRatio);
      
      // Create crop box that maintains the original aspect ratio, scaled by 0.8
      let cropWidth, cropHeight;
      
      if (aspectRatio > 1) {
        // Landscape: width is larger than height
        cropWidth = offsetWidth * 0.8;
        cropHeight = cropWidth / aspectRatio;
      } else {
        // Portrait or square: height is larger than or equal to width
        cropHeight = offsetHeight * 0.8;
        cropWidth = cropHeight * aspectRatio;
      }
      
      // Center the crop area
      setCropArea({
        x: (offsetWidth - cropWidth) / 2,
        y: (offsetHeight - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight
      });
    }
  }, []);

  // Update preview when image loads
  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      updatePreview();
    }
  }, [updatePreview]);

  const createCroppedImage = useCallback((): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      const image = imageRef.current;
      
      if (!canvas || !image) {
        reject(new Error('Canvas or image not available'));
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Calculate scale factors from display to natural image size
      const scaleX = image.naturalWidth / image.offsetWidth;
      const scaleY = image.naturalHeight / image.offsetHeight;

      // Calculate the actual crop area in the original image coordinates
      const actualCropX = cropArea.x * scaleX;
      const actualCropY = cropArea.y * scaleY;
      const actualCropWidth = cropArea.width * scaleX;
      const actualCropHeight = cropArea.height * scaleY;

      // Maintain the original aspect ratio of the crop area
      // Don't force it to be square - keep the natural proportions
      canvas.width = actualCropWidth;
      canvas.height = actualCropHeight;

      // Enable high-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw the cropped area at its natural size - NO SCALING/DISTORTION
      ctx.drawImage(
        image,
        actualCropX,      // Source X in original image
        actualCropY,      // Source Y in original image  
        actualCropWidth,  // Source width in original image
        actualCropHeight, // Source height in original image
        0,                // Destination X (start of canvas)
        0,                // Destination Y (start of canvas)
        actualCropWidth,  // Destination width (same as source - no distortion)
        actualCropHeight  // Destination height (same as source - no distortion)
      );

      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], 'profile-image.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(croppedFile);
        } else {
          reject(new Error('Failed to create cropped image'));
        }
      }, 'image/jpeg', 0.95); // High quality JPEG
    });
  }, [cropArea]);

  const handleMouseDown = useCallback((e: React.MouseEvent, handle?: string) => {
    if (!imageRef.current) return;

    e.preventDefault();
    const rect = imageRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    if (handle) {
      setIsResizing(true);
      setResizeHandle(handle);
      setDragStart({ x: startX, y: startY });
    } else {
      const isInside = startX >= cropArea.x && startX <= cropArea.x + cropArea.width &&
                      startY >= cropArea.y && startY <= cropArea.y + cropArea.height;
      
      if (isInside) {
        setIsDragging(true);
        setDragStart({ x: startX - cropArea.x, y: startY - cropArea.y });
      } else {
        // When creating a new crop area, start with maintaining aspect ratio
        setCropArea({ x: startX, y: startY, width: 0, height: 0 });
        setIsResizing(true);
        setResizeHandle('se');
        setDragStart({ x: startX, y: startY });
      }
    }
  }, [cropArea]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!imageRef.current || (!isDragging && !isResizing)) return;

    const rect = imageRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    const maxX = imageRef.current.offsetWidth;
    const maxY = imageRef.current.offsetHeight;

    if (isDragging) {
      const newX = Math.max(0, Math.min(currentX - dragStart.x, maxX - cropArea.width));
      const newY = Math.max(0, Math.min(currentY - dragStart.y, maxY - cropArea.height));
      setCropArea(prev => ({ ...prev, x: newX, y: newY }));
    }

    if (isResizing) {
      let newWidth, newHeight, newX = cropArea.x, newY = cropArea.y;

      // Calculate new dimensions while maintaining aspect ratio
      switch (resizeHandle) {
        case 'nw':
          newWidth = Math.max(50, cropArea.x + cropArea.width - currentX);
          newHeight = newWidth / imageAspectRatio; // Maintain aspect ratio
          newX = Math.max(0, currentX);
          newY = Math.max(0, cropArea.y + cropArea.height - newHeight);
          break;
        case 'ne':
          newWidth = Math.max(50, currentX - cropArea.x);
          newHeight = newWidth / imageAspectRatio; // Maintain aspect ratio
          newY = Math.max(0, cropArea.y + cropArea.height - newHeight);
          break;
        case 'sw':
          newWidth = Math.max(50, cropArea.x + cropArea.width - currentX);
          newHeight = newWidth / imageAspectRatio; // Maintain aspect ratio
          newX = Math.max(0, currentX);
          break;
        case 'se':
        default:
          newWidth = Math.max(50, currentX - cropArea.x);
          newHeight = newWidth / imageAspectRatio; // Maintain aspect ratio
          break;
      }

      // Ensure crop area stays within image bounds
      newWidth = Math.min(newWidth, maxX - newX);
      newHeight = Math.min(newHeight, maxY - newY);
      
      // Adjust width if height is constrained by bounds
      if (newHeight !== newWidth / imageAspectRatio) {
        newWidth = newHeight * imageAspectRatio;
      }

      // Final boundary check
      if (newX + newWidth > maxX) {
        newWidth = maxX - newX;
        newHeight = newWidth / imageAspectRatio;
      }
      if (newY + newHeight > maxY) {
        newHeight = maxY - newY;
        newWidth = newHeight * imageAspectRatio;
      }

      setCropArea({ x: newX, y: newY, width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, dragStart, cropArea, resizeHandle, imageAspectRatio]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle('');
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleSubmit = async () => {
    try {
      const croppedFile = await createCroppedImage();
      onSubmit(croppedFile);
    } catch (error) {
      console.error('Crop error:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main crop area */}
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: '500px' }}>
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Crop preview"
          className="w-full h-full object-contain select-none"
          draggable={false}
          onLoad={handleImageLoad}
        />
        
        {/* Overlay */}
        <div className="absolute inset-0" onMouseDown={(e) => handleMouseDown(e)}>
          {/* Dark overlay with crop hole */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-60"
            style={{
              clipPath: imageRef.current ? 
                `polygon(0% 0%, 0% 100%, ${(cropArea.x / imageRef.current.offsetWidth) * 100}% 100%, ${(cropArea.x / imageRef.current.offsetWidth) * 100}% ${(cropArea.y / imageRef.current.offsetHeight) * 100}%, ${((cropArea.x + cropArea.width) / imageRef.current.offsetWidth) * 100}% ${(cropArea.y / imageRef.current.offsetHeight) * 100}%, ${((cropArea.x + cropArea.width) / imageRef.current.offsetWidth) * 100}% ${((cropArea.y + cropArea.height) / imageRef.current.offsetHeight) * 100}%, ${(cropArea.x / imageRef.current.offsetWidth) * 100}% ${((cropArea.y + cropArea.height) / imageRef.current.offsetHeight) * 100}%, ${(cropArea.x / imageRef.current.offsetWidth) * 100}% 100%, 100% 100%, 100% 0%)` 
                : 'none'
            }}
          />
          
          {/* Crop selection - Now maintains aspect ratio */}
          <div
            className="absolute border-2 border-white shadow-lg"
            style={{
              left: cropArea.x,
              top: cropArea.y,
              width: cropArea.width,
              height: cropArea.height,
              cursor: 'move'
            }}
          >
            {/* Resize handles */}
            {['nw', 'ne', 'sw', 'se'].map(handle => (
              <div
                key={handle}
                className={`absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-${handle}-resize hover:bg-blue-100`}
                style={{
                  [handle.includes('n') ? 'top' : 'bottom']: -8,
                  [handle.includes('w') ? 'left' : 'right']: -8,
                }}
                onMouseDown={(e) => handleMouseDown(e, handle)}
              />
            ))}
            
            {/* Move indicator */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-2 border-white rounded-full bg-white bg-opacity-20 flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full opacity-80"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isUploading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isUploading} className="bg-rose-600 hover:bg-rose-700">
          {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</> : 'Submit'}
        </Button>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <canvas ref={previewCanvasRef} style={{ display: 'none' }} />
    </div>
  );
};